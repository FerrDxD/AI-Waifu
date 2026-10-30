import { NextResponse } from 'next/server';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { claimQuestRewardServer, getQuestDayState } from '@/lib/livia/quests.server';

/**
 * M8.4 — POST /api/quests/claim
 * Klaim reward quest (+15 Rv). Idempoten & diverifikasi server.
 */
type ClaimBody = { questId?: unknown; date?: unknown };

export const POST = jsonApiHandler<ClaimBody>(
  {
    route: '/api/quests/claim.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak klaim. Istirahat sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.questId !== 'string' || !body.questId) {
      throw errors.badRequest('questId wajib.', 'INVALID_PAYLOAD');
    }
    const date = typeof body.date === 'string' ? body.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw errors.badRequest('Format tanggal harus YYYY-MM-DD.', 'INVALID_PAYLOAD');
    }

    const result = await claimQuestRewardServer(userId, date, body.questId);
    if (!result.ok) {
      if (result.reason === 'already_claimed') {
        throw errors.badRequest('Misi ini sudah diklaim.', 'ALREADY_CLAIMED');
      }
      if (result.reason === 'unknown_quest') {
        throw errors.badRequest('Misi tidak dikenal.', 'UNKNOWN_QUEST');
      }
      throw errors.badRequest('Progress misi belum cukup.', 'INSUFFICIENT_PROGRESS');
    }

    const state = await getQuestDayState(userId, date);
    return NextResponse.json({ state, rv: result.rv });
  }
);
