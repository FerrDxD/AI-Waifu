import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = session.user.id;
    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    const storyResults = await db.select().from(storyProgress).where(eq(storyProgress.userId, userId));
    
    return NextResponse.json({
      affection: profileResults[0]?.affection || 0,
      money: profileResults[0]?.money || 0,
      unlockedChapters: storyResults[0]?.unlockedChapters || [0],
      itemsBrought: profileResults[0]?.itemsBrought || [],
      activeOutfit: profileResults[0]?.activeOutfit || 'default'
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
