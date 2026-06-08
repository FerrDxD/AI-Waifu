import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { screenTimeLogs, userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, sessionId } = await req.json();
    const userId = session.user.id;
    const now = new Date();

    if (action === 'start') {
      const inserted = await db.insert(screenTimeLogs).values({
        userId,
        sessionStart: now,
        date: now.toISOString().split('T')[0],
      }).returning({ id: screenTimeLogs.id });
      
      return NextResponse.json({ sessionId: inserted[0].id });
    } 
    
    if (action === 'end' && sessionId) {
      const logResults = await db.select().from(screenTimeLogs).where(eq(screenTimeLogs.id, sessionId));
      const log = logResults[0];
      
      if (!log || !log.sessionStart) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const durationSeconds = Math.floor((now.getTime() - new Date(log.sessionStart).getTime()) / 1000);
      
      await db.update(screenTimeLogs)
        .set({ sessionEnd: now, durationSeconds })
        .where(eq(screenTimeLogs.id, sessionId));

      const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
      const profile = profileResults[0];
      const newTotal = (profile?.totalScreenTime || 0) + durationSeconds;

      await db.update(userProfiles)
        .set({ totalScreenTime: newTotal })
        .where(eq(userProfiles.userId, userId));

      return NextResponse.json({ totalToday: durationSeconds, totalAllTime: newTotal });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('ScreenTime API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
