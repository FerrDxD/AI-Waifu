import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { ITEMS } from '@/lib/livia/items';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';

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

    if ((profile.money || 0) < cost) {
      throw errors.badRequest('Uang kamu tidak cukup untuk membeli ini.', 'INSUFFICIENT_FUNDS');
    }

    const {
      newAffection,
      affectionLevel: newLevel,
      unlockedChapter,
    } = await applyAffectionUpdate(userId, profile.affection || 0, affectionDelta);

    const newMoney = (profile.money || 0) - cost;

    const currentItems = profile.itemsBrought || [];
    const newItems = [...currentItems];
    const isRecoveryItem = itemId ? Boolean(RECOVERY_STATS[itemId]) : false;

    // Item konsumsi tidak masuk inventaris; hanya item permanen yang disimpan.
    if (itemId && !currentItems.includes(itemId) && !isRecoveryItem) {
      newItems.push(itemId);
    }

    let newHunger = profile.liviaHunger ?? 100;
    let newEnergy = profile.liviaEnergy ?? 100;
    let newHydration = profile.liviaHydration ?? 100;

    if (itemId && isRecoveryItem) {
      const stats = RECOVERY_STATS[itemId];
      const isMenstruation = calculateCycleDay(profile.liviaCycleAnchor?.toISOString()) <= 5;
      const energyMultiplier = isMenstruation ? 0.2 : 1.0; // 80% lebih lemah saat menstruasi
      newHunger = Math.min(100, newHunger + (stats.hunger || 0));
      newEnergy = Math.min(100, newEnergy + Math.round((stats.energy || 0) * energyMultiplier));
      newHydration = Math.min(100, newHydration + (stats.hydration || 0));
    }

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

    await db
      .update(userProfiles)
      .set({
        money: newMoney,
        affection: newAffection,
        affectionLevel: newLevel,
        itemsBrought: newItems,
        activeBuffs,
        activeDebuffs,
        liviaHunger: newHunger,
        liviaEnergy: newEnergy,
        liviaHydration: newHydration,
      })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({ success: true, newMoney, newAffection, unlockedChapter });
  }
);
