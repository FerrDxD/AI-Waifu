import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { ITEMS } from '@/lib/livia/items';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';

const MAX_ONBOARDING_ITEMS = 5;

type OnboardingBody = {
  itemsBrought?: unknown;
};

export const POST = jsonApiHandler<OnboardingBody>(
  {
    route: '/api/onboarding.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak permintaan. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    if (!Array.isArray(body.itemsBrought)) {
      throw errors.badRequest(`Item tidak valid. Maksimal ${MAX_ONBOARDING_ITEMS} item.`, 'INVALID_ITEMS');
    }

    if (body.itemsBrought.length > MAX_ONBOARDING_ITEMS) {
      throw errors.badRequest(`Item tidak valid. Maksimal ${MAX_ONBOARDING_ITEMS} item.`, 'INVALID_ITEMS');
    }

    const itemsBrought: string[] = [];
    for (const raw of body.itemsBrought) {
      if (typeof raw !== 'string' || !ITEMS.some((item) => item.id === raw)) {
        throw errors.badRequest('Ada id item yang tidak valid.', 'INVALID_ITEM_ID');
      }
      if (!itemsBrought.includes(raw)) itemsBrought.push(raw);
    }

    const activeBuffs = itemsBrought.map(
      (id) => ITEMS.find((item) => item.id === id)!.buff.id
    );
    const activeDebuffs = ITEMS.filter((item) => !itemsBrought.includes(item.id)).map(
      (item) => item.debuff.id
    );

    if (itemsBrought.includes('keychain') && activeDebuffs.length > 0) {
      const randomIndex = Math.floor(Math.random() * activeDebuffs.length);
      activeDebuffs.splice(randomIndex, 1);
    }

    await db
      .update(userProfiles)
      .set({ itemsBrought, activeBuffs, activeDebuffs, onboardingDone: true })
      .where(eq(userProfiles.userId, userId));

    const existingStory = await db
      .select({ id: storyProgress.id })
      .from(storyProgress)
      .where(eq(storyProgress.userId, userId));

    if (existingStory.length === 0) {
      await db.insert(storyProgress).values({ userId, unlockedChapters: [0] });
    }

    return NextResponse.json({ success: true, activeBuffs, activeDebuffs });
  }
);
