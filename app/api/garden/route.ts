import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gardenPots, userProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { SEED_CATALOG } from '@/lib/livia/seeds';

export const dynamic = 'force-dynamic';

function calculateStageAndHydration(pot: any) {
  if (!pot.plantId || !pot.plantedAt) return pot;
  
  const seedInfo = SEED_CATALOG.find(s => s.id === pot.plantId);
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

  // Calculate hydration drop: -10% every 1 hour (60 mins)
  const wateredTime = pot.lastWateredAt ? new Date(pot.lastWateredAt).getTime() : plantedTime;
  const minsSinceWatered = Math.floor((now.getTime() - wateredTime) / 60000);
  let currentHydration = Math.max(0, 100 - Math.floor(minsSinceWatered / 60) * 10);

  // If harvested, hydration doesn't matter
  if (newStage === 'harvest') currentHydration = 0;

  return {
    ...pot,
    stage: newStage,
    hydration: currentHydration,
    timeLeft: Math.max(0, seedInfo.growTimeMinutes - minutesPassed)
  };
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = session.user.id;
    let pots = await db.select().from(gardenPots).where(eq(gardenPots.userId, userId));
    
    // If no pots exist, initialize 6 empty pots
    if (pots.length === 0) {
      const initialPots = Array.from({ length: 6 }).map((_, i) => ({
        userId,
        potIndex: i + 1,
        hydration: 0,
      }));
      await db.insert(gardenPots).values(initialPots);
      pots = await db.select().from(gardenPots).where(eq(gardenPots.userId, userId));
    }

    // Process real-time growth state
    const processedPots = pots.map(calculateStageAndHydration).sort((a, b) => a.potIndex - b.potIndex);
    
    // Update DB if stages changed
    for (const p of processedPots) {
      const original = pots.find(op => op.id === p.id);
      if (original?.stage !== p.stage) {
        await db.update(gardenPots)
          .set({ stage: p.stage, hydration: p.hydration })
          .where(eq(gardenPots.id, p.id));
      }
    }

    return NextResponse.json({ pots: processedPots });
  } catch (error) {
    console.error('Garden GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const body = await req.json();
    const { action, potId, plantId } = body;

    const [pot] = await db.select().from(gardenPots).where(and(eq(gardenPots.id, potId), eq(gardenPots.userId, userId)));
    if (!pot) return NextResponse.json({ error: 'Pot not found' }, { status: 404 });

    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

    const now = new Date();

    if (action === 'plant') {
      const seed = SEED_CATALOG.find(s => s.id === plantId);
      if (!seed) return NextResponse.json({ error: 'Invalid seed' }, { status: 400 });
      if ((profile.money || 0) < seed.cost) return NextResponse.json({ error: 'Not enough money' }, { status: 400 });

      // Deduct money
      await db.update(userProfiles).set({ money: (profile.money || 0) - seed.cost }).where(eq(userProfiles.userId, userId));
      
      // Plant seed
      await db.update(gardenPots).set({
        plantId: seed.id,
        stage: 'seed',
        plantedAt: now,
        lastWateredAt: now,
        hydration: 100
      }).where(eq(gardenPots.id, potId));
    } 
    else if (action === 'water') {
      await db.update(gardenPots).set({
        lastWateredAt: now,
        hydration: 100
      }).where(eq(gardenPots.id, potId));
    }
    else if (action === 'harvest') {
      const current = calculateStageAndHydration(pot);
      if (current.stage !== 'harvest') return NextResponse.json({ error: 'Not ready' }, { status: 400 });
      
      const seed = SEED_CATALOG.find(s => s.id === pot.plantId);
      
      const baseCost = seed?.cost || 100;
      const profit = Math.floor(baseCost * 1.45);
      
      let newAffection = profile.affection || 0;
      let newItemsBrought = profile.itemsBrought || [];

      if (seed?.yieldType === 'money_ingredient' && seed.ingredientId) {
        if (!newItemsBrought.includes(seed.ingredientId)) {
          newItemsBrought = [...newItemsBrought, seed.ingredientId];
        }
      } else {
        newAffection += 3;
      }
      
      await db.update(userProfiles).set({ 
        money: (profile.money || 0) + profit,
        affection: newAffection,
        itemsBrought: newItemsBrought
      }).where(eq(userProfiles.userId, userId));

      // Reset pot
      await db.update(gardenPots).set({
        plantId: null,
        stage: null,
        plantedAt: null,
        lastWateredAt: null,
        hydration: 0
      }).where(eq(gardenPots.id, potId));
    }

    revalidatePath('/garden');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Garden POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
