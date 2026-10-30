import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { getQuestDayState } from '@/lib/livia/quests.server';

/**
 * M8.4 — GET /api/quests?date=YYYY-MM-DD
 * Mengembalikan state quest hari itu (quests, progress, claimed, milestones).
 * Server adalah satu-satunya sumber kebenaran.
 */
export const GET = apiHandler(
  { route: '/api/quests.GET' },
  async ({ userId, req }) => {
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || todayLocalDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw errors.badRequest('Format tanggal harus YYYY-MM-DD.', 'INVALID_PAYLOAD');
    }
    const state = await getQuestDayState(userId, date);
    return NextResponse.json({ state });
  }
);

/** Tanggal UTC (default saja — client wajib mengirim tanggal lokalnya). */
function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
