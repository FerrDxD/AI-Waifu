import { NextResponse } from 'next/server';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import {
  isPushEnabled,
  sendPushToUser,
  recordPushSentLog,
  type PushPayload,
} from '@/lib/push/push.server';

/**
 * M8.5 — POST /api/push/send
 * Kirim push dari client (fire-and-forget) ke semua subscription user.
 *
 * Hanya `kind: 'pomodoro'` yang boleh dipicu client. Reminder & "Livia
 * kangen" hanya dari cron server (guard `CRON_SECRET`).
 */

type SendBody = { kind?: unknown; title?: unknown; body?: unknown; url?: unknown };

// Judul/pesan default per kind — client tidak boleh mengirim teks bebas
// (anti-spam: teks selalu dari server).
const DEFAULT_CONTENT: Record<string, { title: string; body: string; url?: string }> = {
  pomodoro: {
    title: 'Sesi Fokus Selesai! 🎉',
    body: 'Hebat! Kamu menyelesaikan satu sesi fokus. Istirahat sebentar ya.',
    url: '/pomodoro',
  },
};

export const POST = jsonApiHandler<SendBody>(
  {
    route: '/api/push/send.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak request. Coba lagi nanti.',
  },
  async ({ userId, body }) => {
    if (body.kind !== 'pomodoro') {
      throw errors.badRequest('Hanya pomodoro yang boleh dipicu client.', 'INVALID_PAYLOAD');
    }

    if (!isPushEnabled()) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const content = DEFAULT_CONTENT.pomodoro;
    const payload: PushPayload = {
      title: content.title,
      body: content.body,
      url: content.url,
      kind: 'pomodoro',
    };

    const result = await sendPushToUser(userId, payload);
    await recordPushSentLog(
      userId,
      'pomodoro',
      payload,
      result.delivered > 0 ? 'sent' : 'dropped'
    );

    return NextResponse.json({ ok: true, ...result });
  }
);
