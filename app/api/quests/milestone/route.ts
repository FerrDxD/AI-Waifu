import { NextResponse } from 'next/server';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { claimQuestMilestoneServer, getQuestDayState } from '@/lib/livia/quests.server';

/**
 * M8.4 — POST /api/quests/milestone
 * Klaim milestone chest (3/6/9). Idempoten & diverifikasi server.
 */
type MilestoneBody = { points?: unknown; date?: unknown };

export const POST = jsonApiHandler<MilestoneBody>(
  {
    route: '/api/quests/milestone.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak klaim. Istirahat sebentar ya.',
  },
  async ({ userId, body }) => {
    const points = typeof body.points === 'number' ? body.points : Number(body.points);
    if (![3, 6, 9].includes(points)) {
      throw errors.badRequest('Titik milestone harus 3/6/9.', 'INVALID_PAYLOAD');
    }
    const date = typeof body.date === 'string' ? body.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw errors.badRequest('Format tanggal harus YYYY-MM-DD.', 'INVALID_PAYLOAD');
    }

    const result = await claimQuestMilestoneServer(userId, date, points);
    if (!result.ok) {
      if (result.reason === 'already_claimed') {
        throw errors.badRequest('Milestone ini sudah diklaim.', 'ALREADY_CLAIMED');
      }
      if (result.reason === 'unknown_milestone') {
        throw errors.badRequest('Milestone tidak dikenal.', 'UNKNOWN_MILESTONE');
      }
      throw errors.badRequest('Poin progres belum cukup.', 'INSUFFICIENT_PROGRESS');
    }

    const state = await getQuestDayState(userId, date);
    return NextResponse.json({ state, rv: result.rv, affection: result.affection });
  }
);
