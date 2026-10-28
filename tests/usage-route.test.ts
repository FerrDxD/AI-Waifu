import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock `@/lib/auth` dan `@/lib/ai/usage` terdaftar GLOBAL di tests/setup.ts
// (pola holder via globalThis — lihat komentar di file itu). Dengan isolate:
// false, vi.mock per file tidak andal antar file dalam satu worker.
import {
  setMockAuth,
  resetMockAuth,
  setMockUsageOverview,
  getMockUsageOverviewCalls,
  resetMockUsage,
} from '@/tests/setup';
import { __resetEnvCacheForTests } from '@/lib/env';
import { GET } from '@/app/api/usage/route';

/** Bentuk ringkas overview — test asersi pass-through, bukan isi DB. */
const fakeOverview = {
  days: 14,
  daily: [{ day: '2026-10-28', requests: 3, inputTokens: 6000, outputTokens: 900, costMicros: 1500, capExceededAt: null }],
  byOperation: [{ operation: 'chat', requests: 3, inputTokens: 6000, outputTokens: 900, costMicros: 1500 }],
  byModel: [{ model: 'gemini-3.6-flash', requests: 3, inputTokens: 6000, outputTokens: 900, costMicros: 1500 }],
  byUser: [{ userId: 'u-1', email: 'owner@example.com', requests: 3, inputTokens: 6000, outputTokens: 900, costMicros: 1500, userKeyRequests: 0 }],
  tts: { requests: 10, cacheHits: 9, cacheHitRate: 0.9, charsBilled: 1200 },
  budget: { limitUsd: 5, todayCostUsd: 0.0015, exceededAt: null },
};

const call = (url: string) =>
  (GET as unknown as (r: Request, c: { params: Record<string, string> }) => Promise<Response>)(
    new Request(url, { method: 'GET' }),
    { params: {} }
  );

/** Variabel wajib lain yang divalidasi `requireEnv` (pola tests/env.test.ts). */
const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED);
  delete process.env.OWNER_EMAIL;
  __resetEnvCacheForTests();
  resetMockAuth();
  resetMockUsage();
  setMockUsageOverview(fakeOverview);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  process.env = snapshot;
  __resetEnvCacheForTests();
  resetMockUsage();
  vi.restoreAllMocks();
});

describe('GET /api/usage (M7.1)', () => {
  it('401 tanpa sesi', async () => {
    setMockAuth(null);
    const res = await call('http://localhost/api/usage');
    expect(res.status).toBe(401);
  });

  it('403 ketika OWNER_EMAIL belum diset (default aman — semua orang ditolak)', async () => {
    setMockAuth({ user: { id: 'u-1', email: 'owner@example.com' } });
    const res = await call('http://localhost/api/usage');
    expect(res.status).toBe(403);
    // Tidak boleh menyentuh kueri DB sama sekali.
    expect(getMockUsageOverviewCalls()).toHaveLength(0);
  });

  it('403 untuk user login yang bukan owner', async () => {
    process.env.OWNER_EMAIL = 'owner@example.com';
    __resetEnvCacheForTests();
    setMockAuth({ user: { id: 'u-2', email: 'orang-lain@example.com' } });
    const res = await call('http://localhost/api/usage');
    expect(res.status).toBe(403);
    expect(getMockUsageOverviewCalls()).toHaveLength(0);
  });

  it('200 untuk owner — overview di-pass-through utuh', async () => {
    process.env.OWNER_EMAIL = 'Owner@Example.com'; // casing beda, harus tetap match
    __resetEnvCacheForTests();
    setMockAuth({ user: { id: 'u-1', email: 'owner@example.com' } });

    const res = await call('http://localhost/api/usage');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fakeOverview);
    // Default 14 hari → getUsageOverview dipanggil tanpa argumen days.
    expect(getMockUsageOverviewCalls()).toEqual([{}]);
  });

  it('?days=7 diteruskan ke getUsageOverview', async () => {
    process.env.OWNER_EMAIL = 'owner@example.com';
    __resetEnvCacheForTests();
    setMockAuth({ user: { id: 'u-1', email: 'owner@example.com' } });

    const res = await call('http://localhost/api/usage?days=7');

    expect(res.status).toBe(200);
    expect(getMockUsageOverviewCalls()).toEqual([{ days: 7 }]);
  });

  it('?days=abc (invalid) jatuh ke default — tidak diteruskan', async () => {
    process.env.OWNER_EMAIL = 'owner@example.com';
    __resetEnvCacheForTests();
    setMockAuth({ user: { id: 'u-1', email: 'owner@example.com' } });

    const res = await call('http://localhost/api/usage?days=abc');

    expect(res.status).toBe(200);
    expect(getMockUsageOverviewCalls()).toEqual([{}]);
  });

  it('error dari kueri DB → 5xx bersih (pesan tidak bocor ke log client)', async () => {
    process.env.OWNER_EMAIL = 'owner@example.com';
    __resetEnvCacheForTests();
    setMockAuth({ user: { id: 'u-1', email: 'owner@example.com' } });
    setMockUsageOverview(() => {
      throw new Error('neon connection refused');
    });

    const res = await call('http://localhost/api/usage');

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('neon connection refused');
  });
});
