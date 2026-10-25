import { describe, it, expect } from 'vitest';
import {
  aiRateLimit,
  mutationRateLimit,
  registerRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/rate-limit';

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

    aiRateLimit.reset(key);
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
