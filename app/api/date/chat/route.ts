import { NextResponse } from 'next/server';
import { generateDateResponse, extractCustomApiKey, extractLanguage } from '@/lib/gemini';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customApiKey = extractCustomApiKey(req);
    const language = extractLanguage(req);
    const { location, message, history } = await req.json();
    
    const userResults = await db.select().from(users).where(eq(users.id, session.user.id));
    const user = userResults[0];

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id));
    const profile = profileResults[0];

    const now = new Date();
    const anchor = profile?.liviaCycleAnchor ? new Date(profile.liviaCycleAnchor).getTime() : now.getTime();
    const daysDiff = Math.floor((now.getTime() - anchor) / (1000 * 60 * 60 * 24));
    const dayOfCycle = (daysDiff % 28 + 28) % 28 + 1;
    let cyclePhase = 'Luteal';
    if (dayOfCycle <= 5) cyclePhase = 'Menstruasi';
    else if (dayOfCycle <= 14) cyclePhase = 'Folikuler';
    else if (dayOfCycle <= 17) cyclePhase = 'Ovulasi';

    const { reply, expression, affectionDelta, memoryUpdate } = await generateDateResponse(
      location, 
      message,
      history || [],
      profile?.affection || 0,
      user?.username || user?.name || 'Kamu',
      {
        hunger: profile?.liviaHunger ?? 100,
        energy: profile?.liviaEnergy ?? 100,
        hydration: profile?.liviaHydration ?? 100,
        cyclePhase,
        cycleDay: dayOfCycle
      },
      profile?.longTermMemory || undefined,
      customApiKey,
      language
    );

    // Update affection if there is a delta, and update memory
    let updateResult: { newAffection: number | undefined | null; affectionLevel?: number; unlockedChapter: number | null } = { newAffection: profile?.affection, unlockedChapter: null };
    
    if (profile) {
      const updateData: any = { lastSeen: new Date() };
      if (memoryUpdate && memoryUpdate.trim() !== '') {
        updateData.longTermMemory = profile.longTermMemory ? profile.longTermMemory + '\n- ' + memoryUpdate : '- ' + memoryUpdate;
      }
      
      if (affectionDelta !== 0) {
        updateResult = await applyAffectionUpdate(session.user.id, affectionDelta);
        await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, session.user.id));
      } else {
        await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, session.user.id));
      }
    }

    return NextResponse.json({ reply, expression, affectionDelta, newAffection: updateResult.newAffection, unlockedChapter: updateResult.unlockedChapter });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
