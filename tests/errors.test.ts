import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError, errors, apiErrorResponse, readJsonBody } from '@/lib/errors';

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
    const res = apiErrorResponse(errors.badRequest('Input tidak valid'), { route: '/test' });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Input tidak valid');
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('menyembunyikan pesan AppError yang expose=false', async () => {
    const res = apiErrorResponse(new AppError('DB_DOWN', 'password=rahasia123 gagal', 500, false), {
      route: '/test',
    });
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Terjadi kesalahan pada server.');
    expect(JSON.stringify(body)).not.toContain('rahasia123');
  });

  it('error tak dikenal → 500 generik, tidak bocor', async () => {
    const res = apiErrorResponse(new Error('connection string postgres://user:pass@host'), {
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
    const res = apiErrorResponse(upstream, { route: '/test' });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toContain('quota exceeded');
  });

  it('error upstream 502/504 juga dipetakan', async () => {
    for (const status of [502, 504]) {
      const res = apiErrorResponse(Object.assign(new Error('x'), { status }), { route: '/t' });
      expect(res.status).toBe(503);
    }
  });

  it('error 400 dari upstream TIDAK dianggap upstream failure', async () => {
    const res = apiErrorResponse(Object.assign(new Error('bad'), { status: 400 }), { route: '/t' });
    expect(res.status).toBe(500);
  });

  it('menerima error non-object (string/undefined)', async () => {
    for (const value of ['boom', undefined, null, 42]) {
      const res = apiErrorResponse(value, { route: '/t' });
      expect(res.status).toBe(500);
    }
  });

  it('menulis log tanpa membocorkan secret', () => {
    const spy = vi.spyOn(console, 'error');
    apiErrorResponse(new Error('x'), {
      route: '/test',
      meta: { apiKey: 'AIzaSySECRET', authorization: 'Bearer token123' },
    });

    const logged = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).not.toContain('AIzaSySECRET');
    expect(logged).not.toContain('token123');
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
