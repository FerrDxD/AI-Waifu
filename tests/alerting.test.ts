import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { __resetEnvCacheForTests } from '@/lib/env';
import { dbRateLimitStore } from '@/lib/rate-limit/store';
import {
  DEFAULT_5XX_THRESHOLD,
  alertBucketStart,
  buildWebhookBody,
  detectWebhookKind,
  errorThreshold,
  reportRouteError5xx,
  sendWebhookAlert,
} from '@/lib/alerting';

/**
 * M7.5: alerting keluar dari aplikasi.
 *
 * Store rate limit (untuk penghitung jendela 5xx) SUDAH di-mock in-memory
 * global di tests/setup.ts — di sini cukup di-reset antar test. Fetch di-stub
 * per test (vi.stubGlobal, di-restore di afterEach) — tidak pernah ada
 * permintaan jaringan sungguhan.
 */

const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

const DISCORD_URL = 'https://discord.com/api/webhooks/123/abc';
const SLACK_URL = 'https://hooks.slack.com/services/T000/B000/xyz';

let snapshot: NodeJS.ProcessEnv;

function resetAlertStore() {
  const g = globalThis as Record<string, unknown>;
  (g.__mockRateLimitStore as { reset: () => void } | undefined)?.reset();
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED);
  __resetEnvCacheForTests();
  resetAlertStore();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  process.env = snapshot;
  __resetEnvCacheForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('alertBucketStart (murni)', () => {
  it('membulatkan ke bawah ke kelipatan 5 menit', () => {
    const now = new Date('2026-10-29T10:07:33.999Z');
    expect(alertBucketStart(now).toISOString()).toBe('2026-10-29T10:05:00.000Z');
  });

  it('batas tepat tidak bergeser (10:05:00 → 10:05:00)', () => {
    const now = new Date('2026-10-29T10:05:00.000Z');
    expect(alertBucketStart(now).toISOString()).toBe('2026-10-29T10:05:00.000Z');
  });

  it('menit ke-4 masih di jendela pertama (10:04:59 → 10:00:00)', () => {
    const now = new Date('2026-10-29T10:04:59.999Z');
    expect(alertBucketStart(now).toISOString()).toBe('2026-10-29T10:00:00.000Z');
  });
});

describe('detectWebhookKind (murni)', () => {
  it('discord.com & discordapp.com → discord', () => {
    expect(detectWebhookKind(DISCORD_URL)).toBe('discord');
    expect(detectWebhookKind('https://discordapp.com/api/webhooks/1/a')).toBe('discord');
  });

  it('hooks.slack.com → slack', () => {
    expect(detectWebhookKind(SLACK_URL)).toBe('slack');
  });

  it('URL lain → unknown (mis. n8n/Zapier)', () => {
    expect(detectWebhookKind('https://hooks.example.com/incoming')).toBe('unknown');
  });
});

describe('buildWebhookBody (murni)', () => {
  it('discord: field content, judul tebal **', () => {
    const body = buildWebhookBody('discord', 'Judul', ['baris 1', 'baris 2']);
    expect(body).toEqual({ content: '**Judul**\nbaris 1\nbaris 2' });
  });

  it('slack: field text, judul tebal *', () => {
    const body = buildWebhookBody('slack', 'Judul', ['baris 1']);
    expect(body).toEqual({ text: '*Judul*\nbaris 1' });
  });

  it('unknown: kirim kedua field (platform mengabaikan key asing)', () => {
    const body = buildWebhookBody('unknown', 'Judul', ['baris 1']);
    expect(body.content).toContain('Judul');
    expect(body.text).toContain('Judul');
  });
});

describe('errorThreshold (env)', () => {
  it('default 10 kalau env kosong', () => {
    expect(errorThreshold()).toBe(DEFAULT_5XX_THRESHOLD);
    expect(DEFAULT_5XX_THRESHOLD).toBe(10);
  });

  it('menghormati env', () => {
    process.env.ALERT_5XX_THRESHOLD = '3';
    __resetEnvCacheForTests();
    expect(errorThreshold()).toBe(3);
  });
});

describe('sendWebhookAlert (IO, fetch di-stub)', () => {
  it('env kosong → no-op sunyi, fetch tidak dipanggil', async () => {
    const result = await sendWebhookAlert('x', ['y']);
    expect(result).toEqual({ sent: false, reason: 'no_webhook_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('discord: POST JSON dengan payload content; 204 = sukses', async () => {
    process.env.ALERT_WEBHOOK_URL = DISCORD_URL;
    __resetEnvCacheForTests();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await sendWebhookAlert('Lonjakan', ['detail']);

    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(DISCORD_URL);
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body.content).toBe('**Lonjakan**\ndetail');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('slack: payload text', async () => {
    process.env.ALERT_WEBHOOK_URL = SLACK_URL;
    __resetEnvCacheForTests();
    fetchMock.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const result = await sendWebhookAlert('Lonjakan', ['detail']);

    expect(result.sent).toBe(true);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as Record<string, string>;
    expect(body.text).toBe('*Lonjakan*\ndetail');
  });

  it('HTTP 4xx/5xx dari webhook → gagal (fail-open, tidak melempar)', async () => {
    process.env.ALERT_WEBHOOK_URL = DISCORD_URL;
    __resetEnvCacheForTests();
    fetchMock.mockResolvedValueOnce(new Response('forbidden', { status: 403 }));

    const result = await sendWebhookAlert('x', ['y']);
    expect(result).toEqual({ sent: false, reason: 'http_403' });
  });

  it('jaringan mati / timeout (abort) → gagal (fail-open)', async () => {
    process.env.ALERT_WEBHOOK_URL = DISCORD_URL;
    __resetEnvCacheForTests();
    fetchMock.mockRejectedValueOnce(new Error('aborted'));

    const result = await sendWebhookAlert('x', ['y']);
    expect(result).toEqual({ sent: false, reason: 'network' });
  });
});

describe('reportRouteError5xx (jendela 5 menit)', () => {
  it('hanya sekali webhook per jendela, tepat di ambang', async () => {
    process.env.ALERT_5XX_THRESHOLD = '3';
    process.env.ALERT_WEBHOOK_URL = DISCORD_URL;
    __resetEnvCacheForTests();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await reportRouteError5xx('/api/a');
    await reportRouteError5xx('/api/b');
    expect(fetchMock).not.toHaveBeenCalled();

    await reportRouteError5xx('/api/c');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Error ke-4 di jendela yang sama: count 4 ≠ ambang 3 → tidak spam.
    await reportRouteError5xx('/api/d');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as Record<string, string>;
    expect(body.content).toContain('/api/c');
    expect(body.content).toContain('ke-3');
  });

  it('jendela baru (key baru) → penghitung mulai dari 1, boleh alert lagi', async () => {
    process.env.ALERT_5XX_THRESHOLD = '2';
    process.env.ALERT_WEBHOOK_URL = DISCORD_URL;
    __resetEnvCacheForTests();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await reportRouteError5xx('/api/a');
    await reportRouteError5xx('/api/b');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Key jendela mengandung timestamp bucket (lihat alertBucketStart —
    // diuji terpisah di atas). Reset store mensimulasikan masuknya jendela
    // 5 menit berikutnya: key baru → hitungan mulai dari 1 lagi.
    resetAlertStore();

    await reportRouteError5xx('/api/c');
    await reportRouteError5xx('/api/d');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('store DB down → tidak melempar, tidak ada webhook (fail-open)', async () => {
    process.env.ALERT_5XX_THRESHOLD = '1';
    process.env.ALERT_WEBHOOK_URL = DISCORD_URL;
    __resetEnvCacheForTests();

    // `dbRateLimitStore` yang di-import adalah instance mock in-memory dari
    // tests/setup.ts — patch increment-nya untuk mensimulasikan DB down.
    const originalIncrement = dbRateLimitStore.increment;
    dbRateLimitStore.increment = async () => {
      throw new Error('neon down');
    };

    await expect(reportRouteError5xx('/api/a')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();

    dbRateLimitStore.increment = originalIncrement;
  });
});
