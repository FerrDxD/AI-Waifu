import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { applyAffectionAtomic } from '@/lib/livia/affection.server';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getActiveCharacter } from '@/lib/characters/switch';

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
  // M8.2 Phase B: profil yang dikembalikan adalah kondisi karakter AKTIF.
  // `characterId` diekspos supaya client tahu sprite/nama mana yang dipakai.
  const character = await getActiveCharacter(userId);

  const profileResults = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  const storyResults = await db
    .select()
    .from(storyProgress)
    .where(
      // Karakter tanpa bab cerita tidak pernah punya baris di sini.
      and(eq(storyProgress.userId, userId), eq(storyProgress.characterId, character.id))
    );

  const profile = profileResults[0];
  const story = storyResults[0];

  let hunger = profile?.liviaHunger ?? 100;
  let energy = profile?.liviaEnergy ?? 100;
  let hydration = profile?.liviaHydration ?? 100;
  const now = new Date();
  const lastUpdated = profile?.liviaStatsUpdatedAt ? new Date(profile.liviaStatsUpdatedAt) : now;
  const hoursPassed = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60));

  // Karakter tanpa sistem fisiologi (karakter companion) tidak punya decay.
  if (hoursPassed > 0 && profile && character.hasPhysiology) {
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
    characterId: character.id,
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

    // M5.4: penjumlahan + clamp terjadi dalam satu statement UPDATE atomik
    // (affection + delta, dibatasi [0,100]) — update yang bersaing tidak lagi
    // saling menimpa. Level & unlock chapter dihitung dari nilai hasil.
    const result = await applyAffectionAtomic(userId, delta, await getActiveCharacter(userId));
    if (!result) {
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
