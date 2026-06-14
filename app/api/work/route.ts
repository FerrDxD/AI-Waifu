import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = session.user.id;
    const body = await req.json();
    const { earnedRv, jobId } = body;
    
    if (typeof earnedRv !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const newMoney = (profile.money || 0) + earnedRv;
    
    const jobStats = (profile.jobStats as Record<string, number>) || {};
    if (earnedRv > 0 && jobId) {
      jobStats[jobId] = (jobStats[jobId] || 0) + 1;
    }
    
    await db.update(userProfiles)
      .set({ money: newMoney, jobStats })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({ success: true, newMoney, jobStats });
  } catch (error) {
    console.error('Work API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
