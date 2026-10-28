import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { getUsageOverview } from '@/lib/ai/usage';
import { logger } from '@/lib/logger';

/**
 * `/api/usage` (M7.1) — angka dashboard biaya/pemakaian AI.
 *
 * Owner-only: cek `OWNER_EMAIL` di DALAM handler (bukan middleware, yang
 * hanya menjamin login). `OWNER_EMAIL` kosong = 403 untuk semua orang —
 * default aman, karena endpoint ini menampilkan data semua user.
 *
 * Read-only, tanpa rate limit khusus (sudah dibatasi login + owner).
 */

function ownerEmail(): string | undefined {
  const raw = process.env.OWNER_EMAIL;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const GET = apiHandler(
  {
    route: '/api/usage.GET',
    rateLimit: null,
  },
  async ({ userId, session, req }) => {
    const owner = ownerEmail();
    const email = session.user?.email?.toLowerCase();
    if (!owner || email !== owner) {
      logger.warn('usage.forbidden', { userId, hasOwnerEnv: Boolean(owner) });
      throw errors.forbidden();
    }

    // `?days=` opsional: 1..90, default 14 (diparse ulang di getUsageOverview).
    // Nilai tidak numerik diabaikan, bukan diteruskan sebagai NaN.
    const params = new URL(req.url).searchParams;
    const rawDays = params.get('days');
    const parsedDays = rawDays !== null ? Number(rawDays) : NaN;
    const days = Number.isFinite(parsedDays) ? parsedDays : undefined;

    const overview = await getUsageOverview(days !== undefined ? { days } : {});
    return NextResponse.json(overview);
  }
);
