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

    const dialogue = await generateDateDialogue(
      location, 
      profile?.affection || 0,
      user?.username || user?.name || 'Kamu'
    );

    return NextResponse.json({ scene: dialogue });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
