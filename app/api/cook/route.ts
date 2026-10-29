import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { RECIPES } from '@/lib/livia/recipes';
import { ensureUnlockedChapters } from '@/lib/livia/affection.server';
import { getAffectionLevel, getUnlockedChapters } from '@/lib/livia/affection';
import { getActiveCharacter } from '@/lib/characters/switch';
import { assertFeature } from '@/lib/characters/gates';
import {
  newAffectionExpr,
  affectionLevelExpr,
  clampStatExpr,
  moneyMinusExpr,
  moneyAtLeastExpr,
} from '@/lib/livia/atomic-profile';

/**
 * POST /api/cook
 *
 * Aturan penting: **harga dan efek resep diambil dari katalog server**
 * (`lib/livia/recipes.ts`), bukan dari body request. Kalau client bisa mengirim
 * `cost` sendiri, siapa pun bisa memasak resep termahal dengan biaya 0.
 *
 * M5.4 — atomik: seluruh penyesuaian profil (uang, afeksi, lapar, energi) terjadi
 * dalam SATU statement `UPDATE`. Guard `WHERE money >= cost` mencegah
 * double-spend: dua request yang datang bersamaan tak bisa melewati guard setelah
 * yang pertama sudah mengurangi saldo. Clamp [0,100] di-`affection`/stat terjadi
 * di level statement, bukan dari snapshot client.
 */

type CookBody = {
  recipeId?: unknown;
  isLiviaCooking?: unknown;
  isMinigameFailed?: unknown;
};

export const POST = jsonApiHandler<CookBody>(
  {
    route: '/api/cook',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Dapur terlalu ramai. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    // M8.2 Phase B: memasak + statistik lapar/energi adalah sistem life-sim
    // milik Livia.
    const character = await getActiveCharacter(userId);
    assertFeature(character, 'lifeSim');

    if (typeof body.recipeId !== 'string') {
      throw errors.badRequest('Resep tidak dikenal.', 'UNKNOWN_RECIPE');
    }

    // Whitelist: hanya resep yang ada di katalog yang bisa dimasak.
    const recipe = RECIPES.find((item) => item.id === body.recipeId);
    if (!recipe) {
      throw errors.badRequest('Resep tidak dikenal.', 'UNKNOWN_RECIPE');
    }

    const isMinigameFailed = body.isMinigameFailed === true;

    // Gagal mini-game tetap menghasilkan masakan, tapi hasilnya lebih buruk.
    // Bukan hukuman finansial (uang tetap terpakai) — supaya tidak bisa di-spam.
    const affectionDelta = isMinigameFailed
      ? Math.floor(recipe.affectionDelta / 2)
      : recipe.affectionDelta;
    const hungerDelta = isMinigameFailed ? Math.floor(recipe.hungerDelta / 2) : recipe.hungerDelta;
    const energyDelta = isMinigameFailed ? Math.floor(recipe.energyDelta / 2) : recipe.energyDelta;

    const updated = await db
      .update(userProfiles)
      .set({
        money: moneyMinusExpr(recipe.cost),
        affection: newAffectionExpr(affectionDelta),
        affectionLevel: affectionLevelExpr(affectionDelta),
        liviaHunger: clampStatExpr(userProfiles.liviaHunger, hungerDelta),
        liviaEnergy: clampStatExpr(userProfiles.liviaEnergy, energyDelta),
        liviaStatsUpdatedAt: new Date(),
        lastSeen: new Date(),
      })
      .where(and(eq(userProfiles.userId, userId), moneyAtLeastExpr(recipe.cost)))
      .returning({ money: userProfiles.money, affection: userProfiles.affection });

    if (updated.length === 0) {
      // Guard gagal: profil tidak ada ATAU saldo tidak cukup.
      const profile = (
        await db
          .select({ money: userProfiles.money })
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId))
      )[0];
      if (!profile) throw errors.notFound('Profil');
      throw errors.badRequest(
        `Uang kos kamu tidak cukup untuk ${recipe.name}. Butuh ${recipe.cost} Rv.`,
        'INSUFFICIENT_FUNDS'
      );
    }

    const newMoney = updated[0].money;
    const newAffection = updated[0].affection ?? 0;
    await ensureUnlockedChapters(userId, newAffection, character);
    const level = getAffectionLevel(newAffection);
    const unlockedChapter = getUnlockedChapters(-1, newAffection).pop() ?? null;

    const message = isMinigameFailed
      ? `${recipe.name} jadi kurang matang, tapi ${character.shortName} tetap menghabiskanmu. Dia bilang, "Yaa... lumayan lah. Lain kali jangan sambil main HP ya!"`
      : `${recipe.name} berhasil dimasak! ${character.shortName} tersenyum puas. "Wah, wanginya sampai ke kamar aku!"`;

    return NextResponse.json({
      ok: true,
      money: newMoney,
      affection: newAffection,
      affectionLevel: level.level,
      unlockedChapter,
      expression: isMinigameFailed ? 'pain' : 'happy',
      message,
      recipe: { id: recipe.id, name: recipe.name, emoji: recipe.emoji },
    });
  }
);
