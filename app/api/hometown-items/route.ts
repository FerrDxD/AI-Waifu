import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ITEMS } from '@/lib/livia/items';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemsBrought } = await req.json();
    if (!Array.isArray(itemsBrought) || itemsBrought.length === 0) {
      return NextResponse.json({ error: 'Invalid items array.' }, { status: 400 });
    }

    const userId = session.user.id;
    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const currentItems = profile.itemsBrought || [];
    const newItems = [...currentItems, ...itemsBrought];
    
    const activeBuffs = newItems.map(id => ITEMS.find(i => i.id === id)?.buff?.id).filter(Boolean) as string[];
    const activeDebuffs = ITEMS
      .filter(i => !newItems.includes(i.id))
      .map(i => i.debuff.id);

    await db.update(userProfiles).set({
      itemsBrought: newItems,
      activeBuffs,
      activeDebuffs
    }).where(eq(userProfiles.userId, userId));

    return NextResponse.json({ success: true, activeBuffs, activeDebuffs });
  } catch (error) {
    console.error('Hometown Items API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
