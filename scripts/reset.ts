
import { db } from '../lib/db/index';
import { userProfiles, storyProgress } from '../lib/db/schema';

async function reset() {
  await db.update(userProfiles).set({ affection: 0, affectionLevel: 0, money: 0 });
  await db.update(storyProgress).set({ unlockedChapters: [0] });
  console.log('Progress reset successfully');
  process.exit(0);
}

reset();
