import { NextResponse } from 'next/server';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requireString, LIMITS } from '@/lib/validation';
import { deleteUserApiKey, getApiKeyStatus, saveUserApiKey } from '@/lib/ai/keys';
import { CryptoConfigError } from '@/lib/crypto';
import { mutationRateLimit } from '@/lib/rate-limit';

/**
 * Endpoint pengelolaan API key Gemini milik user (M0/H0.1).
 *
 * GET    → status saja (`hasKey` + `keyHint`). Plaintext TIDAK pernah dikirim.
 * POST   → simpan key, dienkripsi AES-256-GCM di database.
 * DELETE → hapus key, kembali memakai key server.
 */

const ROUTE = '/api/user/api-key';
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export const GET = apiHandler({ route: `${ROUTE}.GET` }, async ({ userId }) => {
  const status = await getApiKeyStatus(userId);
  return NextResponse.json(status, { headers: NO_STORE });
});

type ApiKeyBody = { apiKey?: unknown };

export const POST = jsonApiHandler<ApiKeyBody>(
  {
    route: `${ROUTE}.POST`,
    rateLimit: mutationRateLimit,
    rateLimitKey: ({ userId }) => `apikey_${userId}`,
    rateLimitMessage: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.',
  },
  async ({ userId, body }) => {
    const apiKey = requireString(body.apiKey, 'apiKey', { max: LIMITS.apiKey ?? 512 });

    try {
      const status = await saveUserApiKey(userId, apiKey);
      return NextResponse.json(status, { headers: NO_STORE });
    } catch (error) {
      if (error instanceof CryptoConfigError) {
        // Fitur tidak bisa dipakai sampai operator menyetel ENCRYPTION_KEY.
        logger.error('api_key.encryption_not_configured', { route: `${ROUTE}.POST`, userId });
        throw errors.internal(
          'Penyimpanan API key belum diaktifkan di server ini. Hubungi admin.'
        );
      }
      throw error;
    }
  }
);

export const DELETE = apiHandler(
  {
    route: `${ROUTE}.DELETE`,
    rateLimit: mutationRateLimit,
    rateLimitKey: ({ userId }) => `apikey_${userId}`,
    rateLimitMessage: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.',
  },
  async ({ userId }) => {
    await deleteUserApiKey(userId);
    return NextResponse.json({ hasKey: false });
  }
);
