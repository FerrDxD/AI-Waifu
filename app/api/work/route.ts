import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';

/**
 * POST /api/work — menyelesaikan pekerjaan dan menambah Rv.
 *
 * CATATAN (M5.4): `earnedRv` masih dihitung di client (`work/page.tsx`), jadi
 * bisa dimanipulasi. Saat ini hanya di-clamp 0..1000. Perbaikan sebenarnya
 * adalah katalog pekerjaan di server dengan durasi & upah tetap.
 */

const MAX_EARNED_RV = 1000;
const JOB_ID_PATTERN = /^[a-zA-Z0-9_]{1,64}$/;

type WorkBody = {
  earnedRv?: unknown;
  jobId?: unknown;
};

export const POST = jsonApiHandler<WorkBody>(
  {
    route: '/api/work.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak aktivitas kerja. Istirahat sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.earnedRv !== 'number' || !Number.isFinite(body.earnedRv)) {
      throw errors.badRequest('Upah tidak valid.', 'INVALID_PAYLOAD');
    }

    const earnedRv = Math.max(0, Math.min(Math.trunc(body.earnedRv), MAX_EARNED_RV));
    const jobId =
      typeof body.jobId === 'string' && JOB_ID_PATTERN.test(body.jobId) ? body.jobId : undefined;

    const profileResults = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];

    if (!profile) throw errors.notFound('Profil');

    const newMoney = (profile.money || 0) + earnedRv;

    const jobStats = (profile.jobStats as Record<string, number>) || {};
    if (earnedRv > 0 && jobId) {
      jobStats[jobId] = (jobStats[jobId] || 0) + 1;
    }

    await db
      .update(userProfiles)
      .set({ money: newMoney, jobStats })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({ success: true, newMoney, jobStats });
  }
);
