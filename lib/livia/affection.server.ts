import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { shouldUnlockChapter } from './affection';

export async function applyAffectionUpdate(userId: string, delta: number) {
  const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  const profile = profileResults[0];
  if (!profile) throw new Error('Profile not found');

  const oldAffection = profile.affection || 0;
  const newAffectionRaw = oldAffection + delta;
  const newAffection = Math.max(0, Math.min(100, newAffectionRaw));
  const affectionLevel = newAffection >= 100 ? 5 : Math.floor(newAffection / 20);

  await db.update(userProfiles)
    .set({ affection: newAffection, affectionLevel, lastSeen: new Date() })
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
    } else {
      await db.insert(storyProgress).values({
        userId: userId,
        unlockedChapters: [0, unlockedChapter]
      });
    }
  }

  return { newAffection, affectionLevel, unlockedChapter };
}
