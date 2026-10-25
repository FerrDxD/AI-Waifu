import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { RECIPES } from '@/lib/livia/recipes';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { AppError, errors } from '@/lib/errors';

/**
 * POST /api/kitchen — memasak lewat mini-game.
 *
 * Harga & efek resep SELALU dari katalog server (`lib/livia/recipes.ts`),
 * bukan dari body. Client hanya memilih `recipeId` dan hasil mini-game.
 */

type KitchenBody = {
  recipeId?: unknown;
  isFailed?: unknown;
};

export const POST = jsonApiHandler<KitchenBody>(
  {
    route: '/api/kitchen.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Dapur sedang ramai. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    const recipe =
      typeof body.recipeId === 'string' ? RECIPES.find((r) => r.id === body.recipeId) : undefined;

    if (!recipe) throw errors.badRequest('Resep tidak ditemukan.', 'UNKNOWN_RECIPE');

    const isFailed = body.isFailed === true;

    const profileResults = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];

    if (!profile) throw errors.notFound('Profil');

    const currentMoney = profile.money || 0;
    if (currentMoney < recipe.cost) {
      throw errors.badRequest(
        'Uang (Rv) tidak cukup untuk membeli bahan masakan ini!',
        'INSUFFICIENT_FUNDS'
      );
    }

    const currentItems = profile.itemsBrought || [];
    if (!currentItems.includes('recipe_book') && !currentItems.includes('recipe_book_shop')) {
      throw new AppError(
        'RECIPE_BOOK_REQUIRED',
        'Kamu tidak memiliki Buku Resep Masakan!',
        403,
        true
      );
    }

    const newMoney = currentMoney - recipe.cost;

    let newHunger = Math.min(100, (profile.liviaHunger || 100) + recipe.hungerDelta);
    let newEnergy = Math.min(100, (profile.liviaEnergy || 100) + recipe.energyDelta);
    let affectionChange = recipe.affectionDelta;

    if (isFailed) {
      // Mini-game gagal: tidak ada kenaikan stat, Livia kecewa.
      newHunger = profile.liviaHunger || 100;
      newEnergy = profile.liviaEnergy || 100;
      affectionChange = -2;
    }

    const updateResult = await applyAffectionUpdate(
      userId,
      profile.affection || 0,
      affectionChange
    );

    await db
      .update(userProfiles)
      .set({
        money: newMoney,
        liviaHunger: newHunger,
        liviaEnergy: newEnergy,
        affection: updateResult.newAffection,
        affectionLevel: updateResult.affectionLevel,
        lastSeen: new Date(),
      })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({
      success: true,
      newMoney,
      newAffection: updateResult.newAffection,
      newHunger,
      newEnergy,
      recipeName: recipe.name,
      isFailed,
    });
  }
);
