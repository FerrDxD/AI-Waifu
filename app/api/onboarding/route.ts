import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ITEMS } from '@/lib/livia/items';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemsBrought } = await req.json();
    if (!Array.isArray(itemsBrought) || itemsBrought.length > 5) {
      return NextResponse.json({ error: 'Invalid items. Max 5 allowed.' }, { status: 400 });
    }

    const validItemIds = ITEMS.map(i => i.id);
    const isValid = itemsBrought.every(id => validItemIds.includes(id));
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid item ID present.' }, { status: 400 });
    }

    const activeBuffs = itemsBrought.map(id => ITEMS.find(i => i.id === id)!.buff.id);
    let activeDebuffs = ITEMS
      .filter(i => !itemsBrought.includes(i.id))
      .map(i => i.debuff.id);

    if (itemsBrought.includes('keychain') && activeDebuffs.length > 0) {
      const randomIndex = Math.floor(Math.random() * activeDebuffs.length);
      activeDebuffs.splice(randomIndex, 1);
    }

    const userId = session.user.id;

    await db.update(userProfiles).set({
      itemsBrought,
      activeBuffs,
      activeDebuffs,
      onboardingDone: true
    }).where(eq(userProfiles.userId, userId));

    const existingStory = await db.select().from(storyProgress).where(eq(storyProgress.userId, userId));
    if (existingStory.length === 0) {
      await db.insert(storyProgress).values({
        userId,
        unlockedChapters: [0]
      });
    }

    return NextResponse.json({ success: true, activeBuffs, activeDebuffs });
  } catch (error) {
    console.error('Onboarding API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
