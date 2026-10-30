import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { setMockAuth, resetMockAuth, resetMockQuest } from '@/tests/setup';
import { __resetEnvCacheForTests } from '@/lib/env';

import { GET as GetQuests } from '@/app/api/quests/route';
import { POST as PostAction } from '@/app/api/quests/action/route';
import { POST as PostClaim } from '@/app/api/quests/claim/route';
import { POST as PostMilestone } from '@/app/api/quests/milestone/route';

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
  resetMockQuest();
});

afterEach(() => {
  process.env = snapshot;
  __resetEnvCacheForTests();
  resetMockAuth();
  resetMockQuest();
  vi.restoreAllMocks();
});

const user = { id: 'u-1', email: 'a@b.c' };
const DATE = '2026-10-30';

const call = (handler: unknown, url: string, body?: unknown) =>
  (handler as (r: Request, c: unknown) => Promise<Response>)(
    new Request(url, {
      method: body !== undefined ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    {}
  );

describe('GET /api/quests (M8.4)', () => {
  it('401 tanpa sesi', async () => {
    setMockAuth(null);
    const res = await call(GetQuests, 'http://localhost/api/quests?date=2026-10-30');
    expect(res.status).toBe(401);
  });

  it('400 tanggal tidak valid', async () => {
    setMockAuth({ user });
    const res = await call(GetQuests, 'http://localhost/api/quests?date=abc');
    expect(res.status).toBe(400);
  });

  it('200 state quest hari itu (quests + progress + claimed)', async () => {
    setMockAuth({ user });
    await call(PostAction, 'http://localhost/api/quests/action', {
      action: 'visit_home',
      date: DATE,
    });

    const res = await call(GetQuests, `http://localhost/api/quests?date=${DATE}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { state: { quests: unknown[]; progress: Record<string, number>; claimedQuestIds: unknown[] } };
    expect(data.state.quests).toHaveLength(9);
    expect(data.state.progress.visit_home).toBe(1);
    expect(data.state.claimedQuestIds).toEqual([]);
  });
});

describe('POST /api/quests/action (M8.4)', () => {
  it('400 aksi tak dikenal', async () => {
    setMockAuth({ user });
    const res = await call(PostAction, 'http://localhost/api/quests/action', {
      action: 'hack',
      date: DATE,
    });
    expect(res.status).toBe(400);
  });

  it('200 rekam aksi (count bertambah)', async () => {
    setMockAuth({ user });
    await call(PostAction, 'http://localhost/api/quests/action', {
      action: 'touch_livia',
      date: DATE,
    });
    const second = await call(PostAction, 'http://localhost/api/quests/action', {
      action: 'touch_livia',
      date: DATE,
    });
    expect(second.status).toBe(200);
    const data = (await second.json()) as { state: { progress: Record<string, number> } };
    expect(data.state.progress.touch_livia).toBe(2);
  });

  it('200 aksi tool chat tercatat', async () => {
    setMockAuth({ user });
    const res = await call(PostAction, 'http://localhost/api/quests/action', {
      action: 'tool_create_reminder',
      date: DATE,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { state: { progress: Record<string, number> } };
    expect(data.state.progress.tool_create_reminder).toBe(1);
  });
});

describe('POST /api/quests/claim (M8.4)', () => {
  it('klaim tanpa progress cukup → 400 INSUFFICIENT_PROGRESS', async () => {
    setMockAuth({ user });
    const res0 = await call(GetQuests, `http://localhost/api/quests?date=${DATE}`);
    const state = (await res0.json()) as { state: { quests: Array<{ id: string; required: number }> } };
    const first = state.state.quests[0];

    const res = await call(PostClaim, 'http://localhost/api/quests/claim', {
      questId: first.id,
      date: DATE,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('INSUFFICIENT_PROGRESS');
  });

  it('klaim sukses setelah progress cukup → state.claimed berisi questId', async () => {
    setMockAuth({ user });
    const state = (await (await call(GetQuests, `http://localhost/api/quests?date=${DATE}`)).json()) as {
      state: { quests: Array<{ id: string; targetAction: string; required: number }> };
    };
    const quest = state.state.quests.find((q) => q.required === 1)!;

    // Rekam aksi yang dibutuhkan.
    for (let i = 0; i < quest.required; i++) {
      await call(PostAction, 'http://localhost/api/quests/action', {
        action: quest.targetAction,
        date: DATE,
      });
    }

    const res = await call(PostClaim, 'http://localhost/api/quests/claim', {
      questId: quest.id,
      date: DATE,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { state: { claimedQuestIds: string[] }; rv?: number };
    expect(data.state.claimedQuestIds).toContain(quest.id);
    expect(data.rv).toBe(15);
  });

  it('klaim ganda → 400 ALREADY_CLAIMED', async () => {
    setMockAuth({ user });
    const state = (await (await call(GetQuests, `http://localhost/api/quests?date=${DATE}`)).json()) as {
      state: { quests: Array<{ id: string; targetAction: string; required: number }> };
    };
    const quest = state.state.quests.find((q) => q.required === 1)!;
    for (let i = 0; i < quest.required; i++) {
      await call(PostAction, 'http://localhost/api/quests/action', {
        action: quest.targetAction,
        date: DATE,
      });
    }

    await call(PostClaim, 'http://localhost/api/quests/claim', { questId: quest.id, date: DATE });
    const second = await call(PostClaim, 'http://localhost/api/quests/claim', {
      questId: quest.id,
      date: DATE,
    });
    expect(second.status).toBe(400);
    const body = (await second.json()) as { code: string };
    expect(body.code).toBe('ALREADY_CLAIMED');
  });
});

describe('POST /api/quests/milestone (M8.4)', () => {
  it('400 points bukan 3/6/9', async () => {
    setMockAuth({ user });
    const res = await call(PostMilestone, 'http://localhost/api/quests/milestone', {
      points: 5,
      date: DATE,
    });
    expect(res.status).toBe(400);
  });

  it('klaim milestone 3 setelah 3 quest diklaim', async () => {
    setMockAuth({ user });
    const state = (await (await call(GetQuests, `http://localhost/api/quests?date=${DATE}`)).json()) as {
      state: { quests: Array<{ id: string; targetAction: string; required: number }> };
    };
    const simple = state.state.quests.filter((q) => q.required === 1).slice(0, 3);

    for (const quest of simple) {
      await call(PostAction, 'http://localhost/api/quests/action', {
        action: quest.targetAction,
        date: DATE,
      });
      await call(PostClaim, 'http://localhost/api/quests/claim', { questId: quest.id, date: DATE });
    }

    const res = await call(PostMilestone, 'http://localhost/api/quests/milestone', {
      points: 3,
      date: DATE,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { state: { claimedMilestones: number[] }; rv?: number };
    expect(data.state.claimedMilestones).toContain(3);
    expect(data.rv).toBe(100);
  });

  it('milestone tanpa cukup poin → 400 INSUFFICIENT_PROGRESS', async () => {
    setMockAuth({ user });
    const res = await call(PostMilestone, 'http://localhost/api/quests/milestone', {
      points: 3,
      date: DATE,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('INSUFFICIENT_PROGRESS');
  });
});
