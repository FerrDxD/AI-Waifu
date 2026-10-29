import { NextResponse } from 'next/server';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requireString, LIMITS } from '@/lib/validation';
import { deleteUserApiKey, getApiKeyStatus, isSupportedKeyProvider, saveUserApiKey } from '@/lib/ai/keys';
import { CryptoConfigError } from '@/lib/crypto';
import { mutationRateLimit } from '@/lib/rate-limit';
import { recordAuditEvent } from '@/lib/safety/audit';

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

type ApiKeyBody = { apiKey?: unknown; provider?: unknown };

export const POST = jsonApiHandler<ApiKeyBody>(
  {
    route: `${ROUTE}.POST`,
    rateLimit: mutationRateLimit,
    rateLimitKey: ({ userId }) => `apikey_${userId}`,
    rateLimitMessage: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.',
  },
  async ({ userId, body }) => {
    const apiKey = requireString(body.apiKey, 'apiKey', { max: LIMITS.apiKey ?? 512 });
    // M8.1: key disimpan bersama providernya; default lama (gemini) tetap
    // berlaku untuk client yang belum mengirim field ini.
    const provider = isSupportedKeyProvider(body.provider) ? body.provider : 'gemini';

    try {
      const status = await saveUserApiKey(userId, apiKey, provider);

      // M4.6: yang dicatat hanya provider & route. API key-nya sendiri TIDAK
      // pernah masuk audit log — itu justru kebocoran yang ingin dicegah.
      await recordAuditEvent({
        userId,
        action: 'apikey.save',
        metadata: { route: `${ROUTE}.POST`, provider: status.provider },
      });

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

    await recordAuditEvent({
      userId,
      action: 'apikey.delete',
      metadata: { route: `${ROUTE}.DELETE` },
    });

    return NextResponse.json({ hasKey: false });
  }
);
