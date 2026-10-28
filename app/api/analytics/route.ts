import { NextResponse } from 'next/server';

import { apiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { getAnalyticsOverview } from '@/lib/analytics/queries';
import { logger } from '@/lib/logger';

/**
 * `/api/analytics` (M7.2) — angka dashboard produk (retensi, sesi, drop-off).
 *
 * Owner-only: cek `OWNER_EMAIL` di DALAM handler (bukan middleware, yang
 * hanya menjamin login). `OWNER_EMAIL` kosong = 403 untuk semua orang —
 * default aman, karena endpoint ini menampilkan pola perilaku semua user.
 *
 * First-party & read-only: data dihitung dari tabel milik sendiri di Neon
 * (users, userProfiles, userActivityDaily, chatMessages) — tidak ada pihak
 * ketiga, tidak ada cookie, tidak ada tracking eksternal.
 */

function ownerEmail(): string | undefined {
  const raw = process.env.OWNER_EMAIL;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const GET = apiHandler(
  {
    route: '/api/analytics.GET',
    rateLimit: null,
  },
  async ({ userId, session }) => {
    const owner = ownerEmail();
    const email = session.user?.email?.toLowerCase();
    if (!owner || email !== owner) {
      logger.warn('analytics.forbidden', { userId, hasOwnerEnv: Boolean(owner) });
      throw errors.forbidden();
    }

    const overview = await getAnalyticsOverview();
    return NextResponse.json(overview);
  }
);
