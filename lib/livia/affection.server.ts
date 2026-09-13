import { db } from '@/lib/db';
import { storyProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { shouldUnlockChapter } from './affection';

export async function applyAffectionUpdate(userId: string, currentAffection: number, delta: number) {
  const newAffectionRaw = currentAffection + delta;
  const newAffection = Math.max(0, Math.min(100, newAffectionRaw));
  const affectionLevel = newAffection >= 100 ? 5 : Math.floor(newAffection / 20);

  const unlockedChapter = shouldUnlockChapter(currentAffection, newAffection);
  if (unlockedChapter !== null) {
    const storyResults = await db.select().from(storyProgress).where(eq(storyProgress.userId, userId));
    const story = storyResults[0];
    if (story) {
      const chapters = new Set(story.unlockedChapters || []);
      chapters.add(unlockedChapter);
      await db.update(storyProgress)
        .set({ unlockedChapters: Array.from(chapters) })
        .where(eq(storyProgress.userId, userId));
    } else {
      await db.insert(storyProgress).values({
        userId: userId,
        unlockedChapters: [0, unlockedChapter]
      });
    }
  }

  return { newAffection, affectionLevel, unlockedChapter };
}
