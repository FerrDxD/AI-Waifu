import { NextResponse } from 'next/server';
import { jsonApiHandler, apiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { logger } from '@/lib/logger';
import { validPushSubscription } from '@/lib/push/validate';

/**
 * M8.5 — API subscription Web Push.
 *
 * POST /api/push/subscribe      → simpan subscription (dedupe via unique index).
 * DELETE /api/push/subscribe?endpoint=… → hapus satu endpoint; tanpa query = hapus semua.
 * GET  /api/push/vapid          → VAPID public key (untuk pushManager.subscribe).
 * GET  /api/push/subscriptions   → daftar subscription milik user.
 */

type SubscribeBody = { endpoint?: unknown; p256dh?: unknown; auth?: unknown };

function userAgentOf(req: Request): string | null {
  return req.headers.get('user-agent') ?? null;
}

export const POST = jsonApiHandler<SubscribeBody>(
  {
    route: '/api/push/subscribe.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak request. Coba lagi nanti.',
  },
  async ({ userId, req, body }) => {
    const sub = validPushSubscription(body as Record<string, unknown>);
    if (!sub) {
      throw errors.badRequest('Subscription tidak valid.', 'INVALID_PAYLOAD');
    }

    const userAgent = userAgentOf(req);

    // Upsert: kalau endpoint sama sudah ada, perbarui keys (bisa berubah).
    await db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        userAgent,
      })
      .onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
        set: {
          p256dh: sub.p256dh,
          auth: sub.auth,
          userAgent,
        },
      });

    return NextResponse.json({ ok: true });
  }
);

export const DELETE = apiHandler(
  { route: '/api/push/subscribe.DELETE', rateLimit: mutationRateLimit },
  async ({ userId, req }) => {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');

    if (endpoint) {
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
    } else {
      // Hapus SEMUA subscription user (opt-out total).
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      logger.info('push.subscriptions_cleared', { userId });
    }

    return NextResponse.json({ ok: true });
  }
);
