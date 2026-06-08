import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { shouldUnlockChapter } from '@/lib/livia/affection';

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

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const oldAffection = profile.affection || 0;
    const newAffectionRaw = oldAffection + delta;
    const newAffection = Math.max(0, Math.min(100, newAffectionRaw));
    const affectionLevel = Math.floor(newAffection / 20);

    await db.update(userProfiles)
      .set({ affection: newAffection, affectionLevel })
      .where(eq(userProfiles.userId, userId));

    const unlockedChapter = shouldUnlockChapter(oldAffection, newAffection);
    if (unlockedChapter !== null) {
      const storyResults = await db.select().from(storyProgress).where(eq(storyProgress.userId, userId));
      const story = storyResults[0];
      if (story) {
        const chapters = new Set(story.unlockedChapters || []);
        chapters.add(unlockedChapter);
        await db.update(storyProgress)
          .set({ unlockedChapters: Array.from(chapters) })
          .where(eq(storyProgress.userId, userId));
      }
    }

    return NextResponse.json({
      newAffection,
      affectionLevel,
      unlockedChapter
    });

  } catch (error) {
    console.error('Affection API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
