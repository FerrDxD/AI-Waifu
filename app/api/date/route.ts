import { NextResponse } from 'next/server';
import { generateDateDialogue } from '@/lib/gemini';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { location } = await req.json();
    
    const userResults = await db.select().from(users).where(eq(users.id, session.user.id));
    const user = userResults[0];

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id));
    const profile = profileResults[0];

    const now = new Date();
    const anchor = profile?.liviaCycleAnchor ? new Date(profile.liviaCycleAnchor).getTime() : now.getTime();
    const daysDiff = Math.floor((now.getTime() - anchor) / (1000 * 60 * 60 * 24));
    const dayOfCycle = (daysDiff % 28 + 28) % 28 + 1;
    let cyclePhase = 'Luteal';
    if (dayOfCycle <= 5) cyclePhase = 'Menstruasi';
    else if (dayOfCycle <= 14) cyclePhase = 'Folikuler';
    else if (dayOfCycle <= 17) cyclePhase = 'Ovulasi';

    let newHunger = profile?.liviaHunger ?? 100;
    let newEnergy = profile?.liviaEnergy ?? 100;

    if (location === 'Warung Ramen') {
      newHunger = Math.min(100, newHunger + 40);
      newEnergy = Math.min(100, newEnergy + 15);
      await db.update(userProfiles).set({ liviaHunger: newHunger, liviaEnergy: newEnergy }).where(eq(userProfiles.userId, session.user.id));
    } else if (location === 'Restoran Gyoza') {
      newHunger = Math.min(100, newHunger + 35);
      newEnergy = Math.min(100, newEnergy + 15);
      await db.update(userProfiles).set({ liviaHunger: newHunger, liviaEnergy: newEnergy }).where(eq(userProfiles.userId, session.user.id));
    }

    if (location.toLowerCase().includes('festival')) {
      const currentItems = profile?.itemsBrought || [];
      if (!currentItems.includes('visited_festival')) {
        await db.update(userProfiles).set({ itemsBrought: [...currentItems, 'visited_festival'] }).where(eq(userProfiles.userId, session.user.id));
      }
    }

    const dialogue = await generateDateDialogue(
      location, 
      profile?.affection || 0,
      user?.username || user?.name || 'Kamu',
      {
        hunger: profile?.liviaHunger ?? 100,
        energy: profile?.liviaEnergy ?? 100,
        hydration: profile?.liviaHydration ?? 100,
        cyclePhase,
        cycleDay: dayOfCycle
      }
    );

    return NextResponse.json({ scene: dialogue });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
