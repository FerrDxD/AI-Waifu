import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { ensureUnlockedChapters } from '@/lib/livia/affection.server';
import {
  newAffectionExpr,
  affectionLevelExpr,
  clampStatExpr,
  moneyMinusExpr,
  moneyAtLeastExpr,
} from '@/lib/livia/atomic-profile';
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

    const currentItems = profile.itemsBrought || [];
    if (!currentItems.includes('recipe_book') && !currentItems.includes('recipe_book_shop')) {
      throw new AppError(
        'RECIPE_BOOK_REQUIRED',
        'Kamu tidak memiliki Buku Resep Masakan!',
        403,
        true
      );
    }

    // M5.4 — atomik: `WHERE money >= cost` mencegah double-spend; semua delta
    // deterministik (dari resep + hasil mini-game) sehingga aman di-clamp di
    // level statement. Gagal mini-game = stat tidak naik, afeksi -2.
    const affectionChange = isFailed ? -2 : recipe.affectionDelta;
    const hungerDelta = isFailed ? 0 : recipe.hungerDelta;
    const energyDelta = isFailed ? 0 : recipe.energyDelta;

    const updated = await db
      .update(userProfiles)
      .set({
        money: moneyMinusExpr(recipe.cost),
        affection: newAffectionExpr(affectionChange),
        affectionLevel: affectionLevelExpr(affectionChange),
        liviaHunger: clampStatExpr(userProfiles.liviaHunger, hungerDelta),
        liviaEnergy: clampStatExpr(userProfiles.liviaEnergy, energyDelta),
        lastSeen: new Date(),
      })
      .where(and(eq(userProfiles.userId, userId), moneyAtLeastExpr(recipe.cost)))
      .returning({
        money: userProfiles.money,
        affection: userProfiles.affection,
        liviaHunger: userProfiles.liviaHunger,
        liviaEnergy: userProfiles.liviaEnergy,
      });

    if (updated.length === 0) {
      throw errors.badRequest(
        'Uang (Rv) tidak cukup untuk membeli bahan masakan ini!',
        'INSUFFICIENT_FUNDS'
      );
    }

    const newMoney = updated[0].money;
    const newHunger = updated[0].liviaHunger;
    const newEnergy = updated[0].liviaEnergy;
    const newAffection = updated[0].affection ?? 0;
    await ensureUnlockedChapters(userId, newAffection);

    return NextResponse.json({
      success: true,
      newMoney,
      newAffection,
      newHunger,
      newEnergy,
      recipeName: recipe.name,
      isFailed,
    });
  }
);
