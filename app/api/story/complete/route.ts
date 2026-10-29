import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { storyProgress } from '@/lib/db/schema';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { getActiveCharacter } from '@/lib/characters/switch';
import { assertFeature } from '@/lib/characters/gates';

/** Batas atas chapterId — mencegah client membuka chapter 99999. */
const MAX_CHAPTER_ID = 100;

type StoryCompleteBody = {
  chapterId?: unknown;
};

export const POST = jsonApiHandler<StoryCompleteBody>(
  {
    route: '/api/story/complete.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak permintaan. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    // M8.2 Phase B: bab cerita hanya dimiliki Livia; progresnya dipartisi
    // per karakter.
    const character = await getActiveCharacter(userId);
    assertFeature(character, 'story');

    const chapterId = body.chapterId;
    if (
      typeof chapterId !== 'number' ||
      !Number.isInteger(chapterId) ||
      chapterId < 0 ||
      chapterId > MAX_CHAPTER_ID
    ) {
      throw errors.badRequest('chapterId tidak valid.', 'INVALID_CHAPTER');
    }

    const storyResults = await db
      .select()
      .from(storyProgress)
      .where(
        and(eq(storyProgress.userId, userId), eq(storyProgress.characterId, character.id))
      );
    const story = storyResults[0];

    if (!story) throw errors.notFound('Progres cerita');

    const currentUnlocked = story.unlockedChapters || [0];
    const nextChapter = chapterId + 1;

    if (!currentUnlocked.includes(nextChapter)) {
      const newUnlocked = [...currentUnlocked, nextChapter].sort((a, b) => a - b);
      await db
        .update(storyProgress)
        .set({ unlockedChapters: newUnlocked })
        .where(
          and(eq(storyProgress.userId, userId), eq(storyProgress.characterId, character.id))
        );

      return NextResponse.json({ success: true, unlockedChapters: newUnlocked });
    }

    return NextResponse.json({ success: true, unlockedChapters: currentUnlocked });
  }
);
