import { NextResponse } from 'next/server';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { listReminders, insertReminder, updateReminderStatus } from '@/lib/tools/store';

/**
 * M8.3 — API pengingat.
 *
 * GET  /api/reminders  → daftar semua reminder user (terbaru dulu)
 * POST /api/reminders  → { content, remindAt } (ISO) — dipakai UI /schedule
 * PATCH /api/reminders → { id, status } ('done' | 'cancelled' | 'active')
 *
 * Jalur chat memakai executor tool (`lib/tools/execute.ts`) yang menyimpan
 * lewat fungsi store yang sama — tidak ada duplikasi logika.
 */

const STATUSES = ['active', 'done', 'cancelled'] as const;

export const GET = apiHandler(
  { route: '/api/reminders.GET' },
  async ({ userId }) => {
    const rows = await listReminders(userId);
    return NextResponse.json({ reminders: rows });
  }
);

type CreateReminderBody = { content?: unknown; remindAt?: unknown };

export const POST = jsonApiHandler<CreateReminderBody>(
  {
    route: '/api/reminders.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak pengingat. Istirahat sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.content !== 'string' || !body.content.trim()) {
      throw errors.badRequest('Isi pengingat tidak boleh kosong.', 'INVALID_PAYLOAD');
    }
    const content = body.content.trim().slice(0, 200);

    const remindAt = typeof body.remindAt === 'string' ? new Date(body.remindAt) : null;
    if (!remindAt || Number.isNaN(remindAt.getTime())) {
      throw errors.badRequest('Waktu pengingat tidak valid (butuh ISO).', 'INVALID_PAYLOAD');
    }

    const row = await insertReminder(userId, content, remindAt);
    return NextResponse.json({ reminder: row }, { status: 201 });
  }
);

type UpdateReminderBody = { id?: unknown; status?: unknown };

export const PATCH = jsonApiHandler<UpdateReminderBody>(
  {
    route: '/api/reminders.PATCH',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak perubahan. Istirahat sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.id !== 'string') {
      throw errors.badRequest('ID reminder tidak valid.', 'INVALID_PAYLOAD');
    }
    const status = STATUSES.includes(body.status as (typeof STATUSES)[number])
      ? (body.status as (typeof STATUSES)[number])
      : null;
    if (!status) {
      throw errors.badRequest('Status tidak valid.', 'INVALID_PAYLOAD');
    }

    const row = await updateReminderStatus(userId, body.id, status);
    if (!row) throw errors.notFound('Reminder');

    return NextResponse.json({ reminder: row });
  }
);
