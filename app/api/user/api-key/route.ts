import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiErrorResponse, errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requireString, LIMITS } from '@/lib/validation';
import { deleteUserApiKey, getApiKeyStatus, saveUserApiKey } from '@/lib/ai/keys';
import { CryptoConfigError } from '@/lib/crypto';
import { mutationRateLimit, rateLimitResponse } from '@/lib/rate-limit';

/**
 * Endpoint pengelolaan API key Gemini milik user (M0/H0.1).
 *
 * GET    → status saja (`hasKey` + `keyHint`). Plaintext TIDAK pernah dikirim.
 * POST   → simpan key, dienkripsi AES-256-GCM di database.
 * DELETE → hapus key, kembali memakai key server.
 */

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw errors.unauthorized();

    const status = await getApiKeyStatus(session.user.id);

    return NextResponse.json(status, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'api/user/api-key.GET' });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw errors.unauthorized();

    const limit = await mutationRateLimit.limit(`apikey_${session.user.id}`);
    if (!limit.success) {
      return rateLimitResponse(limit, 'Terlalu banyak percobaan. Coba lagi sebentar lagi.');
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const apiKey = requireString(body?.apiKey, 'apiKey', { max: LIMITS.apiKey ?? 512 });

    try {
      const status = await saveUserApiKey(session.user.id, apiKey);
      return NextResponse.json(status, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    } catch (error) {
      if (error instanceof CryptoConfigError) {
        // Fitur tidak bisa dipakai sampai operator menyetel ENCRYPTION_KEY.
        logger.error('api_key.encryption_not_configured', { userId: session.user.id });
        throw errors.internal(
          'Penyimpanan API key belum diaktifkan di server ini. Hubungi admin.'
        );
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error, { route: 'api/user/api-key.POST' });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw errors.unauthorized();

    const limit = await mutationRateLimit.limit(`apikey_${session.user.id}`);
    if (!limit.success) {
      return rateLimitResponse(limit, 'Terlalu banyak percobaan. Coba lagi sebentar lagi.');
    }

    await deleteUserApiKey(session.user.id);
    return NextResponse.json({ hasKey: false });
  } catch (error) {
    return apiErrorResponse(error, { route: 'api/user/api-key.DELETE' });
  }
}
