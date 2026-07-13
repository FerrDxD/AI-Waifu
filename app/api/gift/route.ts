import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { shouldUnlockChapter } from '@/lib/livia/affection';
import { ITEMS } from '@/lib/livia/items';

const RECOVERY_STATS: Record<string, {hunger?: number, energy?: number, hydration?: number}> = {
  onigiri: { hunger: 15, energy: 5 },
  yakitori: { hunger: 20, energy: 10 },
  takoyaki: { hunger: 25, energy: 15 },
  dango: { hunger: 15, energy: 10 },
  katsudon: { hunger: 50, energy: 30 },
  sushi: { hunger: 40, energy: 20 },
  air_putih: { hydration: 30 },
  teh_hijau: { hydration: 25, energy: 10 },
  teh_hitam: { hydration: 20, energy: 15 },
  kopi_hitam: { hydration: 15, energy: 25 },
  jus_buah: { hydration: 30, energy: 10 },
  susu: { hydration: 30, hunger: 10 },
};

function calculateCycleDay(anchorString?: string | null): number {
  if (!anchorString) return 1;
  const anchorDate = new Date(anchorString);
  anchorDate.setHours(0, 0, 0, 0);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((nowDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
  return (daysDiff % 28 + 28) % 28 + 1;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = session.user.id;
    const body = await req.json();
    const { cost, affectionDelta } = body;

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];
    
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if ((profile.money || 0) < cost) {
      return NextResponse.json({ error: 'Not enough money' }, { status: 400 });
    }

    const oldAffection = profile.affection || 0;
    const newAffection = Math.min(100, oldAffection + affectionDelta);
    const newLevel = Math.floor(newAffection / 20);
    const newMoney = (profile.money || 0) - cost;

    const currentItems = profile.itemsBrought || [];
    let newItems = [...currentItems];
    if (body.id && !currentItems.includes(body.id) && !RECOVERY_STATS[body.id]) {
      newItems.push(body.id);
    }

    let newHunger = profile.liviaHunger ?? 100;
    let newEnergy = profile.liviaEnergy ?? 100;
    let newHydration = profile.liviaHydration ?? 100;

    if (body.id && RECOVERY_STATS[body.id]) {
      const isMenstruation = calculateCycleDay(profile.liviaCycleAnchor?.toISOString()) <= 5;
      const energyMultiplier = isMenstruation ? 0.2 : 1.0; // 80% reduced effectiveness during menstruation
      newHunger = Math.min(100, newHunger + (RECOVERY_STATS[body.id].hunger || 0));
      newEnergy = Math.min(100, newEnergy + Math.round((RECOVERY_STATS[body.id].energy || 0) * energyMultiplier));
      newHydration = Math.min(100, newHydration + (RECOVERY_STATS[body.id].hydration || 0));
    }

    // Recalculate buffs and debuffs based on the new items list
    const activeBuffs = newItems.map(id => ITEMS.find(i => i.id === id)?.buff?.id).filter(Boolean) as string[];
    let activeDebuffs = ITEMS
      .filter(i => !newItems.includes(i.id))
      .map(i => i.debuff.id);

    // Apply keychain buff if owned
    if (newItems.includes('keychain') && activeDebuffs.length > 0) {
      const randomIndex = Math.floor(Math.random() * activeDebuffs.length);
      activeDebuffs.splice(randomIndex, 1);
    }

    await db.update(userProfiles)
      .set({ 
        money: newMoney, 
        affection: newAffection,
        affectionLevel: newLevel,
        itemsBrought: newItems,
        activeBuffs,
        activeDebuffs,
        liviaHunger: newHunger,
        liviaEnergy: newEnergy,
        liviaHydration: newHydration
      })
      .where(eq(userProfiles.userId, userId));

    const unlockedChapter = shouldUnlockChapter(oldAffection, newAffection);
    let unlockedChapters = [0];

    if (unlockedChapter !== null) {
      const storyResults = await db.select().from(storyProgress).where(eq(storyProgress.userId, userId));
      const story = storyResults[0];
      if (story) {
        const chapters = new Set(story.unlockedChapters || []);
        chapters.add(unlockedChapter);
        unlockedChapters = Array.from(chapters);
        await db.update(storyProgress)
          .set({ unlockedChapters })
          .where(eq(storyProgress.userId, userId));
      } else {
        unlockedChapters = [0, unlockedChapter];
        await db.insert(storyProgress).values({
          userId,
          unlockedChapters
        });
      }
    }

    return NextResponse.json({ success: true, newMoney, newAffection, unlockedChapter });
  } catch (error) {
    console.error('Gift API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
