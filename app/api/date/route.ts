import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { generateDateDialogue, extractLanguage, resolveApiKey } from '@/lib/gemini';
import { sanitizePreferredModel } from '@/lib/ai/model-selection';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { apiHandler } from '@/lib/api-handler';
import { aiRateLimit, aiDailyQuota } from '@/lib/rate-limit';
import { getCycleInfo } from '@/lib/livia/cycle';
import { validateDateLocation, sanitizeUserName } from '@/lib/validation';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { recordUserActivity } from '@/lib/analytics/activity';

export const POST = apiHandler(
  {
    route: '/api/date.POST',
    rateLimit: aiRateLimit,
    rateLimitKey: ({ userId }) => `date_${userId}`,
    rateLimitMessage: 'Terlalu banyak permintaan. Tunggu sebentar ya.',
  },
  async ({ userId, req, session }) => {
    const daily = await aiDailyQuota.limit(`date_${userId}`);
    if (!daily.success) {
      logger.warn('date.daily_quota_exhausted', { route: '/api/date.POST', userId });
      throw errors.tooManyRequests('Kuota kencan harianmu sudah habis. Lanjut besok ya.');
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    // H0.5: lokasi di-whitelist (bukan sekadar di-trim) karena masuk ke prompt.
    const location = validateDateLocation(body?.location);
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

    let newHunger = profile?.liviaHunger ?? 100;
    let newEnergy = profile?.liviaEnergy ?? 100;
    const updatePayload: Record<string, unknown> = {};

    if (location === 'Warung Ramen') {
      newHunger = Math.min(100, newHunger + 40);
      newEnergy = Math.min(100, newEnergy + 15);
      updatePayload.liviaHunger = newHunger;
      updatePayload.liviaEnergy = newEnergy;
    } else if (location === 'Restoran Gyoza') {
      newHunger = Math.min(100, newHunger + 35);
      newEnergy = Math.min(100, newEnergy + 15);
      updatePayload.liviaHunger = newHunger;
      updatePayload.liviaEnergy = newEnergy;
    } else if (location === 'Food Court') {
      newHunger = Math.min(100, newHunger + 25);
      newEnergy = Math.min(100, newEnergy + 10);
      updatePayload.liviaHunger = newHunger;
      updatePayload.liviaEnergy = newEnergy;
    }

    if (location === 'Festival Musim Panas') {
      const currentItems = profile?.itemsBrought || [];
      if (!currentItems.includes('visited_festival')) {
        updatePayload.itemsBrought = [...currentItems, 'visited_festival'];
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      await db
        .update(userProfiles)
        .set(updatePayload)
        .where(eq(userProfiles.userId, userId));
    }

    const { scene: dialogue, timeOfDay } = await generateDateDialogue(
      location,
      profile?.affection || 0,
      userName,
      {
        hunger: profile?.liviaHunger ?? 100,
        energy: profile?.liviaEnergy ?? 100,
        hydration: profile?.liviaHydration ?? 100,
        cyclePhase,
        cycleDay: dayOfCycle,
      },
      customApiKey,
      language,
      userId,
      sanitizePreferredModel(profile?.preferredModel)
    );

    // M7.2: catat hari-aktif (retensi/DAU). Fail-open di dalam
    // recordUserActivity; di-await agar tidak dibekukan serverless.
    await recordUserActivity(userId);

    return NextResponse.json({ scene: dialogue, timeOfDay });
  }
);
