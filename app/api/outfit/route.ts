import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id));
    const profile = profileResults[0];

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    return NextResponse.json({ activeOutfit: profile.activeOutfit, itemsBrought: profile.itemsBrought });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { outfitId } = await req.json();

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id));
    const profile = profileResults[0];

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    if (outfitId !== 'default' && (!profile.itemsBrought || !profile.itemsBrought.includes(outfitId))) {
      return NextResponse.json({ error: 'Outfit not owned' }, { status: 400 });
    }

    await db.update(userProfiles).set({ activeOutfit: outfitId }).where(eq(userProfiles.userId, session.user.id));

    return NextResponse.json({ success: true, activeOutfit: outfitId });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
