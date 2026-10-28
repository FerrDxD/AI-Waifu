import { NextResponse } from 'next/server';

import { apiHandler } from '@/lib/api-handler';
import { errors, readJsonBody } from '@/lib/errors';
import { mutationRateLimit } from '@/lib/rate-limit';
import { saveChatRating, type ChatRating } from '@/lib/feedback';
import { logger } from '@/lib/logger';

/**
 * `POST /api/chat/feedback` (M7.4) — rating baik/buruk untuk satu balasan Livia.
 *
 * Body: `{ messageId: string (uuid), rating: 'up' | 'down' }`.
 *
 * - 1 rating per (user, pesan): re-rating menimpa (upsert) — tidak ada
 *   endpoint hapus, rating terakhir yang menang.
 * - Ownership dicek di `saveChatRating`: pesan orang lain / tidak ada → 404
 *   yang SAMA (keberadaan pesan orang lain tidak dibocorkan sebagai 403).
 * - Rate limit = `mutationRateLimit` (30/menit + 1.000/hari per user) —
 *   rating itu mutasi ringan, bukan endpoint AI.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = apiHandler(
  {
    route: '/api/chat/feedback.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak aksi. Tunggu sebentar ya.',
  },
  async ({ userId, req }) => {
    const body = (await readJsonBody<Record<string, unknown>>(req)) ?? {};

    const messageId = body.messageId;
    const rating = body.rating;

    if (typeof messageId !== 'string' || !UUID_RE.test(messageId)) {
      throw errors.badRequest('messageId tidak valid.', 'INVALID_MESSAGE_ID');
    }
    if (rating !== 'up' && rating !== 'down') {
      throw errors.badRequest('rating harus "up" atau "down".', 'INVALID_RATING');
    }

    const saved = await saveChatRating(userId, messageId, rating as ChatRating);
    if (saved === null) {
      logger.warn('feedback.message_not_found', { userId, messageId });
      throw errors.notFound('Pesan');
    }

    return NextResponse.json({ rating: saved });
  }
);
