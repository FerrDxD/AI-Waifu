import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Batas perubahan afeksi per request — client tidak boleh menentukan lebih. */
const MAX_AFFECTION_DELTA = 20;

function calculateCycleDay(anchorString?: string | null): number {
  if (!anchorString) return 1;
  const anchorDate = new Date(anchorString);
  anchorDate.setHours(0, 0, 0, 0);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((nowDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
  return (((daysDiff % 28) + 28) % 28) + 1;
}

export const GET = apiHandler({ route: '/api/affection' }, async ({ userId }) => {
  const profileResults = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  const storyResults = await db
    .select()
    .from(storyProgress)
    .where(eq(storyProgress.userId, userId));

  const profile = profileResults[0];
  const story = storyResults[0];

  let hunger = profile?.liviaHunger ?? 100;
  let energy = profile?.liviaEnergy ?? 100;
  let hydration = profile?.liviaHydration ?? 100;
  const now = new Date();
  const lastUpdated = profile?.liviaStatsUpdatedAt ? new Date(profile.liviaStatsUpdatedAt) : now;
  const hoursPassed = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60));

  if (hoursPassed > 0 && profile) {
    const dayOfCycle = calculateCycleDay(profile.liviaCycleAnchor?.toISOString());
    let hungerRate = 5;
    let energyRate = 2;
    let hydrationRate = 10;

    if (dayOfCycle >= 6 && dayOfCycle <= 14) {
      // Folikuler: konsumsi energi, lapar, dan hidrasi berkurang 100% (jadi 0)
      hungerRate = 0;
      energyRate = 0;
      hydrationRate = 0;
    } else if (dayOfCycle >= 18) {
      // Luteal: konsumsi hunger meningkat drastis (280% = 2.8x)
      hungerRate = Math.round(5 * 2.8);
    }

    hunger = Math.max(0, hunger - hoursPassed * hungerRate);
    energy = Math.max(0, energy - hoursPassed * energyRate);
    hydration = Math.max(0, hydration - hoursPassed * hydrationRate);

    await db
      .update(userProfiles)
      .set({
        liviaHunger: hunger,
        liviaEnergy: energy,
        liviaHydration: hydration,
        liviaStatsUpdatedAt: now,
      })
      .where(eq(userProfiles.userId, userId));
  }

  return NextResponse.json({
    affection: profile?.affection || 0,
    money: profile?.money || 0,
    unlockedChapters: story?.unlockedChapters || [0],
    itemsBrought: profile?.itemsBrought || [],
    accountDays: profile
      ? Math.floor((now.getTime() - new Date(profile.createdAt!).getTime()) / (1000 * 60 * 60 * 24))
      : 0,
    screenTimeHours: Math.floor((profile?.totalScreenTime || 0) / 3600),
    activeOutfit: profile?.activeOutfit || 'default',
    jobStats: profile?.jobStats || {},
    liviaStats: {
      hunger,
      energy,
      hydration,
      cycleAnchor: profile?.liviaCycleAnchor?.toISOString() || now.toISOString(),
    },
  });
});

export const PATCH = jsonApiHandler<{ delta?: unknown; reason?: unknown }>(
  {
    route: '/api/affection.PATCH',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak perubahan afeksi. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.delta !== 'number' || !Number.isFinite(body.delta)) {
      throw errors.badRequest('Field "delta" wajib berupa angka.', 'INVALID_DELTA');
    }

    const delta = Math.max(
      -MAX_AFFECTION_DELTA,
      Math.min(MAX_AFFECTION_DELTA, Math.trunc(body.delta))
    );

    const profileResults = await db
      .select({ affection: userProfiles.affection })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    const currentAffection = profileResults[0]?.affection || 0;
    const result = await applyAffectionUpdate(userId, currentAffection, delta);

    const updated = await db
      .update(userProfiles)
      .set({
        affection: result.newAffection,
        affectionLevel: result.affectionLevel,
        lastSeen: new Date(),
      })
      .where(eq(userProfiles.userId, userId))
      .returning({ id: userProfiles.id });

    if (updated.length === 0) {
      throw errors.notFound('Profil');
    }

    if (typeof body.reason === 'string') {
      logger.debug('Perubahan afeksi manual', {
        route: '/api/affection.PATCH',
        userId,
        delta,
        reason: body.reason.slice(0, 120),
      });
    }

    return NextResponse.json(result);
  }
);
