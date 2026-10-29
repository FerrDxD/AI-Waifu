import type { AIProviderName } from './types';

/**
 * Konfigurasi mesin AI (M2.2).
 *
 * Sebelumnya nama model `gemini-3.6-flash` di-hardcode di **3 tempat** di
 * `lib/gemini.ts`. Akibatnya: mencoba model lain berarti mengedit kode, dan
 * tidak mungkin melakukan A/B test tanpa deploy ulang.
 *
 * Sekarang semuanya dari environment, dengan default yang sama seperti
 * sebelumnya supaya perilaku tidak berubah kalau env tidak diset.
 *
 * PENTING: jangan `throw` di module scope. `next build` meng-import file ini
 * saat "Collecting page data" tanpa `.env` — itu bug yang sudah diperbaiki di M0.
 */

const DEFAULT_PROVIDER: AIProviderName = 'gemini';
const DEFAULT_CHAT_MODEL = 'gemini-3.6-flash';
const DEFAULT_DIALOGUE_MODEL = 'gemini-3.6-flash';
/**
 * Model default per provider (M8.1).
 *
 * `openai-compat` sengaja TIDAK punya default: provider pihak ketiga punya
 * daftar model sendiri, dan menebak nama model berarti request 400 yang
 * membingungkan. Owner WAJIB mengisi `AI_MODEL_CHAT`/`AI_MODEL_DIALOGUE`;
 * `resolveModelForOperation` melempar error jelas kalau kosong.
 */
const DEFAULT_MODELS: Record<AIProviderName, string> = {
  gemini: DEFAULT_CHAT_MODEL,
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  'openai-compat': '',
};
/**
 * Fallback sengaja TIDAK default ke model lain: kalau nama model fallback
 * salah, kita hanya membuang waktu setelah model utama gagal. Biarkan kosong
 * (tanpa fallback) sampai user memilih model yang benar-benar ada.
 */
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_RETRIES = 2;
/** Jeda dasar backoff. Bisa dinolkan lewat env saat test supaya cepat. */
const DEFAULT_RETRY_BASE_MS = 1_000;
/**
 * Ambang circuit breaker. 5 request gagal beruntun berarti backend benar-benar
 * sedang mati, bukan sekadar satu request apes. Cooldown 60 detik cukup lama
 * untuk tidak menghantam backend yang sedang pulih, tapi cukup pendek agar
 * user tidak menunggu lama setelah layanan kembali.
 */
const DEFAULT_BREAKER_FAILURE_THRESHOLD = 5;
const DEFAULT_BREAKER_COOLDOWN_MS = 60_000;

export interface AIEngineConfig {
  provider: AIProviderName;
  /** Model untuk obrolan panjang (chat, date chat). */
  chatModel: string;
  /** Model untuk generasi satu tembakan (dialog kencan). */
  dialogueModel: string;
  /** Model cadangan kalau model utama gagal karena 429/5xx. Kosong = tanpa fallback. */
  fallbackModel: string | null;
  /** Batas waktu satu panggilan generateContent. */
  timeoutMs: number;
  /** Jumlah percobaan ulang untuk error yang layak diulang (429/5xx/jaringan). */
  maxRetries: number;
  /** Jeda dasar backoff (ms). Percobaan ke-n menunggu base * 2^n + jitter. */
  retryBaseMs: number;
  /** Jumlah request gagal beruntun sebelum circuit breaker membuka. */
  breakerFailureThreshold: number;
  /** Lama circuit breaker terbuka sebelum mencoba satu percobaan uji. */
  breakerCooldownMs: number;
}

function readString(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = readString(name);
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

const PROVIDER_NAMES: readonly AIProviderName[] = [
  'gemini',
  'openai',
  'anthropic',
  'openai-compat',
];

function readProvider(): AIProviderName {
  const raw = readString('AI_PROVIDER')?.toLowerCase();
  // Nilai tak dikenal diabaikan dengan aman daripada bikin app mati karena typo.
  if (raw && (PROVIDER_NAMES as readonly string[]).includes(raw)) {
    return raw as AIProviderName;
  }
  return DEFAULT_PROVIDER;
}

let cached: AIEngineConfig | null = null;

export function getAIConfig(): AIEngineConfig {
  if (cached) return cached;

  const provider = readProvider();
  const providerDefaultModel = DEFAULT_MODELS[provider];
  const chatModel = readString('AI_MODEL_CHAT') ?? providerDefaultModel;

  cached = {
    provider,
    chatModel,
    dialogueModel: readString('AI_MODEL_DIALOGUE') ?? chatModel ?? DEFAULT_DIALOGUE_MODEL,
    fallbackModel: readString('AI_MODEL_FALLBACK') ?? null,
    timeoutMs: readInt('AI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, 1_000, 120_000),
    maxRetries: readInt('AI_MAX_RETRIES', DEFAULT_MAX_RETRIES, 0, 5),
    retryBaseMs: readInt('AI_RETRY_BASE_MS', DEFAULT_RETRY_BASE_MS, 0, 10_000),
    breakerFailureThreshold: readInt(
      'AI_BREAKER_FAILURE_THRESHOLD',
      DEFAULT_BREAKER_FAILURE_THRESHOLD,
      1,
      100
    ),
    breakerCooldownMs: readInt('AI_BREAKER_COOLDOWN_MS', DEFAULT_BREAKER_COOLDOWN_MS, 0, 600_000),
  };

  return cached;
}

/** Reset cache — hanya untuk test. */
export function __resetAIConfigForTests(): void {
  cached = null;
}
