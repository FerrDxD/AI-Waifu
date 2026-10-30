import { NextResponse } from 'next/server';
import { and, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userActivityDaily, pushSubscriptions, pushSentLogs } from '@/lib/db/schema';
import {
  isPushEnabled,
  sendPushToUser,
  recordPushSentLog,
  type PushPayload,
} from '@/lib/push/push.server';
import { isCronAuthorized, cronUnauthorized } from '@/lib/push/cron-guard';
import { logger } from '@/lib/logger';

/**
 * M8.5 — POST /api/cron/miss-you
 * Cron harian: kirim "Livia kangen" ke user yang TIDAK aktif kemarin
 * (tidak ada baris `userActivityDaily` untuk hari kemarin UTC) & masih
 * punya subscription.
 *
 * Idempoten: dedupe per user per hari via `pushSentLogs` (kind miss_you,
 * dibuat >= awal hari UTC hari ini).
 *
 * Guard: `Authorization: Bearer $CRON_SECRET` (Vercel Cron).
 */

const MISS_YOU_TITLE = 'Livia kangen kamu 🥺';
const MISS_YOU_BODY = 'Hari ini kita belum ngobrol. Livia di kosan nungguin kamu, lho!';

export const POST = async (req: Request) => {
  if (!isCronAuthorized(req)) return cronUnauthorized();
  if (!isPushEnabled()) return NextResponse.json({ ok: true, skipped: true });

  const now = new Date();
  const yesterdayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
  );
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  try {
    // User yang punya subscription push (distinct).
    const subscriberRows = await db
      .selectDistinct({ userId: pushSubscriptions.userId })
      .from(pushSubscriptions);

    let sent = 0;
    let skipped = 0;

    for (const row of subscriberRows) {
      const userId = row.userId;

      // Sudah dikirimi hari ini? (log miss_you sejak awal hari UTC)
      const alreadySent = await db
        .select({ id: pushSentLogs.id })
        .from(pushSentLogs)
        .where(
          and(
            eq(pushSentLogs.userId, userId),
            eq(pushSentLogs.kind, 'miss_you'),
            gte(pushSentLogs.createdAt, todayStart)
          )
        )
        .limit(1);

      if (alreadySent.length > 0) {
        skipped++;
        continue;
      }

      // Aktif kemarin? (ada baris userActivityDaily untuk kemarin)
      const active = await db
        .select({ userId: userActivityDaily.userId })
        .from(userActivityDaily)
        .where(
          and(
            eq(userActivityDaily.userId, userId),
            gte(userActivityDaily.day, yesterdayStart),
            lt(userActivityDaily.day, todayStart)
          )
        )
        .limit(1);

      if (active.length > 0) {
        skipped++;
        continue;
      }

      const payload: PushPayload = {
        title: MISS_YOU_TITLE,
        body: MISS_YOU_BODY,
        url: '/home',
        kind: 'miss_you',
        data: { date: now.toISOString().slice(0, 10) },
      };

      const result = await sendPushToUser(userId, payload);
      if (result.delivered > 0) {
        sent++;
        await recordPushSentLog(userId, 'miss_you', payload, 'sent');
      } else if (result.total > 0) {
        await recordPushSentLog(userId, 'miss_you', payload, 'dropped');
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, processed: subscriberRows.length, sent, skipped });
  } catch (err) {
    logger.error('cron.miss_you_failed', { error: (err as Error).message });
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
};

/** Supaya tidak dipanggil via GET. */
export const GET = () => cronUnauthorized();
