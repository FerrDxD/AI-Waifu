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
  const map = new Map<string, number>();
  // Handle reset untuk test route yang memanggil satu user berulang (limit
  // 5/menit aiRateLimit bisa tercapai dalam satu file test).
  (globalThis as Record<string, unknown>).__mockRateLimitStore = {
    reset: () => map.clear(),
  };
  return {
    dbRateLimitStore: {
      increment: async (key: string) => {
        const count = (map.get(key) ?? 0) + 1;
        map.set(key, count);
        return count;
      },
      delete: async (key: string) => {
        map.delete(key);
      },
    },
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