import { NextResponse } from 'next/server';
import { generateDateResponse } from '@/lib/gemini';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { location, message, history } = await req.json();
    
    const userResults = await db.select().from(users).where(eq(users.id, session.user.id));
    const user = userResults[0];

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id));
    const profile = profileResults[0];

    const { reply, expression, affectionDelta } = await generateDateResponse(
      location, 
      message,
      history || [],
      profile?.affection || 0,
      user?.username || user?.name || 'Kamu'
    );

    // Update affection if there is a delta
    let updateResult: { newAffection: number | undefined | null; affectionLevel?: number; unlockedChapter: number | null } = { newAffection: profile?.affection, unlockedChapter: null };
    if (affectionDelta !== 0 && profile) {
      updateResult = await applyAffectionUpdate(session.user.id, affectionDelta);
    }

    return NextResponse.json({ reply, expression, affectionDelta, newAffection: updateResult.newAffection, unlockedChapter: updateResult.unlockedChapter });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
