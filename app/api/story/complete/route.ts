import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { storyProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chapterId } = await req.json();
    if (typeof chapterId !== 'number') {
      return NextResponse.json({ error: 'Invalid chapterId' }, { status: 400 });
    }

    const userId = session.user.id;
    const storyResults = await db.select().from(storyProgress).where(eq(storyProgress.userId, userId));
    const story = storyResults[0];

    if (!story) {
      return NextResponse.json({ error: 'Story progress not found' }, { status: 404 });
    }

    const currentUnlocked = story.unlockedChapters || [0];
    const nextChapter = chapterId + 1;

    // Add next chapter to unlocked array if not present
    if (!currentUnlocked.includes(nextChapter)) {
      const newUnlocked = [...currentUnlocked, nextChapter].sort((a, b) => a - b);
      await db.update(storyProgress)
        .set({ unlockedChapters: newUnlocked })
        .where(eq(storyProgress.userId, userId));
        
      return NextResponse.json({ success: true, unlockedChapters: newUnlocked });
    }

    return NextResponse.json({ success: true, unlockedChapters: currentUnlocked });

  } catch (error) {
    console.error('Story Complete API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
