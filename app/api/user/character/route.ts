import { NextResponse } from 'next/server';

import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { mutationRateLimit } from '@/lib/rate-limit';
import { recordAuditEvent } from '@/lib/safety/audit';
import { getCharacterChoice, switchActiveCharacter } from '@/lib/characters/switch';

/**
 * Karakter aktif milik user (M8.2 Phase B).
 *
 * GET  → `{ characterId, characters }`: karakter aktif + daftar yang bisa
 *        dipilih (dari registry server, bukan hardcode client).
 * POST → `{ characterId }`; tubuh `{ characterId: string }`. Progres karakter
 *        lama dipotret & karakter baru dimuat dalam satu transaksi.
 *
 * Kenapa route, bukan Server Action: sama seperti `/api/user/model` — seluruh
 * mutasi user di app ini lewat `/api/*` + `apiHandler` (rate limit, auth,
 * audit, error mapping).
 */

const ROUTE = '/api/user/character';
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export const GET = apiHandler({ route: `${ROUTE}.GET` }, async ({ userId }) => {
  const choice = await getCharacterChoice(userId);
  return NextResponse.json(choice, { headers: NO_STORE });
});

type CharacterBody = { characterId?: unknown };

export const POST = jsonApiHandler<CharacterBody>(
  {
    route: `${ROUTE}.POST`,
    rateLimit: mutationRateLimit,
    rateLimitKey: ({ userId }) => `character_${userId}`,
    rateLimitMessage: 'Terlalu banyak pergantian karakter. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.characterId !== 'string' || body.characterId.length === 0) {
      throw errors.badRequest('Field "characterId" wajib berupa string.', 'MISSING_CHARACTER');
    }

    const choice = await switchActiveCharacter(userId, body.characterId);

    await recordAuditEvent({
      userId,
      action: 'character.switch',
      metadata: { route: `${ROUTE}.POST`, characterId: choice.characterId },
    });

    return NextResponse.json(choice, { headers: NO_STORE });
  }
);
