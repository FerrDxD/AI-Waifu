/**
 * Alerting keluar dari aplikasi (M7.5).
 *
 * Dua pemicu:
 *  1. **Lonjakan error 5xx** — `reportRouteError5xx` dipanggil dari
 *     `apiErrorResponse` (choke point seluruh route API). Error 4xx TIDAK
 *     dihitung: itu kesalahan user, bukan insiden.
 *  2. **Cap biaya AI harian** — `sendWebhookAlert` dipanggil dari
 *     `lib/ai/usage.ts` (sebelumnya hanya `logger.warn`, utang M7.1).
 *
 * Tujuan webhook (env `ALERT_WEBHOOK_URL`, opsional): Discord atau Slack —
 * format payload dideteksi dari URL. Kalau env kosong, SEMUA fungsi di modul
 * ini no-op sunyi: aplikasi tidak boleh rusak karena alerting belum dikonfigurasi.
 *
 * Jendela error: 5 menit, dihitung di store rate limit yang SAMA dengan
 * limiter produksi (tabel `rateLimitCounters`) — increment atomik
 * `ON CONFLICT ... RETURNING count` menjamin HANYA SATU pemanggil yang
 * melihat `count === threshold`, jadi tepat satu alert per jendela, tanpa
 * lock tambahan.
 *
 * Semua fungsi IO fail-open: jaringan/timeout/DB down tidak boleh mengubah
 * response user atau menggagalkan pencatatan biaya.
 */
import { dbRateLimitStore } from '@/lib/rate-limit/store';
import { optionalEnvVar } from '@/lib/env';
import { logger } from '@/lib/logger';

/** Jendela penghitung error: 5 menit (epoch-aligned). */
export const ALERT_WINDOW_MS = 5 * 60 * 1000;

/** Default ambang error 5xx per jendela kalau env tidak diset. */
export const DEFAULT_5XX_THRESHOLD = 10;

/** Timeout kirim webhook — alert boleh lambat, jangan pernah menggantung response. */
const WEBHOOK_TIMEOUT_MS = 3000;

// --- Fungsi murni (di-unit-test) ---------------------------------------------

/** Awal jendela 5 menit untuk `now` (epoch-aligned, floor). */
export function alertBucketStart(now: Date): Date {
  return new Date(Math.floor(now.getTime() / ALERT_WINDOW_MS) * ALERT_WINDOW_MS);
}

export type WebhookKind = 'discord' | 'slack' | 'unknown';

/** Deteksi jenis webhook dari URL (Discord vs Slack vs lain). */
export function detectWebhookKind(url: string): WebhookKind {
  if (
    url.includes('discord.com/api/webhooks') ||
    url.includes('discordapp.com/api/webhooks')
  ) {
    return 'discord';
  }
  if (url.includes('hooks.slack.com/services')) {
    return 'slack';
  }
  return 'unknown';
}

/**
 * Body JSON webhook per jenis.
 * - Discord: `content` (markdown `**tebal**`).
 * - Slack: `text` (markdown `*tebal*`).
 * - Unknown: kirim KEDUA field — kedua platform mengabaikan key asing,
 *   jadi webhook kustom (n8n, Zapier, dll.) tetap dapat pesan.
 */
export function buildWebhookBody(
  kind: WebhookKind,
  title: string,
  lines: string[]
): Record<string, string> {
  const body = lines.join('\n');
  if (kind === 'discord') return { content: `**${title}**\n${body}` };
  if (kind === 'slack') return { text: `*${title}*\n${body}` };
  return { content: `**${title}**\n${body}`, text: `*${title}*\n${body}` };
}

/** Ambang error 5xx per jendela dari env (default `DEFAULT_5XX_THRESHOLD`). */
export function errorThreshold(): number {
  const raw = optionalEnvVar('ALERT_5XX_THRESHOLD');
  if (raw === undefined) return DEFAULT_5XX_THRESHOLD;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : DEFAULT_5XX_THRESHOLD;
}

// --- Fungsi IO (fail-open) -----------------------------------------------------

export interface SendAlertResult {
  sent: boolean;
  /** Alasan gagal — untuk log, bukan untuk user. */
  reason?: string;
}

/**
 * Kirim satu pesan ke webhook yang dikonfigurasi.
 * Tidak pernah melempar; timeout 3 detik.
 */
export async function sendWebhookAlert(title: string, lines: string[]): Promise<SendAlertResult> {
  const url = optionalEnvVar('ALERT_WEBHOOK_URL');
  if (!url) return { sent: false, reason: 'no_webhook_configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildWebhookBody(detectWebhookKind(url), title, lines)),
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.error('alert.webhook_rejected (fail-open)', { status: res.status });
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (error) {
    logger.error('alert.webhook_failed (fail-open)', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { sent: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Hitung satu error 5xx route API; kirim webhook saat ambang tercapai
 * (tepat sekali per jendela 5 menit).
 *
 * Dipanggil `await` dari `apiErrorResponse` — increment-nya WAJIB persist
 * (bukan fire-and-forget): serverless yang membeku setelah response akan
 * kehilangan hitungan, dan alert bisa tidak pernah menyala.
 */
export async function reportRouteError5xx(route: string): Promise<void> {
  try {
    const bucket = alertBucketStart(new Date());
    const count = await dbRateLimitStore.increment(`alerts:5xx:${bucket.getTime()}`, bucket);
    if (count !== errorThreshold()) return;

    const result = await sendWebhookAlert('Lonjakan error 5xx — Livia', [
      `Route pemicu: ${route}`,
      `Error ke-${count} dalam jendela ${ALERT_WINDOW_MS / 60000} menit (ambang ${errorThreshold()}).`,
      `Waktu: ${new Date().toISOString()}`,
    ]);
    if (!result.sent) {
      logger.warn('alert.5xx_not_delivered (fail-open)', { route, reason: result.reason });
    }
  } catch (error) {
    // Store DB down → count tidak bisa dijamin; detector utamanya tetap
    // status page (UptimeRobot/Better Stack) yang memonitor /api/health.
    logger.error('alert.report_5xx_failed (fail-open)', {
      route,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
