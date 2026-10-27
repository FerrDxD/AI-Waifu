/**
 * Logika pergantian giliran chat (M2.1).
 *
 * Dulu seluruh urutan ini di-copy-paste antara `/api/chat` dan (baru) route
 * streaming `/api/chat/stream`: ambil profil → ambil bab → ambil riwayat →
 * hitung siklus → generate → simpan pesan → update afeksi → update memori.
 *
 * Gerakan yang salah di sini = data user rusak, jadi urutannya dikunci di
 * satu tempat dan kedua route hanya memanggil.
 */
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chatMessages, userProfiles, storyProgress } from '@/lib/db/schema';
import { AppError, errors } from '@/lib/errors';
import { extractLanguage, resolveApiKey } from '@/lib/gemini';
import { buildChatContext } from '@/lib/ai/context';
import { loadSummaries } from '@/lib/livia/summary';
import { logger } from '@/lib/logger';
import { applyAffectionAtomic } from '@/lib/livia/affection.server';
import { getCycleInfo } from '@/lib/livia/cycle';
import { importLegacyMemory, recordMemories, retrieveMemoryLines } from '@/lib/livia/memory';
import type { ExtractedMemory } from '@/lib/ai/schemas';

type Profile = typeof userProfiles.$inferSelect;

export interface ChatTurnContext {
  userId: string;
  profile: Profile;
  highestChapter: number;
  /**
   * Riwayat SUDAH terpangkas di sini (M2.5): window terbaru + pesan lama yang
   * relevan dengan pesan baru user, dikurangi anggaran token. Route tidak
   * perlu tahu aturan pemangkasannya.
   */
  chatHistory: { role: 'user' | 'livia'; content: string }[];
  /** Ringkasan obrolan lama yang sudah digabung ('' kalau belum ada). */
  earlierSummary: string;
  /**
   * Memori terpilih untuk giliran ini (M3.3), sudah dalam format baris
   * `- fakta`. String kosong berarti belum ada memori.
   */
  memoryLines: string;
  cyclePhase: string;
  dayOfCycle: number;
  language: 'id' | 'en';
  customApiKey: string | undefined;
}

export interface LiviaReplyContent {
  reply: string;
  affectionDelta: number;
  expression: string;
  /** Fakta terstruktur dari model (M3.2); sumber utama penulisan memori. */
  memories?: ExtractedMemory[];
  /** Fallback lama kalau model tidak mengisi `memories`. */
  memoryUpdate?: string;
}

/**
 * Ambil semua yang dibutuhkan satu giliran chat.
 *
 * `message` dan `isVoiceCall` SUDAH divalidasi route; modul ini tidak
 * memvalidasi ulang supaya tidak ada aturan gandeng yang berbeda antara
 * route JSON dan route streaming.
 *
 * `message` dibutuhkan untuk relevansi konteks: pesan lama dipilih berdasar
 * kemiripan topik dengan apa yang baru saja user tulis.
 */
export async function loadChatTurnContext(args: {
  userId: string;
  req: Request;
  isVoiceCall: boolean;
  message: string;
}): Promise<ChatTurnContext> {
  const { userId, req, isVoiceCall, message } = args;

  const profileResults = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  const profile = profileResults[0];
  if (!profile) throw errors.notFound('Profil');

  // M3.1: migrasi sekali jalan dari blob `longTermMemory` lama ke tabel
  // terstruktur. Setelah kolomnya kosong (kondisi normal), tidak ada kerja
  // tambahan di sini.
  if (profile.longTermMemory && profile.longTermMemory.trim() !== '') {
    await importLegacyMemory(userId, profile.longTermMemory);
  }

  // M3.3: ambil 5–8 memori paling relevan untuk pesan ini. Fungsi ini tidak
  // pernah melempar — memori yang tidak tersedia bukan alasan chat gagal.
  const memoryLines = await retrieveMemoryLines(userId, message);

  const progressResults = await db
    .select()
    .from(storyProgress)
    .where(eq(storyProgress.userId, userId));
  const highestChapter = progressResults[0]?.unlockedChapters
    ? Math.max(...progressResults[0].unlockedChapters)
    : 0;

  // 60 baris terakhir: cukup dalam untuk pertambangan relevansi, jauh lebih
  // ringan daripada membaca seluruh riwayat. Sisanya hidup sebagai ringkasan.
  const historyResults = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(60);

  const rawHistory = historyResults.reverse().map((msg) => ({
    role: msg.role as 'user' | 'livia',
    content: msg.content,
  }));

  const { dayOfCycle, phase } = getCycleInfo(profile.liviaCycleAnchor);

  // M2.5: pangkas riwayat ke window + relevan, dan muat ringkasan lama.
  // Baris DB memakai peran 'livia'; lapisan AI memakai 'model'.
  const summaries = await loadSummaries(userId);
  const contextBuild = buildChatContext({
    history: rawHistory.map((m) => ({
      role: m.role === 'livia' ? 'model' : 'user',
      text: m.content,
    })),
    latestUserMessage: message,
    summaries,
  });

  const chatHistory = contextBuild.turns.map((turn) => ({
    role: (turn.role === 'model' ? 'livia' : 'user') as 'user' | 'livia',
    content: turn.text,
  }));

  if (contextBuild.droppedTurns > 0) {
    logger.warn('chat.context_trimmed', {
      userId,
      dropped: contextBuild.droppedTurns,
      usedTokens: contextBuild.usedTokens,
    });
  }

  return {
    userId,
    profile,
    highestChapter,
    chatHistory,
    earlierSummary: contextBuild.summaryText,
    memoryLines,
    cyclePhase: phase,
    dayOfCycle,
    language: extractLanguage(req),
    customApiKey: await resolveApiKey(userId, req),
  };
}

/**
 * Statistik fisiologis yang dibaca route langsung dari konteks.
 * Disekat di satu tempat karena `?? 100` ini yang membuat sistem toleran
 * terhadap profil lama yang belum punya kolom baru.
 */
export function statsFromContext(ctx: ChatTurnContext) {
  return {
    hunger: ctx.profile.liviaHunger ?? 100,
    energy: ctx.profile.liviaEnergy ?? 100,
    hydration: ctx.profile.liviaHydration ?? 100,
    cyclePhase: ctx.cyclePhase,
    cycleDay: ctx.dayOfCycle,
  };
}

export interface PersistChatTurnResult {
  /** Kolom profil boleh null — route mengembalikannya apa adanya. */
  newAffection: number | null;
  /** Nama field dari `applyAffectionAtomic`. Route memetakan ke `newLevel`. */
  affectionLevel: number | null;
  unlockedChapter: number | null;
}

/**
 * Simpan hasil satu giliran: dua pesan, lalu update profil (afeksi + memori).
 *
 * Dipanggil SETELAH balasan tervalidasi — jangan menyimpan teks parsial.
 * Terurut: pesan dulu, afeksi kedua, memori ketiga — sama seperti route lama
 * supaya tidak ada perubahan perilaku diam-diam.
 */
export async function persistChatTurn(
  ctx: ChatTurnContext,
  message: string,
  aiReply: LiviaReplyContent
): Promise<PersistChatTurnResult> {
  const { userId, profile } = ctx;
  const { reply, affectionDelta, memories, memoryUpdate } = aiReply;

  await db.insert(chatMessages).values([
    { userId, role: 'user', content: message, affectionDelta: 0 },
    { userId, role: 'livia', content: reply, affectionDelta },
  ]);

  let updateResult = {
    newAffection: profile.affection,
    affectionLevel: profile.affectionLevel,
    unlockedChapter: null as number | null,
  };

  const updateData: Record<string, unknown> = { lastSeen: new Date() };

  if (affectionDelta !== 0) {
    // M5.4: afeksi di-update atomik (affection + delta, clamp) + lastSeen +
    // unlock chapter dalam satu jalur; tidak lagi baca-lalu-tulis.
    const res = await applyAffectionAtomic(userId, affectionDelta);
    if (res) {
      updateResult = res;
    }
  }

  await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, userId));

  // M3.2: memori ditulis ke tabel terstruktur, BUKAN lagi ke blob 20 baris.
  //
  // DI-AWAIT (bukan fire-and-forget): di Next serverless, promise yang tidak
  // ditunggu bisa dibekukan begitu response dikirim, sehingga fakta baru hilang
  // diam-diam. Biayanya hanya 1 SELECT + 1 INSERT. `recordMemories` menelan
  // semua errornya sendiri, jadi tidak bisa membatalkan pesan & afeksi yang
  // sudah tersimpan. Konsolidasi (LLM call) TETAP fire-and-forget di dalamnya.
  await recordMemories(userId, { memories, memoryUpdate }, ctx.customApiKey);

  return updateResult;
}
