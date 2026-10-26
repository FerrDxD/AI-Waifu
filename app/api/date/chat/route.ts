import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { generateDateResponse, extractLanguage, resolveApiKey } from '@/lib/gemini';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { apiHandler } from '@/lib/api-handler';
import { aiRateLimit, aiDailyQuota } from '@/lib/rate-limit';
import { getCycleInfo } from '@/lib/livia/cycle';
import {
  validateChatMessage,
  validateDateLocation,
  validateHistory,
  sanitizeUserName,
} from '@/lib/validation';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const POST = apiHandler(
  {
    route: '/api/date/chat.POST',
    rateLimit: aiRateLimit,
    rateLimitKey: ({ userId }) => `datechat_${userId}`,
    rateLimitMessage: 'Terlalu banyak permintaan. Tunggu sebentar ya.',
  },
  async ({ userId, req, session }) => {
    // Kuota harian: sebelumnya endpoint ini hanya punya burst limit, jadi
    // pemakaian AI-nya tidak dibatasi per hari sama sekali.
    const daily = await aiDailyQuota.limit(`datechat_${userId}`);
    if (!daily.success) {
      logger.warn('date_chat.daily_quota_exhausted', { route: '/api/date/chat.POST', userId });
      throw errors.tooManyRequests('Kuota obrolan kencanmu sudah habis. Lanjut besok ya.');
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    // H0.5: semua input yang masuk prompt divalidasi & dibatasi.
    const location = validateDateLocation(body?.location);
    const message = validateChatMessage(body?.message);
    const history = validateHistory(body?.history);
    const userName = sanitizeUserName(session.user?.name);

    const language = extractLanguage(req);
    const customApiKey = await resolveApiKey(userId, req);

    const profileResults = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];

    // M2.3: logika siklus haid dipindah ke lib/livia/cycle.ts
    const { dayOfCycle, phase: cyclePhase } = getCycleInfo(profile?.liviaCycleAnchor);

    const { reply, expression, affectionDelta, memoryUpdate } = await generateDateResponse(
      location,
      message,
      history,
      profile?.affection || 0,
      userName,
      {
        hunger: profile?.liviaHunger ?? 100,
        energy: profile?.liviaEnergy ?? 100,
        hydration: profile?.liviaHydration ?? 100,
        cyclePhase,
        cycleDay: dayOfCycle,
      },
      profile?.longTermMemory || undefined,
      customApiKey,
      language
    );

    let updateResult: {
      newAffection: number | null | undefined;
      affectionLevel?: number;
      unlockedChapter: number | null;
    } = { newAffection: profile?.affection, unlockedChapter: null };

    if (profile) {
      const updateData: Record<string, unknown> = { lastSeen: new Date() };

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

      if (affectionDelta !== 0) {
        updateResult = await applyAffectionUpdate(userId, profile.affection || 0, affectionDelta);
        updateData.affection = updateResult.newAffection;
        updateData.affectionLevel = updateResult.affectionLevel;
      }

      await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, userId));
    }

    return NextResponse.json({
      reply,
      expression,
      affectionDelta,
      newAffection: updateResult.newAffection,
      unlockedChapter: updateResult.unlockedChapter,
    });
  }
);
