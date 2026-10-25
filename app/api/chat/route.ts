import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatMessages, userProfiles, storyProgress } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateLiviaResponse, extractLanguage, resolveApiKey } from '@/lib/gemini';
import { generatePersonalityContext } from '@/lib/livia/personality';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { aiRateLimit, aiDailyQuota, rateLimitResponse } from '@/lib/rate-limit';
import { apiErrorResponse, errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateChatMessage } from '@/lib/validation';

export async function POST(req: Request) {
  let userId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) throw errors.unauthorized();
    userId = session.user.id;
    const uid = userId;

    // H0.4: rate limit sebelum parsing body / memanggil AI.
    const limit = await aiRateLimit.limit(`chat_${uid}`);
    if (!limit.success) {
      return rateLimitResponse(limit, 'Terlalu banyak pesan. Tunggu sebentar ya.');
    }

    // Pengaman biaya: kuota harian per user.
    const daily = await aiDailyQuota.limit(`chat_${uid}`);
    if (!daily.success) {
      logger.warn('chat.daily_quota_exhausted', { userId: uid });
      throw errors.tooManyRequests(
        'Kuota obrolan harianmu sudah habis. Lanjut lagi besok ya — Livia juga butuh istirahat.'
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    // H0.5: batas panjang + sanitasi, supaya prompt raksasa tidak sampai ke Gemini.
    const message = validateChatMessage(body?.message);
    const isVoiceCall = body?.isVoiceCall === true;

    const language = extractLanguage(req);
    // H0.1: key pribadi diambil dari DB terenkripsi, bukan dari cookie client.
    const customApiKey = await resolveApiKey(uid, req);

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, uid));
    const profile = profileResults[0];
    if (!profile) throw errors.notFound('Profil');

    const progressResults = await db.select().from(storyProgress).where(eq(storyProgress.userId, uid));
    const highestChapter = progressResults[0]?.unlockedChapters
      ? Math.max(...progressResults[0].unlockedChapters)
      : 0;

    const historyResults = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, uid))
      .orderBy(desc(chatMessages.createdAt))
      .limit(30);

    const chatHistory = historyResults.reverse().map((msg) => ({
      role: msg.role as 'user' | 'livia',
      content: msg.content,
    }));

    const personalityContext = generatePersonalityContext(profile.itemsBrought || []);

    const now = new Date();
    const anchor = profile.liviaCycleAnchor ? new Date(profile.liviaCycleAnchor).getTime() : now.getTime();
    const daysDiff = Math.floor((now.getTime() - anchor) / (1000 * 60 * 60 * 24));
    const dayOfCycle = ((daysDiff % 28) + 28) % 28 + 1;
    let cyclePhase = 'Luteal';
    if (dayOfCycle <= 5) cyclePhase = 'Menstruasi';
    else if (dayOfCycle <= 14) cyclePhase = 'Folikuler';
    else if (dayOfCycle <= 17) cyclePhase = 'Ovulasi';

    const { reply, affectionDelta, expression, memoryUpdate } = await generateLiviaResponse(
      message,
      chatHistory,
      personalityContext,
      profile.affection || 0,
      profile.itemsBrought || [],
      {
        hunger: profile.liviaHunger ?? 100,
        energy: profile.liviaEnergy ?? 100,
        hydration: profile.liviaHydration ?? 100,
        cyclePhase,
        cycleDay: dayOfCycle,
      },
      isVoiceCall,
      profile.longTermMemory || undefined,
      customApiKey,
      language,
      highestChapter
    );

    await db.insert(chatMessages).values([
      { userId: uid, role: 'user', content: message, affectionDelta: 0 },
      { userId: uid, role: 'livia', content: reply, affectionDelta },
    ]);

    let updateResult = {
      newAffection: profile.affection,
      affectionLevel: profile.affectionLevel,
      unlockedChapter: null as number | null,
    };

    const updateData: Record<string, unknown> = { lastSeen: new Date() };

    if (affectionDelta !== 0) {
      updateResult = await applyAffectionUpdate(uid, profile.affection || 0, affectionDelta);
      updateData.affection = updateResult.newAffection;
      updateData.affectionLevel = updateResult.affectionLevel;
    }

    if (memoryUpdate && memoryUpdate.trim() !== '') {
      const cleanFact = memoryUpdate.trim().replace(/^[-*•]\s*/, '');
      const existing = (profile.longTermMemory || '').split('\n').map((s) => s.trim()).filter(Boolean);
      const factLine = `- ${cleanFact}`;
      if (!existing.some((f) => f.toLowerCase() === factLine.toLowerCase())) {
        existing.push(factLine);
        updateData.longTermMemory = existing.slice(-20).join('\n');
      }
    }

    await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, uid));

    return NextResponse.json({
      reply,
      expression,
      affectionDelta,
      newAffection: updateResult.newAffection,
      newLevel: updateResult.affectionLevel,
      unlockedChapter: updateResult.unlockedChapter,
    });
  } catch (error) {
    // H0.6: pesan error internal tidak pernah dikirim mentah ke client.
    return apiErrorResponse(error, { route: 'api/chat.POST', userId });
  }
}
