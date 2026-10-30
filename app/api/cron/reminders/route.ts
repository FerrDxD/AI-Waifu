import { NextResponse } from 'next/server';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reminders } from '@/lib/db/schema';
import {
  isPushEnabled,
  sendPushToUser,
  recordPushSentLog,
  type PushPayload,
} from '@/lib/push/push.server';
import { isCronAuthorized, cronUnauthorized } from '@/lib/push/cron-guard';
import { logger } from '@/lib/logger';

/**
 * M8.5 — POST /api/cron/reminders
 * Cron: kirim push untuk reminder yang sudah lewat waktunya & belum pernah
 * diberi tahu (`notifiedAt` null). Idempoten: tiap reminder hanya sekali.
 *
 * Guard: `Authorization: Bearer $CRON_SECRET` (Vercel Cron).
 */
export const POST = async (req: Request) => {
  if (!isCronAuthorized(req)) return cronUnauthorized();
  if (!isPushEnabled()) return NextResponse.json({ ok: true, skipped: true });

  const now = new Date();

  try {
    // Semua reminder active yang waktunya lewat & belum di-notifikasi.
    const due = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.status, 'active'),
          isNull(reminders.notifiedAt),
          lt(reminders.remindAt, now)
        )
      )
      .limit(50);

    let sent = 0;
    let dropped = 0;

    for (const reminder of due) {
      const payload: PushPayload = {
        title: 'Pengingat ⏰',
        body: reminder.content,
        url: '/schedule',
        kind: 'reminder',
        data: { reminderId: reminder.id },
      };

      const result = await sendPushToUser(reminder.userId, payload);
      // Tandai sudah diberi tahu (dedupe) — walau tidak ada subscription,
      // jangan kirim ulang terus-terusan.
      await db
        .update(reminders)
        .set({ notifiedAt: now })
        .where(and(eq(reminders.id, reminder.id), isNull(reminders.notifiedAt)));

      if (result.delivered > 0) {
        sent++;
        await recordPushSentLog(reminder.userId, 'reminder', payload, 'sent');
      } else if (result.total > 0) {
        dropped++;
        await recordPushSentLog(reminder.userId, 'reminder', payload, 'dropped');
      }
    }

    return NextResponse.json({ ok: true, processed: due.length, sent, dropped });
  } catch (err) {
    logger.error('cron.reminders_failed', { error: (err as Error).message });
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
};

/** Supaya tidak dipanggil via GET. */
export const GET = () => cronUnauthorized();
