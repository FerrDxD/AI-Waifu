/**
 * Guard cron Vercel (M8.5).
 *
 * Route cron tidak boleh bisa dipanggil orang sembarangan (kirim push massal
 * = spam). Vercel Cron menyertakan header `Authorization: Bearer <token>`
 * yang kita set sendiri di dashboard Vercel (`CRON_SECRET`).
 */
import { NextResponse } from 'next/server';
import { optionalEnvVar } from '@/lib/env';

/** Cek apakah request berasal dari cron yang valid. */
export function isCronAuthorized(req: Request): boolean {
  const secret = optionalEnvVar('CRON_SECRET');
  if (!secret) return false; // tidak dikonfigurasi = tolak
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

/** Respons 401 untuk cron yang tidak sah. */
export function cronUnauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
