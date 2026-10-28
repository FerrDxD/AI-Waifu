import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError, errors, apiErrorResponse, readJsonBody } from '@/lib/errors';
import { __resetEnvCacheForTests } from '@/lib/env';

beforeEach(() => {
  // Logging tidak perlu berisik saat tes.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppError', () => {
  it('menyimpan code, status, dan expose', () => {
    const err = new AppError('X', 'pesan', 418, true);
    expect(err.code).toBe('X');
    expect(err.statusCode).toBe(418);
    expect(err.expose).toBe(true);
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it('default: 500 dan tidak di-expose', () => {
    const err = new AppError('X', 'internal');
    expect(err.statusCode).toBe(500);
    expect(err.expose).toBe(false);
  });
});

describe('factory errors', () => {
  it('unauthorized → 401 dan aman ditampilkan', () => {
    const err = errors.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.expose).toBe(true);
  });

  it('forbidden → 403', () => {
    expect(errors.forbidden().statusCode).toBe(403);
  });

  it('notFound menyertakan nama resource', () => {
    const err = errors.notFound('Livia');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('Livia');
  });

  it('badRequest menerima code kustom', () => {
    const err = errors.badRequest('rusak', 'INVALID_JSON');
    expect(err.code).toBe('INVALID_JSON');
    expect(err.statusCode).toBe(400);
  });

  it('tooManyRequests → 429', () => {
    expect(errors.tooManyRequests().statusCode).toBe(429);
  });

  it('upstream → 503 dan aman ditampilkan', () => {
    const err = errors.upstream();
    expect(err.statusCode).toBe(503);
    expect(err.expose).toBe(true);
  });

  it('internal → 500 dan TIDAK di-expose', () => {
    const err = errors.internal('detail rahasia');
    expect(err.statusCode).toBe(500);
    expect(err.expose).toBe(false);
  });
});

describe('apiErrorResponse', () => {
  it('mengirim pesan AppError yang expose=true', async () => {
    const res = await apiErrorResponse(errors.badRequest('Input tidak valid'), { route: '/test' });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Input tidak valid');
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('menyembunyikan pesan AppError yang expose=false', async () => {
    const res = await apiErrorResponse(new AppError('DB_DOWN', 'password=rahasia123 gagal', 500, false), {
      route: '/test',
    });
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Terjadi kesalahan pada server.');
    expect(JSON.stringify(body)).not.toContain('rahasia123');
  });

  it('error tak dikenal → 500 generik, tidak bocor', async () => {
    const res = await apiErrorResponse(new Error('connection string postgres://user:pass@host'), {
      route: '/test',
    });
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Terjadi kesalahan pada server.');
    expect(JSON.stringify(body)).not.toContain('postgres://');
    expect(JSON.stringify(body)).not.toContain('pass');
  });

  it('error upstream 429/503 dipetakan ke 503 ramah', async () => {
    const upstream = Object.assign(new Error('quota exceeded'), { status: 429 });
    const res = await apiErrorResponse(upstream, { route: '/test' });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toContain('quota exceeded');
  });

  it('error upstream 502/504 juga dipetakan', async () => {
    for (const status of [502, 504]) {
      const res = await apiErrorResponse(Object.assign(new Error('x'), { status }), { route: '/t' });
      expect(res.status).toBe(503);
    }
  });

  it('error 400 dari upstream TIDAK dianggap upstream failure', async () => {
    const res = await apiErrorResponse(Object.assign(new Error('bad'), { status: 400 }), { route: '/t' });
    expect(res.status).toBe(500);
  });

  it('menerima error non-object (string/undefined)', async () => {
    for (const value of ['boom', undefined, null, 42]) {
      const res = await apiErrorResponse(value, { route: '/t' });
      expect(res.status).toBe(500);
    }
  });

  it('menulis log tanpa membocorkan secret', async () => {
    const spy = vi.spyOn(console, 'error');
    await apiErrorResponse(new Error('x'), {
      route: '/test',
      meta: { apiKey: 'AIzaSySECRET', authorization: 'Bearer token123' },
    });

    const logged = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).not.toContain('AIzaSySECRET');
    expect(logged).not.toContain('token123');
  });
});

/**
 * M7.5: error 5xx masuk penghitung error-rate → webhook (fail-open).
 * Store rate limit di-mock in-memory global (tests/setup.ts); fetch di-stub.
 */
describe('apiErrorResponse + alerting (M7.5)', () => {
  const REQUIRED = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    NEXTAUTH_SECRET: 'a'.repeat(40),
    GEMINI_API_KEY: 'gemini-key',
  };
  const WEBHOOK = 'https://discord.com/api/webhooks/123/abc';

  let snapshot: NodeJS.ProcessEnv;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    snapshot = { ...process.env };
    Object.assign(process.env, REQUIRED, {
      ALERT_5XX_THRESHOLD: '2',
      ALERT_WEBHOOK_URL: WEBHOOK,
    });
    __resetEnvCacheForTests();
    // Store in-memory global (tests/setup.ts) — reset agar counter 5xx
    // tidak warisan dari test lain di worker yang sama.
    (globalThis as unknown as Record<string, { reset: () => void } | undefined>)['__mockRateLimitStore']
      ?.reset();
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    process.env = snapshot;
    __resetEnvCacheForTests();
    vi.unstubAllGlobals();
  });

  it('dua error 5xx (ambang 2) → tepat satu webhook, menyebut route', async () => {
    await apiErrorResponse(new AppError('X', 'boom', 500, false), { route: '/api/chat.POST' });
    expect(fetchMock).not.toHaveBeenCalled();

    const res = await apiErrorResponse(new AppError('Y', 'boom lagi', 500, false), { route: '/api/chat.POST' });
    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)
    ) as Record<string, string>;
    expect(body.content).toContain('/api/chat.POST');
  });

  it('4xx tidak dihitung (threshold 1 pun tidak memicu)', async () => {
    await apiErrorResponse(errors.badRequest('rusak'), { route: '/t' });
    await apiErrorResponse(errors.notFound('Data'), { route: '/t' });
    await apiErrorResponse(errors.tooManyRequests(), { route: '/t' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('webhook mati → response tetap 500 (fail-open)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await apiErrorResponse(new AppError('A', 'x', 500, false), { route: '/t' });
    const res = await apiErrorResponse(new AppError('B', 'y', 500, false), { route: '/t' });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Terjadi kesalahan pada server.');
  });

  it('webhook belum dikonfigurasi → tidak ada fetch, response tetap benar', async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    __resetEnvCacheForTests();
    const res = await apiErrorResponse(new AppError('A', 'x', 500, false), { route: '/t' });
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('readJsonBody', () => {
  it('mem-parse JSON valid', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify({ hello: 'dunia' }),
    });
    await expect(readJsonBody(req)).resolves.toEqual({ hello: 'dunia' });
  });

  it('melempar AppError 400 untuk JSON rusak', async () => {
    const req = new Request('http://localhost/', { method: 'POST', body: '{rusak' });

    try {
      await readJsonBody(req);
      expect.unreachable('seharusnya throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(400);
      expect((e as AppError).code).toBe('INVALID_JSON');
    }
  });

  it('melempar AppError untuk body kosong', async () => {
    const req = new Request('http://localhost/', { method: 'POST' });
    await expect(readJsonBody(req)).rejects.toBeInstanceOf(AppError);
  });
});
