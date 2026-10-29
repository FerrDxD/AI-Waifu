import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { ensureUnlockedChapters } from '@/lib/livia/affection.server';
import { getUnlockedChapters } from '@/lib/livia/affection';
import {
  newAffectionExpr,
  affectionLevelExpr,
  clampStatExpr,
  moneyMinusExpr,
  moneyAtLeastExpr,
} from '@/lib/livia/atomic-profile';
import { ITEMS } from '@/lib/livia/items';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { getActiveCharacter } from '@/lib/characters/switch';
import { assertFeature } from '@/lib/characters/gates';

const RECOVERY_STATS: Record<string, { hunger?: number; energy?: number; hydration?: number }> = {
  onigiri: { hunger: 15, energy: 5 },
  yakitori: { hunger: 20, energy: 10 },
  takoyaki: { hunger: 25, energy: 15 },
  dango: { hunger: 15, energy: 10 },
  katsudon: { hunger: 50, energy: 30 },
  sushi: { hunger: 40, energy: 20 },
  air_putih: { hydration: 30 },
  teh_hijau: { hydration: 25, energy: 10 },
  teh_hitam: { hydration: 20, energy: 15 },
  kopi_hitam: { hydration: 15, energy: 25 },
  jus_buah: { hydration: 30, energy: 10 },
  susu: { hydration: 30, hunger: 10 },
};

/** Batas perubahan afeksi per pembelian — client tidak boleh menentukan lebih. */
const MAX_AFFECTION_DELTA = 30;
/** Batas harga wajar per item; mencegah angka absurd merusak state. */
const MAX_ITEM_COST = 100_000;

function calculateCycleDay(anchorString?: string | null): number {
  if (!anchorString) return 1;
  const anchorDate = new Date(anchorString);
  anchorDate.setHours(0, 0, 0, 0);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((nowDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
  return (((daysDiff % 28) + 28) % 28) + 1;
}

type GiftBody = {
  id?: unknown;
  cost?: unknown;
  affectionDelta?: unknown;
};

export const POST = jsonApiHandler<GiftBody>(
  {
    route: '/api/gift.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak transaksi. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    // M8.2 Phase B: toko hadiah & pemulihan statistik adalah sistem life-sim
    // milik Livia. Karakter companion tidak punya konten ini.
    const character = await getActiveCharacter(userId);
    assertFeature(character, 'lifeSim');

    // CATATAN (M5.4): harga & afeksi masih dikirim client karena katalog toko
    // (`app/(main)/shop/page.tsx`) belum punya padanan server. Yang bisa
    // diamankan sekarang: tipe, rentang, dan daftar item.
    const itemId =
      typeof body.id === 'string' && /^[a-zA-Z0-9_]{1,64}$/.test(body.id) ? body.id : undefined;

    const cost = Math.min(
      MAX_ITEM_COST,
      Math.max(0, Math.trunc(Number(body.cost) || 0))
    );
    const affectionDelta = Math.max(
      -MAX_AFFECTION_DELTA,
      Math.min(Math.trunc(Number(body.affectionDelta) || 0), MAX_AFFECTION_DELTA)
    );

    const profileResults = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];

    if (!profile) throw errors.notFound('Profil');

    const currentItems = profile.itemsBrought || [];
    const newItems = [...currentItems];
    const isRecoveryItem = itemId ? Boolean(RECOVERY_STATS[itemId]) : false;

    // Item konsumsi tidak masuk inventaris; hanya item permanen yang disimpan.
    if (itemId && !currentItems.includes(itemId) && !isRecoveryItem) {
      newItems.push(itemId);
    }

    // Delta stat pemulihan deterministik (dari itemId + fase siklus snapshot),
    // jadi aman di-apply secara atomik: `clamp(stat + delta)`.
    const isMenstruation = calculateCycleDay(profile.liviaCycleAnchor?.toISOString()) <= 5;
    const energyMultiplier = isMenstruation ? 0.2 : 1.0; // 80% lebih lemah saat menstruasi
    const stats = itemId && isRecoveryItem ? RECOVERY_STATS[itemId] : {};
    const hungerDelta = stats.hunger || 0;
    const energyDelta = Math.round((stats.energy || 0) * energyMultiplier);
    const hydrationDelta = stats.hydration || 0;

    // Hitung ulang buff/debuff berdasarkan daftar item terbaru.
    const activeBuffs = newItems
      .map((id) => ITEMS.find((i) => i.id === id)?.buff?.id)
      .filter(Boolean) as string[];
    const activeDebuffs = ITEMS.filter((i) => !newItems.includes(i.id)).map((i) => i.debuff.id);

    // Keychain membatalkan satu debuff acak.
    if (newItems.includes('keychain') && activeDebuffs.length > 0) {
      const randomIndex = Math.floor(Math.random() * activeDebuffs.length);
      activeDebuffs.splice(randomIndex, 1);
    }

    // M5.4 — atomik: `WHERE money >= cost` mencegah double-spend; money &
    // affection & stat di-update dari kolom lama + delta dalam satu statement.
    const updated = await db
      .update(userProfiles)
      .set({
        money: moneyMinusExpr(cost),
        affection: newAffectionExpr(affectionDelta),
        affectionLevel: affectionLevelExpr(affectionDelta),
        itemsBrought: newItems,
        activeBuffs,
        activeDebuffs,
        liviaHunger: clampStatExpr(userProfiles.liviaHunger, hungerDelta),
        liviaEnergy: clampStatExpr(userProfiles.liviaEnergy, energyDelta),
        liviaHydration: clampStatExpr(userProfiles.liviaHydration, hydrationDelta),
      })
      .where(and(eq(userProfiles.userId, userId), moneyAtLeastExpr(cost)))
      .returning({ money: userProfiles.money, affection: userProfiles.affection });

    if (updated.length === 0) {
      const exists = (
        await db
          .select({ money: userProfiles.money })
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId))
      )[0];
      if (!exists) throw errors.notFound('Profil');
      throw errors.badRequest('Uang kamu tidak cukup untuk membeli ini.', 'INSUFFICIENT_FUNDS');
    }

    const newMoney = updated[0].money;
    const newAffection = updated[0].affection ?? 0;
    await ensureUnlockedChapters(userId, newAffection, character);
    const unlockedChapter = getUnlockedChapters(-1, newAffection).pop() ?? null;

    return NextResponse.json({ success: true, newMoney, newAffection, unlockedChapter });
  }
);
