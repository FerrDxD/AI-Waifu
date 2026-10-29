import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';

const OUTFIT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export const GET = apiHandler({ route: '/api/outfit.GET' }, async ({ userId }) => {
  const profileResults = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  const profile = profileResults[0];

  if (!profile) throw errors.notFound('Profil');

  return NextResponse.json({
    activeOutfit: profile.activeOutfit,
    itemsBrought: profile.itemsBrought,
  });
});

type OutfitBody = {
  outfitId?: unknown;
};

export const POST = jsonApiHandler<OutfitBody>(
  {
    route: '/api/outfit.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak ganti baju. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.outfitId !== 'string' || !OUTFIT_ID_PATTERN.test(body.outfitId)) {
      throw errors.badRequest('Outfit tidak valid.', 'INVALID_OUTFIT');
    }
    const outfitId = body.outfitId;

    const profileResults = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];

    if (!profile) throw errors.notFound('Profil');

    if (outfitId !== 'default' && !(profile.itemsBrought || []).includes(outfitId)) {
      throw errors.badRequest('Kamu belum memiliki outfit ini.', 'OUTFIT_NOT_OWNED');
    }

    await db
      .update(userProfiles)
      .set({ activeOutfit: outfitId })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({ success: true, activeOutfit: outfitId });
  }
);
