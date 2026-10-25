import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { publicApiHandler, ipKey } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateIdentifier } from '@/lib/validation';
import { passwordResetRateLimit } from '@/lib/rate-limit';

/**
 * Reset password (M0/H0.5, H0.4).
 *
 * Perbaikan keamanan penting: endpoint `verify` sebelumnya membalas 404 kalau
 * identifier tidak ada dan 200 kalau ada. Itu oracle enumerasi akun — penyerang
 * bisa memetakan email mana yang terdaftar. Sekarang respons SELALU sama.
 *
 * Aksi `reset` tetap dinonaktifkan sampai alur OTP/token (M4) tersedia. Jangan
 * pernah mengaktifkannya tanpa verifikasi kepemilikan email.
 */
export const POST = publicApiHandler(
  {
    route: '/api/auth/reset-password.POST',
    rateLimit: passwordResetRateLimit,
    rateLimitKey: ipKey,
    rateLimitMessage: 'Terlalu banyak percobaan. Coba lagi nanti.',
  },
  async ({ req, ip }) => {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const action = body?.action;

    if (action === 'verify') {
      const identifier = validateIdentifier(body?.identifier);

      const found = await db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.email, identifier), eq(users.username, identifier)));

      logger.info('auth.reset_password.verify', {
        route: '/api/auth/reset-password.POST',
        ip,
        found: found.length > 0,
      });

      // Selalu 200, apa pun hasilnya. Tidak ada informasi yang bocor.
      return NextResponse.json({ success: true });
    }

    if (action === 'reset') {
      return NextResponse.json(
        {
          error: 'Reset password belum tersedia. Fitur ini butuh verifikasi email (OTP/token).',
          code: 'NOT_IMPLEMENTED',
        },
        { status: 501 }
      );
    }

    throw errors.badRequest('Aksi tidak dikenal.', 'INVALID_ACTION');
  }
);
