import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { confirmAge, hasConfirmedAge } from '@/lib/safety/data-control.server';
import { recordAuditEvent } from '@/lib/safety/audit';

/**
 * Age gate (M4.1).
 *
 * GET  → apakah user sudah mengonfirmasi 18+.
 * POST → tandai sudah dikonfirmasi.
 *
 * Kenapa ada endpoint terpisah, padahal registrasi sudah meminta konfirmasi:
 * akun yang dibuat SEBELUM M4 tidak punya `age_confirmed_at`. Tanpa jalur ini,
 * mereka tidak akan pernah melihat gate — dan gate yang hanya berlaku untuk
 * user baru bukan gate, hanya formalitas.
 *
 * Yang disimpan hanya waktu konfirmasi. Tanggal lahir sengaja TIDAK diminta:
 * itu PII tambahan yang tidak dibutuhkan untuk apa pun di aplikasi ini.
 */

const ROUTE = '/api/user/age-gate';
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export const GET = apiHandler({ route: `${ROUTE}.GET` }, async ({ userId }) => {
  const confirmed = await hasConfirmedAge(userId);

  // `confirmed === null` = status tidak diketahui (migrasi belum jalan / DB
  // bermasalah). Jangan paksa gate: modal yang tidak bisa dituntaskan lebih
  // merugikan daripada gate yang tertunda satu rilis.
  return NextResponse.json(
    { confirmed: confirmed !== false, unknown: confirmed === null },
    { headers: NO_STORE }
  );
});

export const POST = apiHandler(
  {
    route: `${ROUTE}.POST`,
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak permintaan. Coba lagi sebentar.',
  },
  async ({ userId }) => {
    const confirmedAt = await confirmAge(userId);

    await recordAuditEvent({
      userId,
      action: 'age_gate.confirm',
      metadata: { route: `${ROUTE}.POST` },
    });

    return NextResponse.json(
      { confirmed: true, confirmedAt: confirmedAt.toISOString() },
      { headers: NO_STORE }
    );
  }
);
