import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { ITEMS } from '@/lib/livia/items';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';

/**
 * POST /api/hometown-items — item yang dibawa dari kampung halaman.
 *
 * Daftar item berasal dari cerita (bukan katalog `ITEMS`), jadi tidak bisa
 * di-whitelist ke katalog. Yang divalidasi: bentuk array, tipe, panjang, dan
 * pola id — supaya payload aneh tidak masuk ke kolom `itemsBrought`.
 */

const MAX_ITEMS = 10;
const ITEM_ID_PATTERN = /^[a-zA-Z0-9_]{1,64}$/;

type HometownBody = {
  itemsBrought?: unknown;
};

export const POST = jsonApiHandler<HometownBody>(
  {
    route: '/api/hometown-items.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak perubahan item. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    if (!Array.isArray(body.itemsBrought) || body.itemsBrought.length === 0) {
      throw errors.badRequest('Daftar item tidak valid.', 'INVALID_ITEMS');
    }

    if (body.itemsBrought.length > MAX_ITEMS) {
      throw errors.badRequest(`Maksimal ${MAX_ITEMS} item.`, 'TOO_MANY_ITEMS');
    }

    const incoming: string[] = [];
    for (const raw of body.itemsBrought) {
      if (typeof raw !== 'string' || !ITEM_ID_PATTERN.test(raw)) {
        throw errors.badRequest('Ada id item yang tidak valid.', 'INVALID_ITEM_ID');
      }
      if (!incoming.includes(raw)) incoming.push(raw);
    }

    const profileResults = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];
    if (!profile) throw errors.notFound('Profil');

    const currentItems = profile.itemsBrought || [];
    const newItems = [...currentItems];
    for (const id of incoming) {
      if (!newItems.includes(id)) newItems.push(id);
    }

    const activeBuffs = newItems
      .map((id) => ITEMS.find((i) => i.id === id)?.buff?.id)
      .filter(Boolean) as string[];
    const activeDebuffs = ITEMS.filter((i) => !newItems.includes(i.id)).map((i) => i.debuff.id);

    if (newItems.includes('keychain') && activeDebuffs.length > 0) {
      const randomIndex = Math.floor(Math.random() * activeDebuffs.length);
      activeDebuffs.splice(randomIndex, 1);
    }

    await db
      .update(userProfiles)
      .set({ itemsBrought: newItems, activeBuffs, activeDebuffs })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({ success: true, activeBuffs, activeDebuffs });
  }
);
