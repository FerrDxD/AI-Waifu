import { describe, it, expect, vi } from 'vitest';

/**
 * M5.5: store produksi (Postgres/Neon) diganti in-memory lewat tests/setup.ts
 * (bukan vi.mock per file — `isolate: false` membuatnya tidak andal).
 * Yang diuji di sini: algoritma + konfigurasi limiter produksi.
 */
import {
  aiRateLimit,
  mutationRateLimit,
  registerRateLimit,
  createLimiter,
  getClientIp,
  rateLimitResponse,
} from '@/lib/rate-limit';
import { createMemoryStore } from './helpers/limiter';
import { logger } from '@/lib/logger';

/** Key unik per tes supaya state in-memory tidak saling mencemari. */
const unique = (() => {
  let n = 0;
  return (prefix: string) => `${prefix}-${Date.now()}-${++n}`;
})();

describe('aiRateLimit', () => {
  it('mengizinkan 5 request pertama, menolak yang ke-6', async () => {
    const key = unique('ai');
    for (let i = 0; i < 5; i++) {
      const result = await aiRateLimit.limit(key);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }

    const blocked = await aiRateLimit.limit(key);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('reset() mengosongkan bucket', async () => {
    const key = unique('ai-reset');
    for (let i = 0; i < 5; i++) await aiRateLimit.limit(key);
    expect((await aiRateLimit.limit(key)).success).toBe(false);

    await aiRateLimit.reset(key);
    expect((await aiRateLimit.limit(key)).success).toBe(true);
  });

  it('key berbeda punya kuota terpisah', async () => {
    const a = unique('ai-a');
    const b = unique('ai-b');
    for (let i = 0; i < 5; i++) await aiRateLimit.limit(a);

    expect((await aiRateLimit.limit(a)).success).toBe(false);
    expect((await aiRateLimit.limit(b)).success).toBe(true);
  });

  it('resetAt selalu di masa depan', async () => {
    const result = await aiRateLimit.limit(unique('ai-time'));
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

describe('limit lain punya konfigurasi wajar', () => {
  it('mutationRateLimit mengizinkan 30/menit', async () => {
    const key = unique('mut');
    for (let i = 0; i < 30; i++) {
      expect((await mutationRateLimit.limit(key)).success).toBe(true);
    }
    expect((await mutationRateLimit.limit(key)).success).toBe(false);
  });

  it('registerRateLimit lebih ketat: 5/10 menit', async () => {
    const key = unique('reg');
    for (let i = 0; i < 5; i++) {
      expect((await registerRateLimit.limit(key)).success).toBe(true);
    }
    expect((await registerRateLimit.limit(key)).success).toBe(false);
  });
});

describe('multi-cap: window + harian + bulanan (M5.5)', () => {
  it('cap harian menang setelah window per-menit pulih', async () => {
    const key = unique('daily');
    const limiter = createLimiter({
      name: `daily-${key}`,
      caps: [
        { limit: 2, windowMs: 60_000 },
        { limit: 3, windowMs: 24 * 60 * 60_000 },
      ],
      store: createMemoryStore(),
    });

    expect((await limiter.limit(key)).success).toBe(true); // menit:1, hari:1
    expect((await limiter.limit(key)).success).toBe(true); // menit:2, hari:2
    expect((await limiter.limit(key)).success).toBe(false); // menit:3 → ditolak
    expect((await limiter.limit(key)).success).toBe(false); // menit:4 → ditolak
  });

  it('request yang ditolak cap pendek tidak menambah cap panjang', async () => {
    vi.useFakeTimers();
    try {
      const key = unique('multi');
      const limiter = createLimiter({
        name: `multi-${key}`,
        caps: [
          { limit: 2, windowMs: 60_000 },
          { limit: 3, windowMs: 24 * 60 * 60_000 },
        ],
        store: createMemoryStore(),
      });

      expect((await limiter.limit(key)).success).toBe(true);
      expect((await limiter.limit(key)).success).toBe(true);
      expect((await limiter.limit(key)).success).toBe(false); // ditolak per-menit (hari tetap 2)
      expect((await limiter.limit(key)).success).toBe(false); // ditolak per-menit

      vi.advanceTimersByTime(61_000); // window per-menit baru

      expect((await limiter.limit(key)).success).toBe(true); // hari:3 — kalau request ditolak
      // tadi ikut menambah cap harian, request ini sudah pasti gagal
      const blocked = await limiter.limit(key); // hari:4 > 3 → cap harian menang
      expect(blocked.success).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cap dengan alert memicu logger.warn sekali saat pertama terlampaui', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const key = unique('alert');
      const limiter = createLimiter({
        name: `alert-${key}`,
        caps: [{ limit: 1, windowMs: 60_000, alert: 'tes-quota-ai' }],
        store: createMemoryStore(),
      });

      expect((await limiter.limit(key)).success).toBe(true);
      expect((await limiter.limit(key)).success).toBe(false); // count=2 == limit+1 → warn
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][1]).toMatchObject({ limiter: `alert-${key}`, cap: 'tes-quota-ai' });

      expect((await limiter.limit(key)).success).toBe(false); // count=3 → tidak double-warn
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('getClientIp', () => {
  const req = (headers: Record<string, string>) => new Request('http://localhost/', { headers });

  it('mengambil IP pertama dari x-forwarded-for', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('trim spasi', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '  9.9.9.9  ' }))).toBe('9.9.9.9');
  });

  it('fallback ke x-real-ip', () => {
    expect(getClientIp(req({ 'x-real-ip': '7.7.7.7' }))).toBe('7.7.7.7');
  });

  it('fallback konstan kalau tidak ada header', () => {
    expect(getClientIp(req({}))).toBe('unknown');
  });

  it('mengabaikan x-forwarded-for kosong', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '   ', 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
  });
});

describe('rateLimitResponse', () => {
  it('mengembalikan 429 dengan Retry-After', async () => {
    const response = rateLimitResponse(
      { success: false, remaining: 0, resetAt: Date.now() + 30_000, retryAfterSeconds: 30 },
      'Terlalu banyak permintaan.'
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');

    const body = await response.json();
    expect(body).toEqual({ error: 'Terlalu banyak permintaan.', code: 'RATE_LIMITED' });
  });
});
