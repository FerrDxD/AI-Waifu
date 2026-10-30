import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// `@/lib/auth` & `@/lib/tools/store` di-mock global di tests/setup.ts.
import { setMockAuth, resetMockAuth, resetMockToolStore } from '@/tests/setup';
import { __resetEnvCacheForTests } from '@/lib/env';

import { GET as GetReminders, POST as PostReminders, PATCH as PatchReminders } from '@/app/api/reminders/route';
import { GET as GetShopping, POST as PostShopping, PATCH as PatchShopping } from '@/app/api/shopping/route';

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
  resetMockToolStore();
});

afterEach(() => {
  process.env = snapshot;
  __resetEnvCacheForTests();
  resetMockAuth();
  resetMockToolStore();
  vi.restoreAllMocks();
});

const call = (handler: unknown, url: string, body?: unknown) =>
  (handler as (r: Request, c: unknown) => Promise<Response>)(
    new Request(url, {
      method: body !== undefined ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    {}
  );

const user = { id: 'u-1', email: 'a@b.c' };

describe('GET /api/reminders (M8.3)', () => {
  it('401 tanpa sesi', async () => {
    setMockAuth(null);
    const res = await call(GetReminders, 'http://localhost/api/reminders');
    expect(res.status).toBe(401);
  });

  it('200 daftar kosong', async () => {
    setMockAuth({ user });
    const res = await call(GetReminders, 'http://localhost/api/reminders');
    expect(res.status).toBe(200);
    const data = (await res.json()) as { reminders: unknown[] };
    expect(data.reminders).toEqual([]);
  });

  it('200 memuat reminder yang dibuat', async () => {
    setMockAuth({ user });
    const created = await call(PostReminders, 'http://localhost/api/reminders', {
      content: 'minum obat',
      remindAt: '2026-10-30T12:00:00.000Z',
    });
    expect(created.status).toBe(201);

    const res = await call(GetReminders, 'http://localhost/api/reminders');
    const data = (await res.json()) as { reminders: Array<{ content: string }> };
    expect(data.reminders).toHaveLength(1);
    expect(data.reminders[0].content).toBe('minum obat');
  });
});

describe('POST /api/reminders (M8.3)', () => {
  it('400 content kosong', async () => {
    setMockAuth({ user });
    const res = await call(PostReminders, 'http://localhost/api/reminders', {
      content: '  ',
      remindAt: '2026-10-30T12:00:00Z',
    });
    expect(res.status).toBe(400);
  });

  it('400 remindAt bukan ISO valid', async () => {
    setMockAuth({ user });
    const res = await call(PostReminders, 'http://localhost/api/reminders', {
      content: 'x',
      remindAt: 'bukan-tanggal',
    });
    expect(res.status).toBe(400);
  });

  it('201 reminder tersimpan', async () => {
    setMockAuth({ user });
    const res = await call(PostReminders, 'http://localhost/api/reminders', {
      content: 'minum obat',
      remindAt: '2026-10-30T12:00:00Z',
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { reminder: { content: string; status: string } };
    expect(data.reminder.content).toBe('minum obat');
    expect(data.reminder.status).toBe('active');
  });
});

describe('PATCH /api/reminders (M8.3)', () => {
  it('400 status tidak valid', async () => {
    setMockAuth({ user });
    const res = await call(PatchReminders, 'http://localhost/api/reminders', {
      id: 'abc',
      status: 'entah',
    });
    expect(res.status).toBe(400);
  });

  it('404 id bukan milik user', async () => {
    setMockAuth({ user });
    const res = await call(PatchReminders, 'http://localhost/api/reminders', {
      id: '11111111-2222-4333-8444-555555555555',
      status: 'done',
    });
    expect(res.status).toBe(404);
  });

  it('200 status diubah', async () => {
    setMockAuth({ user });
    const created = await call(PostReminders, 'http://localhost/api/reminders', {
      content: 'minum obat',
      remindAt: '2026-10-30T12:00:00Z',
    });
    const { reminder } = (await created.json()) as { reminder: { id: string } };

    const res = await call(PatchReminders, 'http://localhost/api/reminders', {
      id: reminder.id,
      status: 'done',
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { reminder: { status: string } };
    expect(data.reminder.status).toBe('done');
  });
});

describe('/api/shopping (M8.3)', () => {
  it('GET 401 tanpa sesi', async () => {
    setMockAuth(null);
    const res = await call(GetShopping, 'http://localhost/api/shopping');
    expect(res.status).toBe(401);
  });

  it('POST 201 + GET memuat barang', async () => {
    setMockAuth({ user });
    const created = await call(PostShopping, 'http://localhost/api/shopping', { name: 'telur' });
    expect(created.status).toBe(201);

    const res = await call(GetShopping, 'http://localhost/api/shopping');
    const data = (await res.json()) as { items: Array<{ name: string; checked: boolean }> };
    expect(data.items).toHaveLength(1);
    expect(data.items[0].name).toBe('telur');
    expect(data.items[0].checked).toBe(false);
  });

  it('POST 400 nama kosong', async () => {
    setMockAuth({ user });
    const res = await call(PostShopping, 'http://localhost/api/shopping', { name: '' });
    expect(res.status).toBe(400);
  });

  it('PATCH 200 toggle checked', async () => {
    setMockAuth({ user });
    const created = await call(PostShopping, 'http://localhost/api/shopping', { name: 'susu' });
    const { item } = (await created.json()) as { item: { id: string } };

    const res = await call(PatchShopping, 'http://localhost/api/shopping', {
      id: item.id,
      checked: true,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { item: { checked: boolean } };
    expect(data.item.checked).toBe(true);
  });

  it('PATCH 404 barang bukan milik user', async () => {
    setMockAuth({ user });
    const res = await call(PatchShopping, 'http://localhost/api/shopping', {
      id: '11111111-2222-4333-8444-555555555555',
      checked: true,
    });
    expect(res.status).toBe(404);
  });
});
