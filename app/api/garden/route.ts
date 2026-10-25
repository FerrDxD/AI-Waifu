import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gardenPots, userProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { SEED_CATALOG } from '@/lib/livia/seeds';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';

export const dynamic = 'force-dynamic';

type GardenPot = typeof gardenPots.$inferSelect;

/** Pot + hasil hitung pertumbuhan real-time (tidak disimpan apa adanya). */
type PotWithGrowth = GardenPot & { timeLeft?: number };

function calculateStageAndHydration(pot: GardenPot): PotWithGrowth {
  if (!pot.plantId || !pot.plantedAt) return pot;

  const seedInfo = SEED_CATALOG.find((s) => s.id === pot.plantId);
  if (!seedInfo) return pot;

  const now = new Date();
  const plantedTime = new Date(pot.plantedAt).getTime();
  const minutesPassed = Math.floor((now.getTime() - plantedTime) / 60000);

  let newStage = 'seed';
  const third = seedInfo.growTimeMinutes / 3;
  if (minutesPassed >= seedInfo.growTimeMinutes) {
    newStage = 'harvest';
  } else if (minutesPassed >= third * 2) {
    newStage = 'growing';
  } else if (minutesPassed >= third) {
    newStage = 'sprout';
  }

  // Hydration turun 10% per jam sejak terakhir disiram.
  const wateredTime = pot.lastWateredAt ? new Date(pot.lastWateredAt).getTime() : plantedTime;
  const minsSinceWatered = Math.floor((now.getTime() - wateredTime) / 60000);
  let currentHydration = Math.max(0, 100 - Math.floor(minsSinceWatered / 60) * 10);

  // Kalau sudah siap panen, hidrasi tidak relevan lagi.
  if (newStage === 'harvest') currentHydration = 0;

  return {
    ...pot,
    stage: newStage,
    hydration: currentHydration,
    timeLeft: Math.max(0, seedInfo.growTimeMinutes - minutesPassed),
  };
}

export const GET = apiHandler({ route: '/api/garden.GET' }, async ({ userId }) => {
  let pots = await db.select().from(gardenPots).where(eq(gardenPots.userId, userId));

  // Kalau belum punya pot, buat 6 pot kosong.
  if (pots.length === 0) {
    const initialPots = Array.from({ length: 6 }).map((_, i) => ({
      userId,
      potIndex: i + 1,
      hydration: 0,
    }));
    await db.insert(gardenPots).values(initialPots);
    pots = await db.select().from(gardenPots).where(eq(gardenPots.userId, userId));
  }

  const processedPots = pots
    .map(calculateStageAndHydration)
    .sort((a, b) => a.potIndex - b.potIndex);

  // Sinkronkan stage/hydration ke DB hanya kalau berubah.
  for (const p of processedPots) {
    const original = pots.find((op) => op.id === p.id);
    if (original?.stage !== p.stage) {
      await db
        .update(gardenPots)
        .set({ stage: p.stage, hydration: p.hydration })
        .where(eq(gardenPots.id, p.id));
    }
  }

  return NextResponse.json({ pots: processedPots });
});

type GardenBody = {
  action?: unknown;
  potId?: unknown;
  plantId?: unknown;
};

const GARDEN_ACTIONS = ['plant', 'water', 'harvest'] as const;

export const POST = jsonApiHandler<GardenBody>(
  {
    route: '/api/garden.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Kebun sedang sibuk. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    const action = typeof body.action === 'string' ? body.action : '';
    if (!GARDEN_ACTIONS.includes(action as (typeof GARDEN_ACTIONS)[number])) {
      throw errors.badRequest('Aksi kebun tidak dikenal.', 'INVALID_ACTION');
    }

    if (typeof body.potId !== 'string' || body.potId.length === 0) {
      throw errors.badRequest('Pot tidak dikenal.', 'INVALID_POT');
    }
    const potId = body.potId;

    // Filter userId di query: pot milik orang lain tidak boleh disentuh.
    const [pot] = await db
      .select()
      .from(gardenPots)
      .where(and(eq(gardenPots.id, potId), eq(gardenPots.userId, userId)));
    if (!pot) throw errors.notFound('Pot');

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    if (!profile) throw errors.notFound('Profil');

    const now = new Date();

    if (action === 'plant') {
      const seed = typeof body.plantId === 'string'
        ? SEED_CATALOG.find((s) => s.id === body.plantId)
        : undefined;
      if (!seed) throw errors.badRequest('Bibit tidak dikenal.', 'INVALID_SEED');

      if ((profile.money || 0) < seed.cost) {
        throw errors.badRequest('Uang kamu tidak cukup untuk membeli bibit ini.', 'INSUFFICIENT_FUNDS');
      }

      await db
        .update(userProfiles)
        .set({ money: (profile.money || 0) - seed.cost })
        .where(eq(userProfiles.userId, userId));

      await db
        .update(gardenPots)
        .set({
          plantId: seed.id,
          stage: 'seed',
          plantedAt: now,
          lastWateredAt: now,
          hydration: 100,
        })
        .where(eq(gardenPots.id, potId));
    } else if (action === 'water') {
      await db
        .update(gardenPots)
        .set({ lastWateredAt: now, hydration: 100 })
        .where(eq(gardenPots.id, potId));
    } else {
      const current = calculateStageAndHydration(pot);
      if (current.stage !== 'harvest') {
        throw errors.badRequest('Tanaman ini belum siap dipanen.', 'NOT_READY');
      }

      const seed = SEED_CATALOG.find((s) => s.id === pot.plantId);
      const baseCost = seed?.cost || 100;
      const profit = Math.floor(baseCost * 1.45);

      let newAffection = profile.affection || 0;
      let newLevel = profile.affectionLevel || 0;
      let newItemsBrought = profile.itemsBrought || [];

      if (seed?.yieldType === 'money_ingredient' && seed.ingredientId) {
        if (!newItemsBrought.includes(seed.ingredientId)) {
          newItemsBrought = [...newItemsBrought, seed.ingredientId];
        }
      } else {
        const affRes = await applyAffectionUpdate(userId, profile.affection || 0, 3);
        newAffection = affRes.newAffection;
        newLevel = affRes.affectionLevel;
      }

      await db
        .update(userProfiles)
        .set({
          money: (profile.money || 0) + profit,
          affection: newAffection,
          affectionLevel: newLevel,
          itemsBrought: newItemsBrought,
        })
        .where(eq(userProfiles.userId, userId));

      await db
        .update(gardenPots)
        .set({
          plantId: null,
          stage: null,
          plantedAt: null,
          lastWateredAt: null,
          hydration: 0,
        })
        .where(eq(gardenPots.id, potId));
    }

    revalidatePath('/garden');
    return NextResponse.json({ success: true });
  }
);
