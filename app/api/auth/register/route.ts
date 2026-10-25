import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userProfiles } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { apiErrorResponse, errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateRegisterInput } from '@/lib/validation';
import { registerRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/** Cost bcrypt dinaikkan dari 10 (standar lama) ke 12. */
const BCRYPT_ROUNDS = 12;

export async function POST(req: Request) {
  try {
    // H0.4: batasi pembuatan akun per IP sebelum menyentuh database.
    const ip = getClientIp(req);
    const limit = await registerRateLimit.limit(`register_${ip}`);
    if (!limit.success) {
      return rateLimitResponse(limit, 'Terlalu banyak percobaan pendaftaran. Coba lagi nanti.');
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    // H0.5: validasi format email, panjang username, dan kebijakan password.
    // Sebelumnya password "1" diterima dan email "a@b" lolos.
    const { username, email, password } = validateRegisterInput(body);

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
      })
      .returning({ id: users.id });

    const newUser = insertedUsers[0];
    if (!newUser) throw errors.internal('Registrasi gagal, coba lagi.');

    await db.insert(userProfiles).values({ userId: newUser.id });

    logger.info('auth.register.success', { userId: newUser.id });

    return NextResponse.json(
      { success: true, message: 'Registrasi berhasil' },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, { route: 'api/auth/register.POST' });
  }
}
