import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { moneyPlusExpr } from '@/lib/livia/atomic-profile';
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

    // M5.4 — atomik: `money = money + ?` dan increment jobStats (jsonb) dalam
    // SATU statement. `jobId` sudah divalidasi pola alfanumerik, jadi aman
    // diinterpolasi ke JSON. Race dua kerja bersamaan tidak lagi saling menimpa
    // jumlah Rv maupun hitungan.
    const setClause: { money: ReturnType<typeof moneyPlusExpr>; jobStats?: unknown; lastSeen: Date } = {
      money: moneyPlusExpr(earnedRv),
      lastSeen: new Date(),
    };
    if (earnedRv > 0 && jobId) {
      setClause.jobStats = sql`
        COALESCE(${userProfiles.jobStats}, '{}') || jsonb_build_object(
          ${jobId},
          GREATEST(0, COALESCE((${userProfiles.jobStats}->>${jobId})::int, 0) + 1)
        )
      `;
    }

    const updated = await db
      .update(userProfiles)
      .set(setClause)
      .where(eq(userProfiles.userId, userId))
      .returning({ money: userProfiles.money, jobStats: userProfiles.jobStats });

    if (updated.length === 0) throw errors.notFound('Profil');

    const newMoney = updated[0].money;
    const jobStats = (updated[0].jobStats as Record<string, number>) || {};

    return NextResponse.json({ success: true, newMoney, jobStats });
  }
);
