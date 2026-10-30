import { vi } from 'vitest';

/**
 * Setup global test (M4, memperbaiki bug laten sejak M2.7).
 *
 * MASALAH: `vi.mock` hanya bisa mengganti modul yang BELUM masuk registry
 * worker. Karena suite ini memakai `isolate: false` (keputusan M0 demi
 * kecepatan di Windows), registry modul dibagi antar file test dalam satu
 * worker. Ada file yang meng-import `@/lib/gemini` TANPA mem-mock SDK
 * (`tests/evals-dataset.test.ts` butuh `buildChatPrompt`), dan file itu
 * menarik `@google/generative-ai` yang asli ke registry.
 *
 * Akibatnya: kalau file tersebut kebetulan berjalan LEBIH DULU di worker yang
 * sama, `vi.mock('@google/generative-ai')` di `ai-provider.test.ts` dan
 * `ai-stream.test.ts` tidak lagi berpengaruh. Test lalu benar-benar memanggil
 * jaringan Google, gagal dengan "API key not valid", dan 24 test merah.
 *
 * Itu kegagalan yang bergantung pada URUTAN FILE, bukan pada kode — jenis
 * flake paling mahal karena hasilnya berbeda tiap kali file test ditambah.
 *
 * SOLUSI: daftarkan mock di setup file, yang berjalan SEBELUM file test mana
 * pun di worker tersebut meng-import apa pun. Dengan begitu SDK asli tidak
 * pernah masuk registry, urutan file tidak lagi relevan.
 *
 * Mock ini aman untuk seluruh suite: tidak ada test yang benar-benar ingin
 * memanggil API sungguhan (eval live memakai `evals/run.ts`, bukan vitest).
 */
vi.mock('@google/generative-ai', async () => {
  const { sdkModuleMock } = await import('./gemini-sdk-mock');
  return sdkModuleMock();
});

/**
 * Mock `@/lib/auth` (M6.1).
 *
 * `lib/api-handler` di-import oleh beberapa test route (api-handler,
 * tts-route). Dengan `isolate: false`, `vi.mock('@/lib/auth')` PER FILE
 * menghasilkan instance mock yang TIDAK identik antar file: modul yang
 * sudah dievaluasi (lib/api-handler) memegang instance dari file yang
 * lebih dulu dimuat, sehingga `mockResolvedValue` file kedua tidak pernah
 * sampai ke route dan test dapat 401 — kegagalan bergantung urutan file.
 *
 * SOLUSI: daftarkan mock di sini (pola yang sama dengan Gemini SDK di
 * atas) DAN biarkan implementasinya delegasi ke state di `globalThis`.
 * Factory `vi.mock` tetap bisa dievaluasi berkali-kali per worker; dengan
 * state global, instance mana pun yang dipegang route berperilaku sama.
 *
 * Helper untuk file test (import dari '@/tests/setup'):
 *   setMockAuth({ user: { id: 'u' } })  — session yang dikembalikan auth()
 *   setMockAuthRejection(err)           — auth() reject
 *   getMockAuthCalls()                  — histori panggilan (asersi "tidak dipanggil")
 *   resetMockAuth()                     — panggil di beforeEach
 */
function getAuthMockState(): { session: unknown; rejection: unknown; calls: unknown[][] } {
  const g = globalThis as Record<string, unknown>;
  if (!g.__authMockState) {
    g.__authMockState = { session: null, rejection: null, calls: [] as unknown[][] };
  }
  return g.__authMockState as { session: unknown; rejection: unknown; calls: unknown[][] };
}

export function setMockAuth(session: unknown): void {
  const s = getAuthMockState();
  s.session = session;
  s.rejection = null;
}

export function setMockAuthRejection(error: unknown): void {
  getAuthMockState().rejection = error;
}

export function getMockAuthCalls(): unknown[][] {
  return getAuthMockState().calls;
}

export function resetMockAuth(): void {
  const s = getAuthMockState();
  s.session = null;
  s.rejection = null;
  s.calls.length = 0;
}

vi.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => {
    getAuthMockState().calls.push(args);
    return new Promise((resolve, reject) => {
      const s = getAuthMockState();
      if (s.rejection !== null) reject(s.rejection);
      else resolve(s.session);
    });
  },
}));

/**
 * Mock store rate limit (M5.5).
 *
 * Limiter produksi memakai `dbRateLimitStore` (Postgres/Neon). Suite vitest
 * tidak punya database, dan `isolate: false` membuat `vi.mock` per file tidak
 * andal (tergantung urutan file). Jadi store-nya digantikan in-memory di sini
 * — SEBELUM file test mana pun meng-import `@/lib/rate-limit`.
 *
 * Algoritma limiter tetap diuji penuh (bucket window, multi-cap, reset,
 * cost alert); yang di-skip hanya lapisan SQL-nya (ditegakkan di production
 * lewat migrasi + skrip prune).
 */
vi.mock('@/lib/rate-limit/store', () => {
  const g = globalThis as Record<string, unknown>;

  // OBJEK store harus STABIL antar evaluasi factory (factory bisa berjalan
  // ulang tiap file test — setup.ts dijalankan per file dengan isolate:
  // false). Kalau tiap evaluasi membuat objek baru, importer yang sudah
  // dievaluasi (mis. lib/alerting) memegang objek lama, sedangkan reset/patch
  // di test menyentuh objek baru → state berbeda, flake bergantung urutan.
  // (Pola holder globalThis yang sama dengan mock `@/lib/auth` di atas.)
  if (!g.__mockRateLimitStoreObj) {
    const getState = () =>
      g.__mockRateLimitState as { map: Map<string, number> };
    g.__mockRateLimitStoreObj = {
      increment: async (key: string) => {
        const map = getState().map;
        const count = (map.get(key) ?? 0) + 1;
        map.set(key, count);
        return count;
      },
      delete: async (key: string) => {
        getState().map.delete(key);
      },
    };
  }

  // Map BARU per file test (setup berjalan per file): menjaga isolasi state
  // antar file yang memakai key identik (mis. `u:u1`) dalam window yang sama.
  g.__mockRateLimitState = { map: new Map<string, number>() };
  (globalThis as Record<string, unknown>).__mockRateLimitStore = {
    reset: () => ((g.__mockRateLimitState as { map: Map<string, number> }).map.clear()),
  };

  return {
    dbRateLimitStore: g.__mockRateLimitStoreObj,
  };
});

/**
 * Mock `@/lib/ai/usage` (M7.1).
 *
 * Alasannya sama dengan `@/lib/auth` di atas: `isolate: false` membuat
 * `vi.mock` per file tidak andal. `lib/gemini.ts` (di-import test evals)
 * menarik modul ini ke registry worker; kalau route `/api/usage` kemudian
 * di-test di file lain, mock per-file-nya bisa kalah urutan — dan test
 * route akan menyentuh `db` asli.
 *
 * Fungsi MURNI modul ini (aiDailyCostLimitUsd, shouldAlertBudget,
 * dayBucketUtc) TIDAK di-mock — `importOriginal` + spread membuat test
 * `tests/ai-usage.test.ts` tetap menguji implementasi aslinya. Yang
 * digantikan hanya dua fungsi DB (recordAiUsage, getUsageOverview) dengan
 * state global:
 *   setMockUsageOverview(v)        — nilai yang dikembalikan getUsageOverview
 *   getMockUsageRecords()          — histori pemanggilan recordAiUsage
 *   getMockUsageOverviewCalls()    — argumen getUsageOverview
 *   resetMockUsage()               — panggil di beforeEach
 */
function getUsageMockState(): {
  records: unknown[];
  overview: unknown;
  overviewCalls: unknown[];
} {
  const g = globalThis as Record<string, unknown>;
  if (!g.__aiUsageMockState) {
    g.__aiUsageMockState = { records: [] as unknown[], overview: null, overviewCalls: [] as unknown[] };
  }
  return g.__aiUsageMockState as { records: unknown[]; overview: unknown; overviewCalls: unknown[] };
}

export function setMockUsageOverview(value: unknown): void {
  getUsageMockState().overview = value;
}

export function getMockUsageRecords(): unknown[] {
  return getUsageMockState().records;
}

export function getMockUsageOverviewCalls(): unknown[] {
  return getUsageMockState().overviewCalls;
}

export function resetMockUsage(): void {
  const s = getUsageMockState();
  s.records.length = 0;
  s.overview = null;
  s.overviewCalls.length = 0;
}

vi.mock('@/lib/ai/usage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/usage')>();
  return {
    ...actual,
    recordAiUsage: async (entry: unknown) => {
      getUsageMockState().records.push(entry);
    },
    getUsageOverview: async (opts?: unknown) => {
      getUsageMockState().overviewCalls.push(opts);
      const v = getUsageMockState().overview;
      // Kalau nilainya fungsi, panggil — test bisa memakai fungsi yang
      // melempar untuk mensimulasikan error DB.
      return typeof v === 'function' ? (v as () => unknown)() : v;
    },
  };
});

/**
 * Mock HTMLAudioElement (M6.1).
 *
 * `TtsPipeline` (lib/tts/pipeline.ts) membuat `new Audio(...)` saat playback.
 * Suite vitest jalan di Node tanpa DOM, jadi tersedia stub minimal —
 * terdaftar global supaya tidak bergantung urutan file (isolate: false).
 *
 * Test mengendalikan berakhirnya playback lewat `audio.emitEnded()` dan bisa
 * memeriksa instance lewat `globalThis.__mockAudio.instances`.
 */
class MockAudio {
  src = '';
  volume = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplay: (() => void) | null = null;
  paused = true;
  /** M6.5: pipeline mengatur tempo per mood + preservesPitch. */
  playbackRate = 1;
  preservesPitch = false;

  play(): Promise<void> {
    this.paused = false;
    this.onplay?.();
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
  emitEnded(): void {
    this.onended?.();
  }
}

const audioInstances: MockAudio[] = [];
class TrackedMockAudio extends MockAudio {
  constructor(src: string) {
    super();
    this.src = src;
    audioInstances.push(this);
  }
}

(globalThis as Record<string, unknown>).Audio = TrackedMockAudio;
(globalThis as Record<string, unknown>).__mockAudio = {
  instances: audioInstances,
  reset: () => {
    audioInstances.length = 0;
  },
};

/**
 * Mock `@/lib/livia/quests.server` (M8.4).
 *
 * Quest server dipakai route `/api/quests/*` dan route chat (tool quest).
 * Suite vitest tidak punya DB; `isolate: false` membuat `vi.mock` per file
 * tidak andal. Maka mock in-memory global (pola yang sama dengan auth/usage/
 * tools store). `questsForDate`/`utcToday`/`ALLOWED_ACTIONS` biarkan asli.
 */
function getMockQuestState(): {
  actions: Array<{ userId: string; date: string; action: string }>;
  claimed: Array<{ userId: string; date: string; questId: string; milestone: number }>;
} {
  const g = globalThis as Record<string, unknown>;
  if (!g.__mockQuestState) {
    g.__mockQuestState = { actions: [], claimed: [] };
  }
  return g.__mockQuestState as {
    actions: Array<{ userId: string; date: string; action: string }>;
    claimed: Array<{ userId: string; date: string; questId: string; milestone: number }>;
  };
}

export function resetMockQuest(): void {
  const s = getMockQuestState();
  s.actions.length = 0;
  s.claimed.length = 0;
}

vi.mock('@/lib/livia/quests.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/livia/quests.server')>();

  return {
    ...actual,
    recordQuestActionServer: async (userId: string, date: string, action: string) => {
      getMockQuestState().actions.push({ userId, date, action });
    },
    getQuestDayState: async (userId: string, date: string) => {
      const s = getMockQuestState();
      const quests = actual.questsForDate(date);
      const progress: Record<string, number> = {};
      const claimedQuestIds: string[] = [];
      const claimedMilestones: number[] = [];
      for (const a of s.actions) {
        if (a.userId === userId && a.date === date) {
          progress[a.action] = (progress[a.action] ?? 0) + 1;
        }
      }
      for (const c of s.claimed) {
        if (c.userId === userId && c.date === date) {
          if (c.questId) claimedQuestIds.push(c.questId);
          if (c.milestone) claimedMilestones.push(c.milestone);
        }
      }
      return {
        date,
        quests,
        progress,
        claimedQuestIds,
        claimedMilestones,
        completedCount: claimedQuestIds.length,
      };
    },
    claimQuestRewardServer: async (userId: string, date: string, questId: string) => {
      const s = getMockQuestState();
      const quests = actual.questsForDate(date);
      const quest = quests.find((q) => q.id === questId);
      if (!quest) return { ok: false, reason: 'unknown_quest' };
      const count = s.actions.filter(
        (a) => a.userId === userId && a.date === date && a.action === quest.targetAction
      ).length;
      if (count < quest.required) return { ok: false, reason: 'insufficient' };
      if (s.claimed.some((c) => c.userId === userId && c.date === date && c.questId === questId)) {
        return { ok: false, reason: 'already_claimed' };
      }
      s.claimed.push({ userId, date, questId, milestone: 0 });
      return { ok: true, rv: 15 };
    },
    claimQuestMilestoneServer: async (userId: string, date: string, points: number) => {
      const s = getMockQuestState();
      const milestone = actual.MILESTONES.find((m) => m.points === points);
      if (!milestone) return { ok: false, reason: 'unknown_milestone' };
      const claimedCount = s.claimed.filter((c) => c.userId === userId && c.date === date && c.questId).length;
      if (claimedCount < points) return { ok: false, reason: 'insufficient' };
      if (s.claimed.some((c) => c.userId === userId && c.date === date && c.milestone === points)) {
        return { ok: false, reason: 'already_claimed' };
      }
      s.claimed.push({ userId, date, questId: '', milestone: points });
      return { ok: true, rv: milestone.rv, affection: milestone.affection };
    },
  };
});

/**
 * Mock `@/lib/tools/store` (M8.3).
 *
 * Store tool (reminders/shoppingItems) dipakai executor chat DAN route
 * `/api/reminders` & `/api/shopping`. Suite vitest tidak punya database, dan
 * `isolate: false` membuat `vi.mock` per file tidak andal (kalah urutan).
 * Jadi store-nya digantikan in-memory global — pola yang sama dengan mock
 * `@/lib/auth` / `@/lib/ai/usage` di atas. SQL asli tetap diuji lewat
 * `db:check-drift` + migrasi.
 */
function getToolStoreState(): {
  reminders: Array<{
    id: string;
    userId: string;
    content: string;
    remindAt: Date;
    status: string;
    createdAt: Date;
  }>;
  shopping: Array<{
    id: string;
    userId: string;
    name: string;
    checked: boolean;
    createdAt: Date;
  }>;
} {
  const g = globalThis as Record<string, unknown>;
  if (!g.__mockToolStoreState) {
    g.__mockToolStoreState = { reminders: [], shopping: [] };
  }
  return g.__mockToolStoreState as {
    reminders: Array<{
      id: string;
      userId: string;
      content: string;
      remindAt: Date;
      status: string;
      createdAt: Date;
    }>;
    shopping: Array<{
      id: string;
      userId: string;
      name: string;
      checked: boolean;
      createdAt: Date;
    }>;
  };
}

export function resetMockToolStore(): void {
  getToolStoreState().reminders.length = 0;
  getToolStoreState().shopping.length = 0;
}

vi.mock('@/lib/tools/store', () => {
  const state = getToolStoreState();
  const uuid = () => crypto.randomUUID();

  return {
    listReminderContext: async (userId: string, now: Date) => {
      const rows = state.reminders.filter(
        (r) => r.userId === userId && r.status === 'active'
      );
      const overdue: unknown[] = [];
      const upcoming: unknown[] = [];
      for (const row of rows) {
        if (row.remindAt.getTime() <= now.getTime()) overdue.push(row);
        else upcoming.push(row);
      }
      return { overdue, upcoming };
    },
    listReminders: async (userId: string) =>
      state.reminders
        .filter((r) => r.userId === userId)
        .slice()
        .sort((a, b) => b.remindAt.getTime() - a.remindAt.getTime()),
    insertReminder: async (userId: string, content: string, remindAt: Date) => {
      const row = { id: uuid(), userId, content, remindAt, status: 'active', createdAt: new Date() };
      state.reminders.push(row);
      return row;
    },
    updateReminderStatus: async (
      userId: string,
      id: string,
      status: string
    ) => {
      const row = state.reminders.find((r) => r.id === id && r.userId === userId);
      if (!row) return null;
      row.status = status;
      return row;
    },
    listShoppingItems: async (userId: string) =>
      state.shopping.filter((s) => s.userId === userId),
    insertShoppingItem: async (userId: string, name: string) => {
      const row = { id: uuid(), userId, name, checked: false, createdAt: new Date() };
      state.shopping.push(row);
      return row;
    },
    updateShoppingItemChecked: async (
      userId: string,
      id: string,
      checked: boolean
    ) => {
      const row = state.shopping.find((s) => s.id === id && s.userId === userId);
      if (!row) return null;
      row.checked = checked;
      return row;
    },
  };
});