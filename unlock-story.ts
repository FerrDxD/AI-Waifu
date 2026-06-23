import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from './lib/db';
import { storyProgress, userProfiles } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const allUsers = await db.select().from(userProfiles);
  for (const user of allUsers) {
    const chapters = Array.from({length: 22}, (_, i) => i);
    await db.update(storyProgress)
      .set({ unlockedChapters: chapters })
      .where(eq(storyProgress.userId, user.userId));
  }
  console.log("Unlocked all 22 chapters for all users.");
  process.exit(0);
}
main();
