import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Wake up fully
    await db.update(userProfiles)
      .set({ liviaEnergy: 100, liviaStatsUpdatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({ success: true, liviaEnergy: 100 });
  } catch (error) {
    console.error('Failed to sleep', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
