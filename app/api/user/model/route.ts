import { NextResponse } from 'next/server';

import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { mutationRateLimit } from '@/lib/rate-limit';
import { recordAuditEvent } from '@/lib/safety/audit';
import { getModelPreference, setUserPreferredModel } from '@/lib/ai/user-model';

/**
 * Preferensi model AI milik user (M8.1 Phase 2).
 *
 * GET  → `{ model, models }`: pilihan aktif + daftar yang boleh dipilih.
 *        Daftar berasal dari `AI_ALLOWED_MODELS` di server, BUKAN dari client.
 * POST → `{ model: string | null }`. `null` = kembali ke model server.
 *
 * Kenapa route, bukan Server Action: seluruh mutasi user lain di app ini lewat
 * `/api/*` + `apiHandler` (rate limit, auth, audit, error mapping). Satu pola
 * saja lebih mudah diaudit daripada dua.
 */

const ROUTE = '/api/user/model';
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export const GET = apiHandler({ route: `${ROUTE}.GET` }, async ({ userId }) => {
  const preference = await getModelPreference(userId);
  return NextResponse.json(preference, { headers: NO_STORE });
});

type ModelBody = { model?: unknown };

export const POST = jsonApiHandler<ModelBody>(
  {
    route: `${ROUTE}.POST`,
    rateLimit: mutationRateLimit,
    rateLimitKey: ({ userId }) => `model_${userId}`,
    rateLimitMessage: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.',
  },
  async ({ userId, body }) => {
    if (body.model === undefined) {
      throw errors.badRequest('Field "model" wajib diisi (null untuk model server).', 'MISSING_MODEL');
    }

    if (body.model !== null && typeof body.model !== 'string') {
      throw errors.badRequest('Nilai "model" harus string atau null.', 'INVALID_MODEL');
    }

    const saved = await setUserPreferredModel(userId, body.model);

    await recordAuditEvent({
      userId,
      action: 'model.save',
      metadata: { route: `${ROUTE}.POST`, model: saved.model ?? 'server-default' },
    });

    // Katalog ikut dikembalikan supaya UI tidak perlu fetch ulang setelah simpan.
    const preference = await getModelPreference(userId);
    return NextResponse.json(preference, { headers: NO_STORE });
  }
);
