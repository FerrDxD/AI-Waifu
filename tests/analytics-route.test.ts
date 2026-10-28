import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// `@/lib/auth` terdaftar GLOBAL di tests/setup.ts (pola holder — vi.mock per
// file tidak andal dengan isolate: false). `@/lib/analytics/queries` di-mock
// per file: SATU-SATUNYA konsumen selain test ini (route), jadi aman — pola
// yang sama dengan `@/lib/tts/cache` di tts-route.test.ts.
import { setMockAuth, resetMockAuth } from '@/tests/setup';
import { __resetEnvCacheForTests } from '@/lib/env';
import { getAnalyticsOverview } from '@/lib/analytics/queries';
import { GET } from '@/app/api/analytics/route';

const fakeOverview = {
  asOf: '2026-10-28',
  retention: {
    weekly: [{ cohort: '2026-10-19', users: 2, d1: 0.5, d7: null, d30: null }],
    weighted: { d1: 0.5, d7: null, d30: null },
  },
  sessions: {
    sessions: 4,
    totalUserMessages: 11,
    totalLiviaMessages: 10,
    avgUserMessagesPerSession: 2.75,
    medianUserMessagesPerSession: 2,
    p90UserMessagesPerSession: 5,
    singleMessageSessionRate: 0.25,
  },
  onboarding: {
    buckets: [{ bucket: 'today', created: 1, done: 0 }],
    totalCreated: 3,
    totalDone: 2,
    completionRate: 2 / 3,
    neverChatted: 1,
  },
  trend: [{ day: '2026-10-28', activeUsers: 2, newUsers: 0, userMessages: 5 }],
};

const call = (url: string) =>
  (GET as unknown as (r: Request, c: { params: Record<string, string> }) => Promise<Response>)(
    new Request(url, { method: 'GET' }),
    { params: {} }
  );

let overviewCalls: number[] = [];

vi.mock('@/lib/analytics/queries', () => ({
  ANALYTICS_WINDOW_DAYS: 28,
  ANALYTICS_TREND_DAYS: 14,
  ANALYTICS_WEEKS: 8,
  getAnalyticsOverview: vi.fn(async () => {
    overviewCalls.push(1);
    return fakeOverview;
  }),
}));

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
  overviewCalls = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  process.env = snapshot;
  __resetEnvCacheForTests();
  resetMockAuth();
  vi.restoreAllMocks();
});

describe('GET /api/analytics (M7.2)', () => {
  it('401 tanpa sesi', async () => {
    setMockAuth(null);
    const res = await call('http://localhost/api/analytics');
    expect(res.status).toBe(401);
    expect(overviewCalls).toHaveLength(0);
  });

  it('403 ketika OWNER_EMAIL belum diset (default aman — semua orang ditolak)', async () => {
    setMockAuth({ user: { id: 'u-1', email: 'owner@example.com' } });
    const res = await call('http://localhost/api/analytics');
    expect(res.status).toBe(403);
    expect(overviewCalls).toHaveLength(0);
  });

  it('403 untuk user login yang bukan owner', async () => {
    process.env.OWNER_EMAIL = 'owner@example.com';
    __resetEnvCacheForTests();
    setMockAuth({ user: { id: 'u-2', email: 'orang-lain@example.com' } });
    const res = await call('http://localhost/api/analytics');
    expect(res.status).toBe(403);
    expect(overviewCalls).toHaveLength(0);
  });

  it('200 untuk owner — overview di-pass-through utuh', async () => {
    process.env.OWNER_EMAIL = 'Owner@Example.com'; // casing beda, harus tetap match
    __resetEnvCacheForTests();
    setMockAuth({ user: { id: 'u-1', email: 'owner@example.com' } });

    const res = await call('http://localhost/api/analytics');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fakeOverview);
    expect(overviewCalls).toHaveLength(1);
  });

  it('error dari kueri DB → 5xx bersih (pesan tidak bocor ke body)', async () => {
    process.env.OWNER_EMAIL = 'owner@example.com';
    __resetEnvCacheForTests();
    setMockAuth({ user: { id: 'u-1', email: 'owner@example.com' } });
    vi.mocked(getAnalyticsOverview).mockImplementationOnce(async () => {
      throw new Error('neon connection refused');
    });

    const res = await call('http://localhost/api/analytics');

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('neon connection refused');
  });
});
