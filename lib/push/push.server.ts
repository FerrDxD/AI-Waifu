/**
 * Web Push — server side (M8.5).
 *
 * Mengirim push notification ke subscription browser via protokol Web Push
 * (VAPID). Kegagalan permanen (404/410 = endpoint mati / uninstall) otomatis
 * menghapus subscription supaya cron berikutnya tidak membuang waktu.
 *
 * Fitur ini member: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
 * `VAPID_SUBJECT` (semuanya opsional — kosong = push nonaktif).
 */
import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushSubscriptions, pushSentLogs } from '@/lib/db/schema';
import { optionalEnvVar } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  /** Kategori untuk payload browser (ikon, badge, dll). */
  kind?: 'reminder' | 'pomodoro' | 'miss_you';
  /** Data tambahan bebas (mis. reminderId). */
  data?: Record<string, unknown>;
}

export interface PushSubscriptionRow {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: Date | null;
}

/** Apakah fitur push diaktifkan (semua env VAPID terisi). */
export function isPushEnabled(): boolean {
  const publicKey = optionalEnvVar('VAPID_PUBLIC_KEY');
  const privateKey = optionalEnvVar('VAPID_PRIVATE_KEY');
  const subject = optionalEnvVar('VAPID_SUBJECT');
  return Boolean(publicKey && privateKey && subject);
}

/** Inisialisasi web-push sekali (idempoten). */
let vapidConfigured = false;
function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  const publicKey = optionalEnvVar('VAPID_PUBLIC_KEY');
  const privateKey = optionalEnvVar('VAPID_PRIVATE_KEY');
  const subject = optionalEnvVar('VAPID_SUBJECT');
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys belum dikonfigurasi (VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT)');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

/**
 * Ambil daftar subscription milik user (untuk dikirimi push).
 */
export async function listSubscriptionsForUser(userId: string): Promise<PushSubscriptionRow[]> {
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  return rows as PushSubscriptionRow[];
}

/**
 * Kirim push ke satu subscription. Menghapus subscription kalau endpoint mati
 * (404/410 — perangkat di-uninstall atau subscription di-revoke).
 *
 * @returns true kalau terkirim (atau tidak perlu dikirim ulang), false kalau
 *          subscription dihapus (endpoint mati).
 */
export async function sendPushToOneSubscription(
  subscription: PushSubscriptionRow,
  payload: PushPayload,
  opts: { quiet?: boolean } = {}
): Promise<boolean> {
  if (!isPushEnabled()) return false;

  ensureVapidConfigured();

  const notification = {
    title: payload.title,
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.kind ? `tk-${payload.kind}` : 'tk-notif',
    data: payload.data ?? {},
  };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(notification),
      { TTL: 60 * 60 * 24 } // 24 jam
    );
    return true;
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;

    // 404/410 = endpoint mati. Hapus subscription (tidak akan terkirim lagi).
    // 403 = subscription masih valid tapi provider menolak (mis. notif
    // dinonaktifkan user di browser) — JANGAN hapus, biarkan.
    if (statusCode === 404 || statusCode === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
      if (!opts.quiet) {
        logger.info('push.subscription_removed', {
          userId: subscription.userId,
          endpoint: subscription.endpoint,
          statusCode,
        });
      }
      return false;
    }

    if (!opts.quiet) {
      logger.warn('push.send_failed', {
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        statusCode: statusCode ?? 'unknown',
        error: (err as Error).message,
      });
    }

    return true;
  }
}

/**
 * Kirim push ke SEMUA subscription user. Mengembalikan jumlah yang berhasil
 * (subscription valid & tidak dihapus).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  opts: { quiet?: boolean } = {}
): Promise<{ delivered: number; total: number }> {
  const subs = await listSubscriptionsForUser(userId);
  if (subs.length === 0) return { delivered: 0, total: 0 };

  let delivered = 0;
  for (const sub of subs) {
    const ok = await sendPushToOneSubscription(sub, payload, opts);
    if (ok) delivered++;
  }
  return { delivered, total: subs.length };
}

/**
 * Catat hasil kirim push ke `pushSentLogs` (observability & dedupe).
 */
export async function recordPushSentLog(
  userId: string,
  kind: 'reminder' | 'pomodoro' | 'miss_you',
  payload: PushPayload,
  status: 'sent' | 'failed' | 'dropped',
  error?: string
): Promise<void> {
  try {
    await db.insert(pushSentLogs).values({
      userId,
      kind,
      payload: payload as unknown as Record<string, unknown>,
      status,
      error: error ?? null,
    });
  } catch (err) {
    // Log tidak boleh menggagalkan pengiriman/dedupe.
    logger.warn('push.log_failed', { userId, kind, error: (err as Error).message });
  }
}
