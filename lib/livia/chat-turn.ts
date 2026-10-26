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
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { getCycleInfo } from '@/lib/livia/cycle';

type Profile = typeof userProfiles.$inferSelect;

export interface ChatTurnContext {
  userId: string;
  profile: Profile;
  highestChapter: number;
  chatHistory: { role: 'user' | 'livia'; content: string }[];
  cyclePhase: string;
  dayOfCycle: number;
  language: 'id' | 'en';
  customApiKey: string | undefined;
}

export interface LiviaReplyContent {
  reply: string;
  affectionDelta: number;
  expression: string;
  memoryUpdate?: string;
}

/**
 * Ambil semua yang dibutuhkan satu giliran chat.
 *
 * `message` dan `isVoiceCall` SUDAH divalidasi route; modul ini tidak
 * memvalidasi ulang supaya tidak ada aturan gandeng yang berbeda antara
 * route JSON dan route streaming.
 */
export async function loadChatTurnContext(args: {
  userId: string;
  req: Request;
  isVoiceCall: boolean;
}): Promise<ChatTurnContext> {
  const { userId, req, isVoiceCall } = args;

  const profileResults = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  const profile = profileResults[0];
  if (!profile) throw errors.notFound('Profil');

  const progressResults = await db
    .select()
    .from(storyProgress)
    .where(eq(storyProgress.userId, userId));
  const highestChapter = progressResults[0]?.unlockedChapters
    ? Math.max(...progressResults[0].unlockedChapters)
    : 0;

  const historyResults = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(30);

  const chatHistory = historyResults.reverse().map((msg) => ({
    role: msg.role as 'user' | 'livia',
    content: msg.content,
  }));

  const { dayOfCycle, phase } = getCycleInfo(profile.liviaCycleAnchor);

  return {
    userId,
    profile,
    highestChapter,
    chatHistory,
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
  /** Nama field dari `applyAffectionUpdate`. Route memetakan ke `newLevel`. */
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
  const { reply, affectionDelta, memoryUpdate } = aiReply;

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
    updateResult = await applyAffectionUpdate(userId, profile.affection || 0, affectionDelta);
    updateData.affection = updateResult.newAffection;
    updateData.affectionLevel = updateResult.affectionLevel;
  }

  if (memoryUpdate && memoryUpdate.trim() !== '') {
    const cleanFact = memoryUpdate.trim().replace(/^[-*•]\s*/, '');
    const existing = (profile.longTermMemory || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const factLine = `- ${cleanFact}`;
    if (!existing.some((f) => f.toLowerCase() === factLine.toLowerCase())) {
      existing.push(factLine);
      updateData.longTermMemory = existing.slice(-20).join('\n');
    }
  }

  await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, userId));

  return updateResult;
}
