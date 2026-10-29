'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { mutationRateLimit } from '@/lib/rate-limit';
import {
  newAffectionExpr,
  affectionLevelExpr,
  clampStatExpr,
  moneyMinusExpr,
  moneyAtLeastExpr,
  moneyPlusExpr,
} from '@/lib/livia/atomic-profile';
import { applyAffectionAtomic, ensureUnlockedChapters } from '@/lib/livia/affection.server';
import { RECIPES } from '@/lib/livia/recipes';

/**
 * Server Actions (M5.2) — RPC layer untuk operasi state.
 *
 * Client memanggil action ini (bukan `fetch('/api/...')`): ter-tipe end-to-end,
 * tanpa boilerplate headers/JSON, dan otoritas tetap di server (reusing core
 * atomik M5.4 — `SET money = money ± ?`, `SET affection = clamp(affection+?)`,
 * guard `WHERE money >= cost`). REST hanya dipertahankan untuk yang TIDAK bisa
 * jadi action: streaming/SSE (chat, tts, date/chat) dan `navigator.sendBeacon`
 * (screentime-end saat beforeunload).
 *
 * Semua action mengembalikan `ActionResult<T>` (discriminated union) — BUKAN
 * throw — supaya kegagalan (uang kurang, rate limit, belum login) sampai ke
 * client dengan bentuk konsisten & aman. (AppError yang di-throw dari action
 * tidak dijamin terserialisasi utuh ke client.)
 *
 * Catatan utang: operasi state yang masih lewat REST karena logikanya memuat
 * state tambahan (bukan hanya profil) — garden (pot + stage), gift (buff/
 * recovery/keychain), date, schedule-khusus, settings, wardrobe, story, memory,
 * age-gate, privacy — mengikuti pola IDENTIK di sini dan akan dimigrasikan
 * bertahap.
 */

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string };

const MAX_AFFECTION_DELTA = 20;
const MAX_EARNED_RV = 1000;
const JOB_ID_PATTERN = /^[a-zA-Z0-9_]{1,64}$/;

type GuardResult = { userId: string } | { error: ActionResult<never> };

/** Auth + rate limit (per user). Kembalikan `{ userId }` atau `{ error }`. */
async function guard(message = 'Terlalu banyak permintaan. Tunggu sebentar ya.'): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: { ok: false, error: 'Sesi tidak valid. Silakan login ulang.', code: 'UNAUTHORIZED' } };
  }
  const userId = session.user.id;
  const rate = await mutationRateLimit.limit(`u:${userId}`);
  if (!rate.success) {
    return { error: { ok: false, error: message, code: 'RATE_LIMITED' } };
  }
  return { userId };
}

/**
 * +/− afeksi (clamp [0,100]) atomik + unlock chapter idempoten.
 * Mirip route `PATCH /api/affection`, tapi tanpa round-trip HTTP manual.
 */
export async function updateAffection(
  delta: number,
  reason?: string
): Promise<
  ActionResult<{ newAffection: number; affectionLevel: number; unlockedChapter: number | null }>
> {
  const g = await guard('Terlalu banyak perubahan afeksi. Tunggu sebentar ya.');
  if ('error' in g) return g.error;

  const d = Math.max(-MAX_AFFECTION_DELTA, Math.min(MAX_AFFECTION_DELTA, Math.trunc(Number(delta) || 0)));
  const result = await applyAffectionAtomic(g.userId, d);
  if (!result) return { ok: false, error: 'Profil tidak ditemukan.', code: 'NOT_FOUND' };
  void reason; // konteks untuk observability; tidak disimpan (route lama juga tidak)
  return {
    ok: true,
    data: {
      newAffection: result.newAffection,
      affectionLevel: result.affectionLevel,
      unlockedChapter: result.unlockedChapter,
    },
  };
}

/**
 * Klaim hasil kerja: `money = money + ?` + increment jobStats (jsonb) dalam satu
 * statement. Mirip route `POST /api/work`.
 */
export async function claimWork(
  earnedRv: number,
  jobId?: string
): Promise<ActionResult<{ newMoney: number | null; jobStats: Record<string, number> }>> {
  const g = await guard('Terlalu banyak aktivitas kerja. Istirahat sebentar ya.');
  if ('error' in g) return g.error;

  const amount = Math.max(0, Math.min(MAX_EARNED_RV, Math.trunc(Number(earnedRv) || 0)));
  const validJob = typeof jobId === 'string' && JOB_ID_PATTERN.test(jobId) ? jobId : null;

  const setClause: { money: ReturnType<typeof moneyPlusExpr>; jobStats?: unknown; lastSeen: Date } = {
    money: moneyPlusExpr(amount),
    lastSeen: new Date(),
  };
  if (amount > 0 && validJob) {
    setClause.jobStats = sql`
      COALESCE(${userProfiles.jobStats}, '{}') || jsonb_build_object(
        ${validJob},
        GREATEST(0, COALESCE((${userProfiles.jobStats}->>${validJob})::int, 0) + 1)
      )
    `;
  }

  const updated = await db
    .update(userProfiles)
    .set(setClause)
    .where(eq(userProfiles.userId, g.userId))
    .returning({ money: userProfiles.money, jobStats: userProfiles.jobStats });

  if (updated.length === 0) return { ok: false, error: 'Profil tidak ditemukan.', code: 'NOT_FOUND' };
  return {
    ok: true,
    data: { newMoney: updated[0].money, jobStats: (updated[0].jobStats as Record<string, number>) || {} },
  };
}

/**
 * Masak resep: harga & efek dari katalog server, `WHERE money >= cost` anti
 * double-spend, stat di-clamp. Mirip route `POST /api/cook`.
 */
export async function cookRecipe(
  recipeId: string,
  isMinigameFailed = false
): Promise<
  | {
      ok: true;
      data: { money: number | null; affection: number; expression: 'pain' | 'happy'; message: string };
    }
  | { ok: false; error: string; code: string }
> {
  const g = await guard('Dapur terlalu ramai. Tunggu sebentar ya.');
  if ('error' in g) return g.error;

  const recipe = RECIPES.find((item) => item.id === recipeId);
  if (!recipe) return { ok: false, error: 'Resep tidak dikenal.', code: 'UNKNOWN_RECIPE' };

  const affectionDelta = isMinigameFailed ? Math.floor(recipe.affectionDelta / 2) : recipe.affectionDelta;
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
    .where(and(eq(userProfiles.userId, g.userId), moneyAtLeastExpr(recipe.cost)))
    .returning({ money: userProfiles.money, affection: userProfiles.affection });

  if (updated.length === 0) {
    const exists = (
      await db
        .select({ money: userProfiles.money })
        .from(userProfiles)
        .where(eq(userProfiles.userId, g.userId))
    )[0];
    if (!exists) return { ok: false, error: 'Profil tidak ditemukan.', code: 'NOT_FOUND' };
    return {
      ok: false,
      error: `Uang kos kamu tidak cukup untuk ${recipe.name}. Butuh ${recipe.cost} Rv.`,
      code: 'INSUFFICIENT_FUNDS',
    };
  }

  const newMoney = updated[0].money;
  const newAffection = updated[0].affection ?? 0;
  await ensureUnlockedChapters(g.userId, newAffection);

  return {
    ok: true,
    data: {
      money: newMoney,
      affection: newAffection,
      expression: isMinigameFailed ? 'pain' : 'happy',
      message: isMinigameFailed
        ? `${recipe.name} jadi kurang matang, tapi Livia tetap menghabiskanmu. Dia bilang, "Yaa... lumayan lah. Lain kali jangan sambil main HP ya!"`
        : `${recipe.name} berhasil dimasak! Livia tersenyum puas. "Wah, wanginya sampai ke kamar aku!"`,
    },
  };
}
