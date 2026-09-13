import { NextResponse } from 'next/server';
import { generateDateDialogue, extractCustomApiKey, extractLanguage } from '@/lib/gemini';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customApiKey = extractCustomApiKey(req);
    const language = extractLanguage(req);
    const { location } = await req.json();
    
    const userName = (session.user as any)?.name || 'Kamu';
    
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
    let updatePayload: any = null;

    if (location === 'Warung Ramen') {
      newHunger = Math.min(100, newHunger + 40);
      newEnergy = Math.min(100, newEnergy + 15);
      updatePayload = { liviaHunger: newHunger, liviaEnergy: newEnergy };
    } else if (location === 'Restoran Gyoza') {
      newHunger = Math.min(100, newHunger + 35);
      newEnergy = Math.min(100, newEnergy + 15);
      updatePayload = { liviaHunger: newHunger, liviaEnergy: newEnergy };
    } else if (location === 'Food Court' || location === 'Pasar Malam') {
      newHunger = Math.min(100, newHunger + 25);
      newEnergy = Math.min(100, newEnergy + 10);
      updatePayload = { liviaHunger: newHunger, liviaEnergy: newEnergy };
    }

    if (location.toLowerCase().includes('festival')) {
      const currentItems = profile?.itemsBrought || [];
      if (!currentItems.includes('visited_festival')) {
        updatePayload = updatePayload || {};
        updatePayload.itemsBrought = [...currentItems, 'visited_festival'];
      }
    }

    if (updatePayload) {
      await db.update(userProfiles).set(updatePayload).where(eq(userProfiles.userId, session.user.id));
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
        cycleDay: dayOfCycle
      },
      customApiKey,
      language
    );

    return NextResponse.json({ scene: dialogue, timeOfDay });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
