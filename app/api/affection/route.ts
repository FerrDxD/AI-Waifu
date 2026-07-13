import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';

export const dynamic = 'force-dynamic';

function calculateCycleDay(anchorString?: string | null): number {
  if (!anchorString) return 1;
  const anchorDate = new Date(anchorString);
  anchorDate.setHours(0, 0, 0, 0);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((nowDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
  return (daysDiff % 28 + 28) % 28 + 1;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = session.user.id;
    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    const storyResults = await db.select().from(storyProgress).where(eq(storyProgress.userId, userId));
    
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

      hunger = Math.max(0, hunger - (hoursPassed * hungerRate));
      energy = Math.max(0, energy - (hoursPassed * energyRate));
      hydration = Math.max(0, hydration - (hoursPassed * hydrationRate));

      await db.update(userProfiles).set({
        liviaHunger: hunger,
        liviaEnergy: energy,
        liviaHydration: hydration,
        liviaStatsUpdatedAt: now
      }).where(eq(userProfiles.userId, userId));
    }

    return NextResponse.json({
      affection: profile?.affection || 0,
      money: profile?.money || 0,
      unlockedChapters: story?.unlockedChapters || [0],
      itemsBrought: profile?.itemsBrought || [],
      accountDays: profile ? Math.floor((now.getTime() - new Date(profile.createdAt!).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      screenTimeHours: Math.floor((profile?.totalScreenTime || 0) / 3600),
      activeOutfit: profile?.activeOutfit || 'default',
      jobStats: profile?.jobStats || {},
      liviaStats: {
        hunger,
        energy,
        hydration,
        cycleAnchor: profile?.liviaCycleAnchor?.toISOString() || now.toISOString()
      }
    });
  } catch (error) {
    console.error('Affection GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { delta, reason } = await req.json();
    if (typeof delta !== 'number') {
      return NextResponse.json({ error: 'Invalid delta' }, { status: 400 });
    }

    const userId = session.user.id;

    const result = await applyAffectionUpdate(userId, delta);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Affection API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
