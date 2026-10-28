import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// `@/lib/auth` terdaftar GLOBAL di tests/setup.ts (pola holder). `@/lib/feedback`
// di-mock per file: SATU-SATUNYA konsumen yang di-import test ini (route), jadi
// aman — pola yang sama dengan `@/lib/analytics/queries` di analytics-route.
// Halaman `/feedback` (konsumen lain lib/feedback) tidak di-import test mana pun.
import { setMockAuth, resetMockAuth } from '@/tests/setup';
import { __resetEnvCacheForTests } from '@/lib/env';
import { saveChatRating } from '@/lib/feedback';
import { POST } from '@/app/api/chat/feedback/route';

const validMessageId = '11111111-2222-4333-8444-555555555555';

vi.mock('@/lib/feedback', () => ({
  saveChatRating: vi.fn(async (_userId: string, _messageId: string, rating: 'up' | 'down') => rating),
  getUserFeedbackMap: vi.fn(async () => ({})),
  getFeedbackRows: vi.fn(async () => []),
  scenarioSnippet: vi.fn(() => 's({ ... })'),
  CHAT_RATINGS: ['up', 'down'],
}));

const call = (url: string, body: unknown) =>
  (POST as unknown as (r: Request, c: unknown) => Promise<Response>)(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    {}
  );

/** Variabel wajib yang divalidasi `requireEnv` (pola tests/env.test.ts). */
const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED);
  __resetEnvCacheForTests();
  resetMockAuth();
  vi.mocked(saveChatRating).mockClear();
  vi.mocked(saveChatRating).mockImplementation(async (_u, _m, rating) => rating);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  process.env = snapshot;
  __resetEnvCacheForTests();
  resetMockAuth();
  vi.restoreAllMocks();
});

describe('POST /api/chat/feedback (M7.4)', () => {
  it('401 tanpa sesi', async () => {
    setMockAuth(null);
    const res = await call('http://localhost/api/chat/feedback', {
      messageId: validMessageId,
      rating: 'up',
    });
    expect(res.status).toBe(401);
    expect(saveChatRating).not.toHaveBeenCalled();
  });

  it('400 body rusak (bukan JSON)', async () => {
    setMockAuth({ user: { id: 'u-1', email: 'a@b.c' } });
    const res = await call('http://localhost/api/chat/feedback', 'bukan-json');
    expect(res.status).toBe(400);
    expect(saveChatRating).not.toHaveBeenCalled();
  });

  it('400 rating di luar up/down', async () => {
    setMockAuth({ user: { id: 'u-1', email: 'a@b.c' } });
    const res = await call('http://localhost/api/chat/feedback', {
      messageId: validMessageId,
      rating: 'suka-suka',
    });
    expect(res.status).toBe(400);
    expect(saveChatRating).not.toHaveBeenCalled();
  });

  it('400 messageId bukan uuid', async () => {
    setMockAuth({ user: { id: 'u-1', email: 'a@b.c' } });
    for (const bad of ['abc', '', 123, null]) {
      const res = await call('http://localhost/api/chat/feedback', {
        messageId: bad,
        rating: 'up',
      });
      expect(res.status).toBe(400);
    }
    expect(saveChatRating).not.toHaveBeenCalled();
  });

  it('404 ketika pesan tidak ada / bukan milik user (mock return null)', async () => {
    setMockAuth({ user: { id: 'u-1', email: 'a@b.c' } });
    vi.mocked(saveChatRating).mockResolvedValueOnce(null);

    const res = await call('http://localhost/api/chat/feedback', {
      messageId: validMessageId,
      rating: 'down',
    });

    expect(res.status).toBe(404);
    expect(saveChatRating).toHaveBeenCalledWith('u-1', validMessageId, 'down');
  });

  it('200 untuk rating up — rating efektif dikembalikan', async () => {
    setMockAuth({ user: { id: 'u-1', email: 'a@b.c' } });
    const res = await call('http://localhost/api/chat/feedback', {
      messageId: validMessageId,
      rating: 'up',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rating: 'up' });
  });

  it('200 untuk re-rating (up lalu down) — mock menerima rating baru apa adanya', async () => {
    setMockAuth({ user: { id: 'u-1', email: 'a@b.c' } });

    const first = await call('http://localhost/api/chat/feedback', {
      messageId: validMessageId,
      rating: 'up',
    });
    const second = await call('http://localhost/api/chat/feedback', {
      messageId: validMessageId,
      rating: 'down',
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ rating: 'down' });
    expect(saveChatRating).toHaveBeenCalledTimes(2);
    expect(saveChatRating).toHaveBeenLastCalledWith('u-1', validMessageId, 'down');
  });
});
