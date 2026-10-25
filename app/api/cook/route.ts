import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { RECIPES } from '@/lib/livia/recipes';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';

/**
 * POST /api/cook
 *
 * Sebelumnya client (`kitchen/page.tsx`) memanggil endpoint ini padahal route-nya
 * tidak ada, jadi memasak selalu gagal dengan pesan generik.
 *
 * Aturan penting: **harga dan efek resep diambil dari katalog server**
 * (`lib/livia/recipes.ts`), bukan dari body request. Kalau client bisa mengirim
 * `cost` sendiri, siapa pun bisa memasak resep termahal dengan biaya 0.
 */

type CookBody = {
  recipeId?: unknown;
  isLiviaCooking?: unknown;
  isMinigameFailed?: unknown;
};

function clampStat(value: number | null | undefined, delta: number): number {
  const base = typeof value === 'number' && Number.isFinite(value) ? value : 100;
  return Math.min(100, Math.max(0, base + delta));
}

export const POST = jsonApiHandler<CookBody>(
  {
    route: '/api/cook',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Dapur terlalu ramai. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.recipeId !== 'string') {
      throw errors.badRequest('Resep tidak dikenal.', 'UNKNOWN_RECIPE');
    }

    // Whitelist: hanya resep yang ada di katalog yang bisa dimasak.
    const recipe = RECIPES.find((item) => item.id === body.recipeId);
    if (!recipe) {
      throw errors.badRequest('Resep tidak dikenal.', 'UNKNOWN_RECIPE');
    }

    const isMinigameFailed = body.isMinigameFailed === true;

    const profileResults = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];

    if (!profile) {
      throw errors.notFound('Profil');
    }

    const money = profile.money ?? 0;
    if (money < recipe.cost) {
      throw errors.badRequest(
        `Uang kos kamu tidak cukup untuk ${recipe.name}. Butuh ${recipe.cost} Rv.`,
        'INSUFFICIENT_FUNDS'
      );
    }

    // Gagal mini-game tetap menghasilkan masakan, tapi hasilnya lebih buruk.
    // Bukan hukuman finansial (uang tetap terpakai) — supaya tidak bisa di-spam.
    const affectionDelta = isMinigameFailed
      ? Math.floor(recipe.affectionDelta / 2)
      : recipe.affectionDelta;
    const hungerDelta = isMinigameFailed ? Math.floor(recipe.hungerDelta / 2) : recipe.hungerDelta;
    const energyDelta = isMinigameFailed ? Math.floor(recipe.energyDelta / 2) : recipe.energyDelta;

    const affectionResult = await applyAffectionUpdate(
      userId,
      profile.affection ?? 0,
      affectionDelta
    );

    await db
      .update(userProfiles)
      .set({
        money: money - recipe.cost,
        affection: affectionResult.newAffection,
        affectionLevel: affectionResult.affectionLevel,
        liviaHunger: clampStat(profile.liviaHunger, hungerDelta),
        liviaEnergy: clampStat(profile.liviaEnergy, energyDelta),
        liviaStatsUpdatedAt: new Date(),
        lastSeen: new Date(),
      })
      .where(eq(userProfiles.userId, userId));

    const message = isMinigameFailed
      ? `${recipe.name} jadi kurang matang, tapi Livia tetap menghabiskanmu. Dia bilang, "Yaa... lumayan lah. Lain kali jangan sambil main HP ya!"`
      : `${recipe.name} berhasil dimasak! Livia tersenyum puas. "Wah, wanginya sampai ke kamar aku!"`;

    return NextResponse.json({
      ok: true,
      money: money - recipe.cost,
      affection: affectionResult.newAffection,
      affectionLevel: affectionResult.affectionLevel,
      unlockedChapter: affectionResult.unlockedChapter,
      expression: isMinigameFailed ? 'pain' : 'happy',
      message,
      recipe: { id: recipe.id, name: recipe.name, emoji: recipe.emoji },
    });
  }
);
