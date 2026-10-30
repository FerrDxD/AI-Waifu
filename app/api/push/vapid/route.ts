import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { optionalEnvVar } from '@/lib/env';

/**
 * M8.5 — GET /api/push/vapid
 * Dapatkan VAPID public key untuk `pushManager.subscribe`.
 * 400 kalau push belum dikonfigurasi server (client diam saja).
 */
export const GET = apiHandler(
  { route: '/api/push/vapid.GET' },
  async () => {
    const publicKey = optionalEnvVar('VAPID_PUBLIC_KEY');
    if (!publicKey) {
      return NextResponse.json({ error: 'Push belum aktif.' }, { status: 400 });
    }
    return NextResponse.json({ publicKey });
  }
);
