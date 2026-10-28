import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';
import {
  apiHandler,
  jsonApiHandler,
  publicApiHandler,
  userOrIpKey,
  ipKey,
} from '@/lib/api-handler';
import { AppError } from '@/lib/errors';
import { createTestLimiter } from './helpers/limiter';
// Mock `@/lib/auth` terdaftar GLOBAL di tests/setup.ts (M6.1) — dengan
// isolate: false, vi.mock per file membuat instance terpisah per file dan
// menghasilkan flake yang bergantung urutan (lihat komentar di setup.ts).
import {
  setMockAuth,
  setMockAuthRejection,
  getMockAuthCalls,
  resetMockAuth,
} from '@/tests/setup';

const req = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/test', { method: 'POST', headers });

const call = (handler: unknown, request: Request = req()) =>
  (handler as (r: Request, c: { params: Record<string, string> }) => Promise<Response>)(request, {
    params: {},
  });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  resetMockAuth();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiHandler: autentikasi', () => {
  it('401 dan handler TIDAK dipanggil kalau belum login', async () => {
    setMockAuth(null);
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));

    const res = await call(apiHandler({ route: '/t' }, handler));

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();

    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('401 kalau session tanpa user.id', async () => {
    setMockAuth({ user: {} });
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));

    const res = await call(apiHandler({ route: '/t' }, handler));
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('meneruskan userId ke handler', async () => {
    setMockAuth({ user: { id: 'user-42' } });

    const handler = apiHandler({ route: '/t' }, async ({ userId }) =>
      NextResponse.json({ userId })
    );
    const res = await call(handler);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: 'user-42' });
  });

  it('publicApiHandler melewati pengecekan login dan userId bernilai null', async () => {
    setMockAuth(null);
    const handler = publicApiHandler({ route: '/t' }, async ({ userId }) =>
      NextResponse.json({ userId })
    );

    const res = await call(handler);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: null });
    expect(getMockAuthCalls()).toHaveLength(0);
  });
});

describe('apiHandler: rate limit', () => {
  it('429 dengan Retry-After saat limit habis, handler tidak dipanggil', async () => {
    setMockAuth({ user: { id: 'u1' } });
    const limiter = createTestLimiter({ limit: 1, windowMs: 60_000 });
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));

    const wrapped = apiHandler({ route: '/t', rateLimit: limiter }, handler);

    expect((await call(wrapped)).status).toBe(200);
    const blocked = await call(wrapped);

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('pesan 429 bisa dikustomisasi', async () => {
    setMockAuth({ user: { id: 'u1' } });
    const limiter = createTestLimiter({ limit: 1, windowMs: 60_000 });

    const wrapped = apiHandler(
      { route: '/t', rateLimit: limiter, rateLimitMessage: 'Sabar ya.' },
      async () => NextResponse.json({})
    );

    await call(wrapped);
    const blocked = await call(wrapped);
    expect((await blocked.json()).error).toBe('Sabar ya.');
  });

  it('tanpa rateLimit, tidak ada pembatasan', async () => {
    setMockAuth({ user: { id: 'u1' } });
    const handler = apiHandler({ route: '/t' }, async () => NextResponse.json({}));

    for (let i = 0; i < 20; i++) {
      expect((await call(handler)).status).toBe(200);
    }
  });

  it('rateLimitKey kustom dipakai (mis. per IP)', async () => {
    setMockAuth({ user: { id: 'u1' } });
    const limiter = createTestLimiter({ limit: 1, windowMs: 60_000 });
    const seen: string[] = [];

    const wrapped = apiHandler(
      {
        route: '/t',
        rateLimit: limiter,
        rateLimitKey: (ctx) => {
          seen.push(ctx.ip);
          return `custom:${ctx.ip}`;
        },
      },
      async () => NextResponse.json({})
    );

    await call(wrapped, req({ 'x-forwarded-for': '1.1.1.1' }));
    expect(seen).toEqual(['1.1.1.1']);
  });
});

describe('apiHandler: penanganan error', () => {
  it('AppError expose=true diteruskan ke client', async () => {
    setMockAuth({ user: { id: 'u1' } });

    const wrapped = apiHandler({ route: '/t' }, async () => {
      throw new AppError('BAD', 'Input salah.', 400, true);
    });

    const res = await call(wrapped);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Input salah.');
  });

  it('error tak dikenal jadi 500 generik tanpa bocor', async () => {
    setMockAuth({ user: { id: 'u1' } });

    const wrapped = apiHandler({ route: '/t' }, async () => {
      throw new Error('postgres://user:pass@host gagal');
    });

    const res = await call(wrapped);
    expect(res.status).toBe(500);

    const text = await res.text();
    expect(text).not.toContain('postgres://');
    expect(text).not.toContain('pass');
  });

  it('error dari auth() juga tidak bocor', async () => {
    setMockAuthRejection(new Error('JWT secret mismatch'));

    const wrapped = apiHandler({ route: '/t' }, async () => NextResponse.json({}));
    const res = await call(wrapped);

    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('JWT secret mismatch');
  });
});

describe('apiHandler: params', () => {
  it('meneruskan params route', async () => {
    setMockAuth({ user: { id: 'u1' } });

    const wrapped = apiHandler<{ id: string }>({ route: '/t' }, async ({ params }) =>
      NextResponse.json({ id: params.id })
    );

    const res = await (wrapped as never as (r: Request, c: unknown) => Promise<Response>)(req(), {
      params: { id: 'abc' },
    });

    expect(await res.json()).toEqual({ id: 'abc' });
  });
});

describe('jsonApiHandler', () => {
  it('mem-parse body JSON dan meneruskannya', async () => {
    setMockAuth({ user: { id: 'u1' } });

    const wrapped = jsonApiHandler<{ nama: string }>({ route: '/t' }, async ({ body }) =>
      NextResponse.json({ nama: body.nama })
    );

    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ nama: 'Livia' }),
    });

    const res = await (wrapped as never as (r: Request, c: unknown) => Promise<Response>)(request, {
      params: {},
    });

    expect(await res.json()).toEqual({ nama: 'Livia' });
  });

  it('body rusak jadi 400 INVALID_JSON', async () => {
    setMockAuth({ user: { id: 'u1' } });
    const inner = vi.fn(async () => NextResponse.json({}));

    const wrapped = jsonApiHandler({ route: '/t' }, inner);

    const request = new Request('http://localhost/api/test', { method: 'POST', body: '{rusak' });
    const res = await (wrapped as never as (r: Request, c: unknown) => Promise<Response>)(request, {
      params: {},
    });

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_JSON');
    expect(inner).not.toHaveBeenCalled();
  });
});

describe('key helper', () => {
  it('userOrIpKey memakai user kalau ada', () => {
    expect(userOrIpKey({ userId: 'u1', ip: '1.1.1.1' })).toBe('u:u1');
  });

  it('userOrIpKey fallback ke IP', () => {
    expect(userOrIpKey({ userId: null, ip: '1.1.1.1' })).toBe('ip:1.1.1.1');
  });

  it('ipKey selalu IP', () => {
    expect(ipKey({ ip: '2.2.2.2' })).toBe('ip:2.2.2.2');
  });
});
