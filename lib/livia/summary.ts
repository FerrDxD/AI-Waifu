/**
 * Ringkasan bergulir percakapan (M2.5).
 *
 * Masalah yang diselesaikan: window "pesan terakhir" membuat fakta dari awal
 * kenalan hilang — Livia lupa nama panggilan atau janji minggu lalu.
 *
 * Mekanismenya:
 *  1. Hitung berapa pesan yang belum tercakup ringkasan
 *     (total pesan MINUS SUM(coveredCount)).
 *  2. Kalau sudah mencapai ambang (default 20), ambil rentang LAMA yang belum
 *     tercakup, rekap lewat panggilan kecil ke model, simpan ke
 *     `messageSummaries`.
 *  3. Ringkasan itu masuk konteks turn berikutnya lewat `buildChatContext`.
 *
 * "Sudah diringkas apa belum" dilacak dengan SUM(coveredCount), bukan kolom
 * status di chatMessages. Race antar dua proses paling buruknya cuma membuat
 * entri ringkasan dobel — jauh lebih baik daripada rentang terlewat.
 */
import { eq, asc, count, sum } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { chatMessages, messageSummaries } from '@/lib/db/schema';
import { getProvider } from '@/lib/ai';
import { DEFAULT_CONTEXT_BUDGET_TOKENS, approximateTokens } from '@/lib/ai/context';
import { chatSummaryResponseSchema, chatSummaryValidator } from '@/lib/ai/schemas';
import { logger } from '@/lib/logger';

/** Menunggak pesan belum-terringkas sebanyak ini sebelum summarizer bekerja. */
export const SUMMARY_THRESHOLD = 20;

/** Rentang maksimum yang dibaca per satu kali summarizer berjalan. */
const SUMMARY_BATCH_MAX = 40;

/** Minimal pesan layak direkap; kalau kurang, tunggu giliran berikutnya. */
const SUMMARY_MIN_BATCH = 5;

/** Output ringkasan sengaja pendek — teksnya masuk ke prompt tiap turn. */
const SUMMARY_MAX_OUTPUT_TOKENS = 250;

export const SUMMARY_INSTRUCTIONS = `
Kamu adalah pencatat memori jangka panjang untuk karakter wanita bernama Livia
yang menjalani hubungan jangka panjang dengan satu user. Rekap percakapan
berikut menjadi catatan 3-5 kalimat Bahasa Indonesia DARI SUDUT PANDANG LIVIA.
Fokus pada:
- fakta tentang user (nama panggilan, hobi, kerjaan, makanan kesukaan)
- janji atau rencana bersama (sudah / belum selesai)
- konflik atau perasaan yang masih menggantung
JANGAN menceritakan ulang obrolan detik per detik. Hanya kembalikan JSON
{"summary":"..."}`;

export interface SummaryProbe {
  shouldSummarize: boolean;
  /** Berapa pesan yang belum tercakup ringkasan. */
  pending: number;
}

/** Fungsi murni: keputusan summarizer dari dua angka. */
export function shouldSummarize(
  coveredCount: number,
  totalMessages: number,
  threshold: number = SUMMARY_THRESHOLD
): SummaryProbe {
  const pending = Math.max(0, Math.floor(totalMessages) - Math.floor(coveredCount));
  return { shouldSummarize: pending >= threshold, pending };
}

/** Semua ringkasan user (kronologis), siap digabung oleh `buildChatContext`. */
export async function loadSummaries(userId: string): Promise<string[]> {
  const rows = await db
    .select()
    .from(messageSummaries)
    .where(eq(messageSummaries.userId, userId))
    .orderBy(asc(messageSummaries.createdAt))
    .limit(10);

  return rows.map((row) => row.summary);
}

/**
 * Satu putaran summarizer. Mengembalikan kalau tidak ada pekerjaan atau
 * kalau gagal (error ditelan + dilog): giliran chat TIDAK boleh gagal gara-
 * gara ringkasan. Sengaja dipanggil after persist, fire-and-forget.
 */
export async function maybeSummarizeChats(
  userId: string,
  apiKey?: string
): Promise<string | null> {
  try {
    const totals = await db
      .select({ total: count() })
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId));
    const total = Number(totals[0]?.total ?? 0);

    const covereds = await db
      .select({ covered: sum(messageSummaries.coveredCount) })
      .from(messageSummaries)
      .where(eq(messageSummaries.userId, userId));
    const covered = Number(covereds[0]?.covered ?? 0);

    const probe = shouldSummarize(covered, total);
    if (!probe.shouldSummarize) return null;

    // Pesan yang SUDAH tercakup selalu adalah `covered` pesan terlama —
    // rentang belum-tercakup mulai tepat di situ. `.offset(covered)` melompat,
    // jangan `.limit` biasa (yang akan mengambil pesan yang sudah terecap).
    const offset = Math.min(covered, total);
    const batchRows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(asc(chatMessages.createdAt))
      .offset(offset)
      .limit(SUMMARY_BATCH_MAX);

    // Anggaran: satu transkrip tidak boleh lebih besar dari anggaran konteks.
    // Pesan yang tak muat dibuang dari yang TERAKHIR — sisa pembahasannya
    // otomatis menunggu giliran summarizer berikutnya.
    const chosen: { content: string; role: string }[] = [];
    let usedTokens = 0;

    for (const row of batchRows) {
      const cost = approximateTokens(`${row.role}:${row.content}`) + 4;
      if (usedTokens + cost > DEFAULT_CONTEXT_BUDGET_TOKENS) break;
      usedTokens += cost;
      chosen.push({ role: row.role, content: row.content });
    }

    if (chosen.length < SUMMARY_MIN_BATCH) {
      logger.info('summary.batch_too_small', { userId, rows: chosen.length });
      return null;
    }

    const transcript = chosen
      .map((row) => `${row.role === 'livia' ? 'Livia' : 'User'}: ${row.content}`)
      .join('\n');

    const result = await getProvider().generate({
      operation: 'chat.summary',
      systemInstruction: SUMMARY_INSTRUCTIONS,
      turns: [{ role: 'user', text: transcript }],
      responseSchema: chatSummaryResponseSchema,
      outputSchema: chatSummaryValidator,
      temperature: 0.3,
      maxOutputTokens: SUMMARY_MAX_OUTPUT_TOKENS,
      apiKey,
    });

    // Diblok safety filter = hasil sah, bukan error. Coba lagi giliran
    // berikutnya; jangan simpen ringkasan kosong.
    if (result.blocked || !result.data) {
      logger.warn('summary.blocked', { userId });
      return null;
    }

    const summary = result.data.summary.trim();
    await db.insert(messageSummaries).values({
      userId,
      summary,
      coveredCount: chosen.length,
    });

    logger.info('summary.created', { userId, covered: chosen.length });
    return summary;
  } catch (error) {
    // Segala kegagalan (DB, provider, circuit breaker) ditelan: ringkasan itu
    // peningkatan kualitas, bukan jalur kritis chat.
    logger.warn('summary.failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
