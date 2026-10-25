import { NextResponse } from 'next/server';
import { generateDateDialogue, extractLanguage, resolveApiKey } from '@/lib/gemini';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apiErrorResponse, errors } from '@/lib/errors';
import { aiRateLimit, aiDailyQuota, rateLimitResponse } from '@/lib/rate-limit';
import { validateDateLocation, sanitizeUserName } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  let userId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) throw errors.unauthorized();
    userId = session.user.id;
    const uid = userId;

    const limit = await aiRateLimit.limit(`date_${uid}`);
    if (!limit.success) {
      return rateLimitResponse(limit, 'Terlalu banyak permintaan. Tunggu sebentar ya.');
    }

    const daily = await aiDailyQuota.limit(`date_${uid}`);
    if (!daily.success) {
      logger.warn('date.daily_quota_exhausted', { userId: uid });
      throw errors.tooManyRequests('Kuota kencan harianmu sudah habis. Lanjut besok ya.');
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    // H0.5: lokasi di-whitelist (bukan sekadar di-trim) karena masuk ke prompt.
    const location = validateDateLocation(body?.location);
    const userName = sanitizeUserName(session.user?.name);

    const language = extractLanguage(req);
    const customApiKey = await resolveApiKey(uid, req);

    const profileResults = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, uid));
    const profile = profileResults[0];

    const now = new Date();
    const anchor = profile?.liviaCycleAnchor ? new Date(profile.liviaCycleAnchor).getTime() : now.getTime();
    const daysDiff = Math.floor((now.getTime() - anchor) / (1000 * 60 * 60 * 24));
    const dayOfCycle = ((daysDiff % 28) + 28) % 28 + 1;
    let cyclePhase = 'Luteal';
    if (dayOfCycle <= 5) cyclePhase = 'Menstruasi';
    else if (dayOfCycle <= 14) cyclePhase = 'Folikuler';
    else if (dayOfCycle <= 17) cyclePhase = 'Ovulasi';

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
        .where(eq(userProfiles.userId, uid));
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
      language
    );

    return NextResponse.json({ scene: dialogue, timeOfDay });
  } catch (error) {
    return apiErrorResponse(error, { route: 'api/date.POST', userId });
  }
}
