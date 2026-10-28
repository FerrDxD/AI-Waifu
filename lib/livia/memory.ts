/**
 * Sistem memori berlapis (M3).
 *
 * Prinsipnya: memori bukan satu blob teks yang ditempel ke prompt, melainkan
 * kumpulan fakta bertipe yang:
 *   1. ditulis terstruktur oleh model (M3.2),
 *   2. di-dedupe supaya fakta yang sama tidak menumpuk,
 *   3. di-ranking saat dibaca — relevansi + kebaruan + decay (M3.3),
 *   4. dipadatkan berkala menjadi "diary" (M3.4),
 *   5. bisa dilihat & dihapus user (M3.5).
 *
 * Pembagian lapisan:
 *   - Fungsi MURNI di bagian atas (tanpa DB/SDK) — dipakai test cepat.
 *   - Fungsi DB di bagian bawah. Semua jalur yang menyentuh chat DIBUNGKUS
 *     try/catch: memori adalah peningkatan kualitas, bukan alasan chat gagal.
 *
 * Catatan soal embeddings: ranking di sini memakai lexical overlap, bukan
 * vektor. Itu keputusan sadar — pgvector menambah kerumitan migrasi Neon dan
 * belum dibutuhkan untuk 5–8 fakta teratas. Embeddings dicatat sebagai utang
 * teknis, bukan dilupakan.
 */
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { memoryItems, userProfiles } from '@/lib/db/schema';
import { getProvider } from '@/lib/ai';
import {
  cleanMemoryContent,
  memoryDigestResponseSchema,
  memoryDigestValidator,
  type ExtractedMemory,
  type ExtractedMemoryType,
} from '@/lib/ai/schemas';
import { recordProviderUsage } from '@/lib/ai/usage';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Tipe & konstanta
// ---------------------------------------------------------------------------

export const MEMORY_TYPES = ['core', 'episodic', 'semantic', 'diary'] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

const MEMORY_TYPE_SET: ReadonlySet<string> = new Set(MEMORY_TYPES);

/** Satu baris memori seperti yang dipakai fungsi ranking. */
export interface StoredMemory {
  id: string;
  type: string;
  content: string;
  confidence: number;
  decayScore: number;
  createdAt: Date | string | null;
  lastRecalledAt: Date | string | null;
}

/** Memori yang siap ditampilkan ke UI (decay dihitung ulang). */
export interface MemoryView {
  id: string;
  type: string;
  content: string;
  confidence: number;
  decayScore: number;
  createdAt: string | null;
  lastRecalledAt: string | null;
}

/** Jumlah memori yang masuk konteks satu turn. */
export const RETRIEVAL_TOP_K = 6;
export const RETRIEVAL_MAX_K = 8;

/** Skor minimum agar memori dianggap relevan (core selalu lolos). */
export const MIN_RETRIEVAL_SCORE = 0.25;

/** Pemicu konsolidasi: total item > 30 dan minimal 6 kandidat. */
export const CONSOLIDATION_TRIGGER_ITEMS = 30;
export const CONSOLIDATION_MIN_SOURCES = 6;
export const CONSOLIDATION_MAX_SOURCES = 12;
export const CONSOLIDATION_DECAY_CEILING = 50;

/** Batas item yang dibaca untuk ranking. Cukup untuk satu user aktif. */
const RETRIEVAL_SCAN_LIMIT = 300;

/** Batas baris yang dibaca saat mengecek duplikat. */
const DEDUPE_SCAN_LIMIT = 500;

/**
 * Setengah-umur decay per tipe (hari). `null` = tidak meluruh.
 * Angka ini sengaja konservatif: identitas inti tidak boleh hilang, sedangkan
 * kejadian kecil memang layak memudar.
 */
const HALF_LIFE_DAYS: Record<MemoryType, number | null> = {
  core: null,
  diary: 180,
  semantic: 60,
  episodic: 14,
};

/** Setengah-umur untuk komponen "kebaruan" pada ranking. */
const RECENCY_HALF_LIFE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

const MEMORY_STOPWORDS = new Set([
  'yang', 'dan', 'atau', 'adalah', 'kamu', 'aku', 'livia', 'sudah', 'belum',
  'akan', 'tapi', 'dari', 'dengan', 'karena', 'bisa', 'harus', 'kalau',
  'tidak', 'nggak', 'ngga', 'haha', 'banget', 'masih', 'lebih', 'sangat',
  'terus', 'saya', 'kita', 'mereka', 'halo', 'hai', 'oke', 'apa', 'itu',
  'ini', 'aja', 'saja', 'juga', 'untuk', 'pada', 'dalam', 'ke', 'di',
  'the', 'and', 'you', 'your', 'what', 'when', 'with', 'that', 'this',
  'just', 'really', 'about', 'there', 'their', 'would', 'could', 'should',
  'have', 'from', 'they', 'them',
]);

// ---------------------------------------------------------------------------
// Fungsi murni
// ---------------------------------------------------------------------------

export function normalizeMemoryType(value: unknown): MemoryType {
  return typeof value === 'string' && MEMORY_TYPE_SET.has(value)
    ? (value as MemoryType)
    : 'semantic';
}

/** Pecah teks menjadi kata bermakna (huruf kecil, >= 4 huruf, tanpa stopword). */
export function memoryTokens(text: string): string[] {
  return (text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !MEMORY_STOPWORDS.has(token));
}

/**
 * Kemiripan dua fakta (0–1) memakai Jaccard atas kata bermakna.
 *
 * Jaccard dipilih karena simetris dan tidak menghukum fakta panjang: dua
 * kalimat yang isinya sama tetapi salah satunya menambah keterangan tetap
 * dianggap mirip.
 */
export function memorySimilarity(a: string, b: string): number {
  const left = new Set(memoryTokens(a));
  const right = new Set(memoryTokens(b));
  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

/** Duplikat = teks sama setelah normalisasi, ATAU mirip di atas ambang. */
export function isDuplicateMemory(a: string, b: string, threshold = 0.7): boolean {
  const left = cleanMemoryContent(a).toLowerCase();
  const right = cleanMemoryContent(b).toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  return memorySimilarity(left, right) >= threshold;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * Skor decay 0–100 untuk umur tertentu.
 * Rumus peluruhan eksponensial: 100 * 0.5^(umur / setengah-umur).
 */
export function decayScoreFor(type: string, ageDays: number): number {
  const halfLife = HALF_LIFE_DAYS[normalizeMemoryType(type)];
  if (halfLife === null) return 100;
  if (!Number.isFinite(ageDays) || ageDays <= 0) return 100;
  const score = 100 * Math.pow(0.5, ageDays / halfLife);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Decay dihitung dari sentuhan terakhir (recall), bukan dari pembuatan. */
export function memoryDecayScore(memory: StoredMemory, now: Date = new Date()): number {
  const last = toDate(memory.lastRecalledAt) ?? toDate(memory.createdAt) ?? now;
  return decayScoreFor(memory.type, daysBetween(last, now));
}

/** Seberapa cocok memori dengan pesan terbaru (0–1). */
export function memoryRelevance(content: string, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;

  const tokens = new Set(memoryTokens(content));
  let matched = 0;
  let distinctive = 0;

  for (const word of queryTokens) {
    if (!tokens.has(word)) continue;
    matched += 1;
    if (word.length >= 7) distinctive += 1;
  }

  const ratio = matched / queryTokens.length;
  // Kata khas (nama, "badminton", "alergi") lebih informatif daripada kata
  // umum yang kebetulan bersinggungan.
  return Math.min(1, ratio + distinctive * 0.15);
}

/**
 * Skor gabungan: relevansi (55%), kekuatan memori (25%), kebaruan (20%).
 * `core` mendapat bonus tetap supaya identitas inti selalu ikut.
 */
export function memoryScore(
  memory: StoredMemory,
  queryTokens: string[],
  now: Date = new Date()
): number {
  const relevance = memoryRelevance(memory.content, queryTokens);
  const decay = memoryDecayScore(memory, now) / 100;

  const created = toDate(memory.createdAt) ?? now;
  const recency = Math.pow(0.5, daysBetween(created, now) / RECENCY_HALF_LIFE_DAYS);

  const typeBonus = normalizeMemoryType(memory.type) === 'core' ? 0.18 : 0;

  return 0.55 * relevance + 0.25 * decay + 0.2 * recency + typeBonus;
}

/**
 * Pilih top-K memori untuk konteks.
 *
 * - `core` selalu lolos filter skor.
 * - Item lain harus melewati `MIN_RETRIEVAL_SCORE`.
 * - Seri dipecah oleh waktu pembuatan (yang lebih baru menang) supaya hasil
 *   deterministik dan tidak berubah-ubah antar request.
 */
export function rankMemories(
  memories: StoredMemory[],
  query: string,
  opts: { now?: Date; limit?: number } = {}
): StoredMemory[] {
  const now = opts.now ?? new Date();
  const requested = opts.limit ?? RETRIEVAL_TOP_K;
  const limit = Math.max(1, Math.min(RETRIEVAL_MAX_K, Math.floor(requested)));
  const queryTokens = memoryTokens(query);

  const scored = memories
    .map((memory) => ({ memory, score: memoryScore(memory, queryTokens, now) }))
    .filter(
      (entry) =>
        normalizeMemoryType(entry.memory.type) === 'core' ||
        entry.score >= MIN_RETRIEVAL_SCORE
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTime = toDate(a.memory.createdAt)?.getTime() ?? 0;
      const bTime = toDate(b.memory.createdAt)?.getTime() ?? 0;
      return bTime - aTime;
    });

  return scored.slice(0, limit).map((entry) => entry.memory);
}

/** Format yang SAMA dengan memori lama: satu baris `- fakta` per item. */
export function formatMemoryLines(memories: StoredMemory[]): string {
  return memories
    .map((memory) => `- ${memory.content.trim()}`)
    .filter((line) => line.length > 2)
    .join('\n');
}

/**
 * Fakta baru dari satu balasan model.
 *
 * `memories` adalah sumber utama. `memoryUpdate` hanya fallback untuk model
 * lama/varian prompt yang belum mengisi array terstruktur.
 */
export function memoryCandidatesFromReply(reply: {
  memories?: ExtractedMemory[];
  memoryUpdate?: string;
}): ExtractedMemory[] {
  const structured = (reply.memories ?? [])
    .map((item) => {
      const content = cleanMemoryContent(item?.content);
      if (content.length < 3) return null;
      return {
        type: normalizeMemoryType(item?.type) === 'diary'
          ? ('semantic' as ExtractedMemoryType)
          : (normalizeMemoryType(item?.type) as ExtractedMemoryType),
        content,
        confidence:
          typeof item?.confidence === 'number' && Number.isFinite(item.confidence)
            ? Math.max(0, Math.min(100, Math.round(item.confidence)))
            : 60,
      } satisfies ExtractedMemory;
    })
    .filter((item): item is ExtractedMemory => item !== null);

  if (structured.length > 0) return structured.slice(0, 3);

  const fallback = cleanMemoryContent(reply.memoryUpdate);
  return fallback.length >= 3
    ? [{ type: 'semantic', content: fallback, confidence: 60 }]
    : [];
}

/** Kapan konsolidasi layak dijalankan (fungsi murni, mudah diuji). */
export function shouldConsolidate(totalItems: number, sourceCount: number): boolean {
  return (
    totalItems > CONSOLIDATION_TRIGGER_ITEMS && sourceCount >= CONSOLIDATION_MIN_SOURCES
  );
}

// ---------------------------------------------------------------------------
// Lapisan database
// ---------------------------------------------------------------------------

/**
 * Impor blob `longTermMemory` lama ke tabel (sekali saja).
 *
 * Dipanggil saat profil dibaca; kalau blob kosong, nol biaya tambahan.
 * Kolom lama dikosongkan SETELAH insert berhasil supaya kegagalan sesaat
 * tidak menghilangkan memori user.
 */
export async function importLegacyMemory(
  userId: string,
  blob: string | null | undefined
): Promise<number> {
  const lines = (blob ?? '')
    .split('\n')
    .map((line) => cleanMemoryContent(line))
    .filter((line) => line.length >= 3);

  if (lines.length === 0) return 0;

  try {
    const inserted = await addMemories(
      userId,
      lines.map((content) => ({ type: 'semantic' as const, content, confidence: 70 })),
      { maxInsert: 20 }
    );

    await db
      .update(userProfiles)
      .set({ longTermMemory: '' })
      .where(eq(userProfiles.userId, userId));

    logger.info('memory.legacy_imported', { userId, inserted, lines: lines.length });
    return inserted;
  } catch (error) {
    logger.warn('memory.legacy_import_failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Tulis fakta baru, dengan dedupe terhadap isi tabel DAN di dalam batch.
 * Mengembalikan jumlah baris yang benar-benar masuk.
 */
export async function addMemories(
  userId: string,
  candidates: ExtractedMemory[],
  opts: { maxInsert?: number } = {}
): Promise<number> {
  const maxInsert = Math.max(1, opts.maxInsert ?? 5);

  const cleaned: ExtractedMemory[] = [];
  for (const candidate of candidates) {
    const content = cleanMemoryContent(candidate?.content);
    if (content.length < 3) continue;

    const type = normalizeMemoryType(candidate?.type);
    if (type === 'diary') continue; // diary hanya dibuat server

    if (cleaned.some((item) => isDuplicateMemory(item.content, content))) continue;

    cleaned.push({
      type: type as ExtractedMemoryType,
      content,
      confidence:
        typeof candidate?.confidence === 'number' && Number.isFinite(candidate.confidence)
          ? Math.max(0, Math.min(100, Math.round(candidate.confidence)))
          : 60,
    });
  }

  if (cleaned.length === 0) return 0;

  const existing = await db
    .select({ content: memoryItems.content })
    .from(memoryItems)
    .where(eq(memoryItems.userId, userId))
    .limit(DEDUPE_SCAN_LIMIT);

  const fresh = cleaned
    .filter((candidate) => !existing.some((row) => isDuplicateMemory(row.content, candidate.content)))
    .slice(0, maxInsert);

  if (fresh.length === 0) return 0;

  await db.insert(memoryItems).values(
    fresh.map((candidate) => ({
      userId,
      type: candidate.type,
      content: candidate.content,
      confidence: candidate.confidence,
      decayScore: 100,
    }))
  );

  return fresh.length;
}

/**
 * Simpan memori dari satu balasan chat. TIDAK PERNAH melempar.
 *
 * Dipanggil fire-and-forget setelah pesan tersimpan. Konsolidasi ikut
 * dijadwalkan di sini (tanpa worker terpisah) karena satu turn aktif adalah
 * satu-satunya sinyal "user sedang di sini" yang kita punya.
 */
export async function recordMemories(
  userId: string,
  reply: { memories?: ExtractedMemory[]; memoryUpdate?: string },
  apiKey?: string
): Promise<number> {
  try {
    const candidates = memoryCandidatesFromReply(reply);
    const inserted = candidates.length > 0 ? await addMemories(userId, candidates) : 0;

    if (inserted > 0) {
      logger.info('memory.recorded', { userId, inserted });
    }

    // Tidak ditunggu: "merenung" memanggil LLM (detik-an), chat tidak boleh
    // ikut menunggu. Kalau runtime membekukan promise ini, tidak ada data
    // hilang — konsolidasi hanya ditunda ke giliran berikutnya.
    void maybeConsolidateMemory(userId, apiKey);

    return inserted;
  } catch (error) {
    logger.warn('memory.record_failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/** Baca + ranking memori untuk satu giliran. Gagal → array kosong. */
export async function retrieveMemories(
  userId: string,
  query: string,
  opts: { limit?: number; now?: Date } = {}
): Promise<StoredMemory[]> {
  try {
    const rows = await db
      .select()
      .from(memoryItems)
      .where(eq(memoryItems.userId, userId))
      .orderBy(desc(memoryItems.createdAt))
      .limit(RETRIEVAL_SCAN_LIMIT);

    const chosen = rankMemories(rows, query, opts);

    if (chosen.length > 0) {
      // Di-await: satu UPDATE murah, dan promise tanpa penunggu bisa dibekukan
      // sebelum sempat jalan di runtime serverless (decay jadi tidak akurat).
      await touchRecalled(userId, chosen, opts.now ?? new Date());
    }

    return chosen;
  } catch (error) {
    logger.warn('memory.retrieve_failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** Teks siap tempel ke prompt ('' kalau tidak ada memori). */
export async function retrieveMemoryLines(userId: string, query: string): Promise<string> {
  return formatMemoryLines(await retrieveMemories(userId, query));
}

/**
 * Tandai memori sebagai baru diingat. Kegagalan diabaikan: ini hanya
 * memperlambat peluruhan, bukan data yang wajib.
 */
async function touchRecalled(
  userId: string,
  memories: StoredMemory[],
  now: Date
): Promise<void> {
  try {
    await db
      .update(memoryItems)
      .set({ lastRecalledAt: now })
      .where(
        and(
          eq(memoryItems.userId, userId),
          inArray(
            memoryItems.id,
            memories.map((memory) => memory.id)
          )
        )
      );
  } catch (error) {
    logger.warn('memory.touch_failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Daftar memori untuk panel transparansi (M3.5), terbaru dulu. */
export async function listMemories(userId: string): Promise<MemoryView[]> {
  const rows = await db
    .select()
    .from(memoryItems)
    .where(eq(memoryItems.userId, userId))
    .orderBy(desc(memoryItems.createdAt))
    .limit(200);

  const now = new Date();

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    content: row.content,
    confidence: row.confidence,
    decayScore: memoryDecayScore(row, now),
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    lastRecalledAt: row.lastRecalledAt ? row.lastRecalledAt.toISOString() : null,
  }));
}

/** Hapus satu memori milik user. `false` kalau tidak ada / bukan miliknya. */
export async function deleteMemory(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(memoryItems)
    .where(and(eq(memoryItems.userId, userId), eq(memoryItems.id, id)))
    .returning({ id: memoryItems.id });

  return deleted.length > 0;
}

/** Hapus SEMUA memori user (GDPR / reset). */
export async function deleteAllMemories(userId: string): Promise<number> {
  const deleted = await db
    .delete(memoryItems)
    .where(eq(memoryItems.userId, userId))
    .returning({ id: memoryItems.id });

  return deleted.length;
}

export const CONSOLIDATION_INSTRUCTIONS = `
Kamu adalah Livia, perempuan tsundere yang menjalani hubungan jangka panjang
dengan satu user. Kamu sedang "merenung" sendirian, memikirkan hal-hal yang
kamu ingat tentang User.

Di bawah ini beberapa catatan memori lama tentang User. Padatkan menjadi SATU
ingatan yang utuh dari sudut pandangmu sendiri:
- pertahankan fakta penting (nama, kebiasaan, alergi, janji yang belum selesai)
- boleh menyebut perasaanmu tentang fakta itu, tetap dalam suara Livia
- jangan mengarang fakta yang tidak ada di catatan
- 2-4 kalimat Bahasa Indonesia

Kembalikan HANYA JSON {"memory":"..."}`;

/**
 * Konsolidasi memori lama menjadi satu entri `diary` (M3.4).
 *
 * Dipicu fire-and-forget setelah memori baru ditulis. Semua kegagalan
 * ditelan: kalau gagal, memori lama tetap utuh dan percobaan diulang pada
 * giliran berikutnya.
 */
export async function maybeConsolidateMemory(
  userId: string,
  apiKey?: string
): Promise<string | null> {
  try {
    const totals = await db
      .select({ total: count() })
      .from(memoryItems)
      .where(eq(memoryItems.userId, userId));
    const total = Number(totals[0]?.total ?? 0);

    if (total <= CONSOLIDATION_TRIGGER_ITEMS) return null;

    const rows = await db
      .select()
      .from(memoryItems)
      .where(
        and(
          eq(memoryItems.userId, userId),
          inArray(memoryItems.type, ['episodic', 'semantic'])
        )
      )
      .orderBy(asc(memoryItems.createdAt))
      .limit(40);

    const now = new Date();
    const sources = rows
      .map((row) => ({ row, decay: memoryDecayScore(row, now) }))
      .filter((entry) => entry.decay <= CONSOLIDATION_DECAY_CEILING)
      .slice(0, CONSOLIDATION_MAX_SOURCES);

    if (!shouldConsolidate(total, sources.length)) return null;

    const transcript = sources
      .map((entry) => `- (${entry.row.type}) ${entry.row.content}`)
      .join('\n');

    const result = await getProvider().generate({
      operation: 'memory.consolidate',
      systemInstruction: CONSOLIDATION_INSTRUCTIONS,
      turns: [{ role: 'user', text: transcript }],
      responseSchema: memoryDigestResponseSchema,
      outputSchema: memoryDigestValidator,
      temperature: 0.3,
      maxOutputTokens: 220,
      apiKey,
    });

    // M7.1: catat pemakaian (fire-and-forget, fail-open di dalam).
    recordProviderUsage(result, { userId, provider: 'gemini', operation: 'memory.consolidate', userKey: Boolean(apiKey) });

    if (result.blocked || !result.data) {
      logger.warn('memory.consolidate_blocked', { userId });
      return null;
    }

    const content = cleanMemoryContent(result.data.memory, 400);
    if (content.length < 3) return null;

    await db.insert(memoryItems).values({
      userId,
      type: 'diary',
      content,
      confidence: 80,
      decayScore: 100,
    });

    // Sumber dihapus SETELAH diary tersimpan. Kalau insert gagal, tidak ada
    // yang hilang.
    await db.delete(memoryItems).where(
      and(
        eq(memoryItems.userId, userId),
        inArray(
          memoryItems.id,
          sources.map((entry) => entry.row.id)
        )
      )
    );

    logger.info('memory.consolidated', { userId, sources: sources.length });
    return content;
  } catch (error) {
    logger.warn('memory.consolidate_failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
