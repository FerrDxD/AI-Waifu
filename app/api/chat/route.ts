import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chatMessages, userProfiles, storyProgress } from '@/lib/db/schema';
import { generateLiviaResponse, extractLanguage, resolveApiKey } from '@/lib/gemini';
import { generatePersonalityContext } from '@/lib/livia/personality';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { aiRateLimit, aiDailyQuota } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateChatMessage } from '@/lib/validation';

export const POST = apiHandler(
  {
    route: '/api/chat.POST',
    rateLimit: aiRateLimit,
    rateLimitKey: ({ userId }) => `chat_${userId}`,
    rateLimitMessage: 'Terlalu banyak pesan. Tunggu sebentar ya.',
  },
  async ({ userId, req }) => {
    // Pengaman biaya: kuota harian per user.
    const daily = await aiDailyQuota.limit(`chat_${userId}`);
    if (!daily.success) {
      logger.warn('chat.daily_quota_exhausted', { route: '/api/chat.POST', userId });
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
    const customApiKey = await resolveApiKey(userId, req);

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

    const personalityContext = generatePersonalityContext(profile.itemsBrought || []);

    const now = new Date();
    const anchor = profile.liviaCycleAnchor
      ? new Date(profile.liviaCycleAnchor).getTime()
      : now.getTime();
    const daysDiff = Math.floor((now.getTime() - anchor) / (1000 * 60 * 60 * 24));
    const dayOfCycle = (((daysDiff % 28) + 28) % 28) + 1;
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

    return NextResponse.json({
      reply,
      expression,
      affectionDelta,
      newAffection: updateResult.newAffection,
      newLevel: updateResult.affectionLevel,
      unlockedChapter: updateResult.unlockedChapter,
    });
  }
);
