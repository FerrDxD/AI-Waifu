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

    const data = await req.json();
    const userId = session.user.id;

    const updatePayload: any = {};
    if (typeof data.affection === 'number') updatePayload.affection = Math.min(100, Math.max(0, data.affection));
    if (typeof data.money === 'number') updatePayload.money = Math.max(0, data.money);
    if (Array.isArray(data.itemsBrought)) updatePayload.itemsBrought = data.itemsBrought;
    if (typeof data.activeOutfit === 'string') updatePayload.activeOutfit = data.activeOutfit;
    if (data.jobStats && typeof data.jobStats === 'object') updatePayload.jobStats = data.jobStats;

    if (Object.keys(updatePayload).length > 0) {
      await db.update(userProfiles).set(updatePayload).where(eq(userProfiles.userId, userId));
    }

    return NextResponse.json({ success: true, message: 'Data berhasil dipulihkan!' });
  } catch (error) {
    console.error('Restore API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
