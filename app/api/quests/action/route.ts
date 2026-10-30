import { NextResponse } from 'next/server';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { recordQuestActionServer, getQuestDayState, ALLOWED_ACTIONS } from '@/lib/livia/quests.server';

/**
 * M8.4 — POST /api/quests/action
 * Rekam aksi (visit route, sentuh Livia, tool chat). Server = otoritas.
 */
type ActionBody = { action?: unknown; amount?: unknown; date?: unknown };

export const POST = jsonApiHandler<ActionBody>(
  {
    route: '/api/quests/action.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak aktivitas. Istirahat sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.action !== 'string' || !ALLOWED_ACTIONS.has(body.action)) {
      throw errors.badRequest('Aksi tidak dikenal.', 'INVALID_PAYLOAD');
    }

    const date = typeof body.date === 'string' ? body.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw errors.badRequest('Format tanggal harus YYYY-MM-DD.', 'INVALID_PAYLOAD');
    }

    const amount = typeof body.amount === 'number' ? Math.trunc(body.amount) : 1;
    const times = Math.max(1, Math.min(amount, 10));
    for (let i = 0; i < times; i++) {
      await recordQuestActionServer(userId, date, body.action);
    }

    const state = await getQuestDayState(userId, date);
    return NextResponse.json({ state });
  }
);
