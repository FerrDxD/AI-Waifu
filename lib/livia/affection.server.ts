import { db } from '@/lib/db';
import { storyProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAffectionLevel, getUnlockedChapters } from './affection';

export async function applyAffectionUpdate(userId: string, currentAffection: number, delta: number) {
  const newAffection = Math.max(0, Math.min(100, (currentAffection || 0) + delta));
  const levelInfo = getAffectionLevel(newAffection);
  const affectionLevel = levelInfo.level;

  const newChapters = getUnlockedChapters(currentAffection, newAffection);
  const unlockedChapter = newChapters.length > 0 ? newChapters[newChapters.length - 1] : null;

  if (newChapters.length > 0) {
    try {
      const storyResults = await db.select().from(storyProgress).where(eq(storyProgress.userId, userId));
      const story = storyResults[0];
      if (story) {
        const chapters = new Set(story.unlockedChapters || [0]);
        newChapters.forEach(c => chapters.add(c));
        await db.update(storyProgress)
          .set({ unlockedChapters: Array.from(chapters) })
          .where(eq(storyProgress.userId, userId));
      } else {
        const chapters = new Set([0, ...newChapters]);
        await db.insert(storyProgress).values({
          userId,
          unlockedChapters: Array.from(chapters)
        });
      }
    } catch (err) {
      console.error('Failed to update story progress on level up:', err);
    }
  }

  return { newAffection, affectionLevel, unlockedChapter, unlockedChapters: newChapters };
}

