import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, userProfiles } from '@/lib/db/schema';
import { publicApiHandler, ipKey } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateRegisterInput } from '@/lib/validation';
import { registerRateLimit } from '@/lib/rate-limit';
import { recordAuditEvent } from '@/lib/safety/audit';

/** Cost bcrypt dinaikkan dari 10 (standar lama) ke 12. */
const BCRYPT_ROUNDS = 12;

export const POST = publicApiHandler(
  {
    route: '/api/auth/register.POST',
    // H0.4: batasi pembuatan akun per IP sebelum menyentuh database.
    rateLimit: registerRateLimit,
    rateLimitKey: ipKey,
    rateLimitMessage: 'Terlalu banyak percobaan pendaftaran. Coba lagi nanti.',
  },
  async ({ req }) => {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    // H0.5: validasi format email, panjang username, dan kebijakan password.
    // Sebelumnya password "1" diterima dan email "a@b" lolos.
    // M4.1: `validateRegisterInput` juga menolak pendaftaran tanpa konfirmasi 18+.
    const { username, email, password, ageConfirmed } = validateRegisterInput(body);

    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)));

    if (existingUsers.length > 0) {
      // Pesan sengaja generik: jangan beri tahu field mana yang sudah dipakai,
      // supaya tidak jadi alat enumerasi akun.
      throw errors.badRequest(
        'Username atau email sudah digunakan. Coba yang lain ya.',
        'ACCOUNT_EXISTS'
      );
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const insertedUsers = await db
      .insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        provider: 'credentials',
        // M4.1: konfirmasi 18+ tercatat sebagai waktu, bukan tanggal lahir.
        ageConfirmedAt: ageConfirmed ? new Date() : null,
      })
      .returning({ id: users.id });

    const newUser = insertedUsers[0];
    if (!newUser) throw errors.internal('Registrasi gagal, coba lagi.');

    await db.insert(userProfiles).values({ userId: newUser.id });

    logger.info('auth.register.success', { route: '/api/auth/register.POST', userId: newUser.id });

    await recordAuditEvent({
      userId: newUser.id,
      action: 'auth.register',
      metadata: { route: '/api/auth/register.POST', provider: 'credentials' },
    });

    return NextResponse.json(
      { success: true, message: 'Registrasi berhasil' },
      { status: 201 }
    );
  }
);
