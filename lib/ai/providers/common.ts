import { AppError } from '@/lib/errors';
import { logger, serializeError } from '@/lib/logger';
import { getAIConfig, type AIEngineConfig } from '../config';
import type { GenerateResult, LlmResponseSchema, LlmTurn } from '../types';
import type { DeltaQueue } from '../stream/queue';

/**
 * Helper bersama SEMUA adapter provider (M8.1).
 *
 * Sebelum multi-provider, semua jaminan M2.6 (retry 429/5xx, backoff+jitter,
 * timeout jelas, fallback model, klasifikasi error yang aman) hanya hidup di
 * dalam `providers/gemini.ts`. Kalau tiap adapter menyalin logika itu, cepat
 * atau lambat salah satunya akan tertinggal saat perilakunya diperbaiki.
 *
 * Modul ini adalah satu-satunya sumber kebenaran untuk perilaku tersebut.
 * Adapter hanya menyediakan: cara memanggil API, cara membaca teks/usage,
 * dan cara mendeteksi safety-block.
 */

/** Status HTTP yang layak diulang (backend sibuk / sementara mati). */
export const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number' && RETRYABLE_STATUSES.has(status)) return true;
    // Error tanpa status = TCP/timeout/jaringan. Layak diulang sekali.
    if (status === undefined) return true;
  }
  return false;
}

/** Tidur dengan jitter ±25% untuk menghindari thundering herd. */
export function backoff(baseMs: number, attempt: number): Promise<void> {
  const jitter = 0.75 + Math.random() * 0.5;
  const delay = Math.min(8_000, baseMs * 2 ** attempt) * jitter;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Apakah error ini menandakan backend-nya sedang bermasalah?
 *
 * Dipakai circuit breaker. Error klasifikasi sendiri (`AI_BAD_STRUCTURE`,
 * `*_NOT_CONFIGURED`, `AI_EMPTY_CONTEXT`) TIDAK dihitung: backend jelas
 * merespons, yang salah ada di konfigurasi atau di output model.
 */
export function isBackendFailure(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === 'AI_TIMEOUT' || error.code === 'AI_GENERATION_FAILED';
  }
  return true;
}

/**
 * Tandai error jaringan mentah jadi error klasifikasi tanpa membocorkan isi.
 * Raw error (`Error: broken pipe`, dsb.) tidak boleh sampai ke client.
 */
export function wrapProviderError(error: unknown, providerLabel: string): unknown {
  if (error instanceof AppError) return error;
  return new AppError(
    'AI_GENERATION_FAILED',
    `Gagal menghubungi server ${providerLabel}.`,
    503,
    true
  );
}

/**
 * Ubah kegagalan bertanda timeout/abort dari SDK menjadi `AI_TIMEOUT` yang
 * jelas. Dipakai jalur generate & stream semua adapter.
 */
export function toTimeoutError(error: unknown, providerLabel: string): AppError | null {
  if (error instanceof AppError) return null;
  const status = (error as { status?: number } | null)?.status;
  const msg = (error as Error | null)?.message ?? '';
  const timedOut =
    status === undefined &&
    (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort'));
  return timedOut
    ? new AppError(
        'AI_TIMEOUT',
        `Server ${providerLabel} terlalu lama merespons.`,
        504,
        true
      )
    : null;
}

/**
 * Skema sebagai instruksi teks — dipakai provider tanpa native JSON mode
 * (Anthropic) atau saat mode structured ditolak (OpenAI-compatible).
 */
export function jsonInstruction(system: string, schema: LlmResponseSchema): string {
  return [
    system,
    '',
    'Balas HANYA dengan satu objek JSON valid (tanpa markdown, tanpa kalimat pembuka)',
    'yang cocok dengan skema berikut:',
    JSON.stringify(schema),
  ].join('\n');
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * M7.1: bentuk netral pemakaian token.
 *
 * `undefined` kalau provider tidak memberi metadata (atau semuanya nol) —
 * pemencatat skip sunyi, dashboard menampilkan model tanpa biaya.
 */
export function normalizeUsage(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  totalTokens?: number
): UsageTotals | undefined {
  const input = Math.max(0, Math.trunc(inputTokens ?? 0));
  const output = Math.max(0, Math.trunc(outputTokens ?? 0));
  const total = Math.max(0, Math.trunc(totalTokens ?? input + output));
  if (input === 0 && output === 0 && total === 0) return undefined;
  return { inputTokens: input, outputTokens: output, totalTokens: total };
}

/**
 * Rapikan giliran untuk API percakapan modern (OpenAI/Anthropic/Gemini).
 *
 *  - buang giliran kosong,
 *  - gabungkan giliran berurutan dengan role sama (API menolaknya),
 *  - buang giliran `model` di awal (percakapan harus dimulai dari user).
 */
export function normalizeTurns(turns: LlmTurn[]): LlmTurn[] {
  const out: LlmTurn[] = [];

  for (const turn of turns) {
    const text = turn.text?.trim();
    if (!text) continue;

    const last = out[out.length - 1];
    if (last && last.role === turn.role) {
      last.text += `\n${text}`;
    } else {
      out.push({ role: turn.role, text });
    }
  }

  while (out.length > 0 && out[0].role === 'model') out.shift();
  return out;
}

/**
 * Model yang dipakai untuk satu operasi.
 *
 * `override` (M8.1, pilihan user) WAJIB sudah lolos allowlist server sebelum
 * sampai ke sini — adapter tidak memvalidasi ulang ke env.
 */
export function resolveModelForOperation(
  operation: string,
  override?: string,
  cfg: AIEngineConfig = getAIConfig()
): string {
  const chosen = override?.trim();
  const model = chosen || (operation === 'date.dialogue' ? cfg.dialogueModel : cfg.chatModel);

  // Provider pihak ketiga tidak punya default model (lihat config.ts). Lebih
  // baik gagal dengan pesan jelas di sini daripada mengirim nama kosong ke API.
  if (!model || !model.trim()) {
    throw new AppError(
      'AI_MODEL_NOT_CONFIGURED',
      'Model AI belum dikonfigurasi di server. Hubungi admin.',
      500,
      true
    );
  }

  return model.trim();
}

/**
 * Loop retry + fallback model untuk jalur non-streaming.
 *
 * Perilaku identik dengan implementasi Gemini M2.6 (dipindah apa adanya):
 *  - `AppError` yang sudah terklasifikasi TIDAK diulang dan TIDAK ditimpa;
 *  - error retryable diulang hingga `AI_MAX_RETRIES`;
 *  - setelah habis, coba `AI_MODEL_FALLBACK` sekali (kalau diset);
 *  - akhirnya lempar `AI_GENERATION_FAILED` dengan pesan generik.
 */
export async function runGenerateWithRetry<T>(args: {
  operation: string;
  /** Nama manusiawi provider untuk pesan error, mis. "AI Google". */
  providerLabel: string;
  primaryModel: string;
  fallbackModel: string | null;
  attempt: (model: string) => Promise<GenerateResult<T>>;
}): Promise<GenerateResult<T>> {
  const cfg = getAIConfig();
  let lastError: unknown = null;
  let attempts = 0;

  for (let i = 0; i <= cfg.maxRetries; i++) {
    attempts++;
    try {
      return await args.attempt(args.primaryModel);
    } catch (error) {
      lastError = error;

      if (error instanceof AppError) {
        logger.warn('ai.generate_aborted', {
          operation: args.operation,
          model: args.primaryModel,
          attempt: i + 1,
          code: error.code,
        });
        throw error;
      }

      logger.warn('ai.generate_retryable_failed', {
        operation: args.operation,
        model: args.primaryModel,
        attempt: i + 1,
        status: (error as { status?: number })?.status,
      });

      if (i < cfg.maxRetries && isRetryableError(error)) {
        await backoff(cfg.retryBaseMs, i);
        continue;
      }
      break;
    }
  }

  if (args.fallbackModel && args.fallbackModel !== args.primaryModel) {
    logger.warn('ai.fallback_model', {
      operation: args.operation,
      from: args.primaryModel,
      to: args.fallbackModel,
    });
    try {
      const result = await args.attempt(args.fallbackModel);
      return { ...result, usedFallback: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      lastError = error;
    }
  }

  logger.error('ai.generate_failed', {
    operation: args.operation,
    model: args.primaryModel,
    attempts,
    error: serializeError(lastError),
  });
  throw new AppError(
    'AI_GENERATION_FAILED',
    `Gagal menghubungi server ${args.providerLabel}.`,
    503,
    true
  );
}

/**
 * Satu percobaan streaming dengan aturan retry M2.6.
 *
 * Aturan retry: boleh diulang SELAMA belum ada satu delta pun yang terkirim
 * ke konsumen. Kalau sudah ada teks yang mengalir dan koneksi putus, mengulang
 * berarti teks terulang dua kali di layar — lebih baik menyuruh user coba lagi.
 */
export async function streamOnceWithRetry<T>(args: {
  operation: string;
  providerLabel: string;
  model: string;
  queue: DeltaQueue;
  /** Satu percobaan penuh. Panggil `push(delta)` untuk mengalirkan teks. */
  attempt: (push: (delta: string) => void) => Promise<GenerateResult<T>>;
}): Promise<GenerateResult<T>> {
  let emitted = false;
  const push = (delta: string) => {
    if (!delta) return;
    emitted = true;
    args.queue.push(delta);
  };

  for (let i = 0; ; i++) {
    try {
      return await args.attempt(push);
    } catch (error) {
      const timeoutError = toTimeoutError(error, args.providerLabel);
      if (timeoutError) throw timeoutError;

      // Error terklasifikasi (struktur/konfigurasi/timeout) tidak diulang.
      if (error instanceof AppError) throw error;

      if (!isRetryableError(error) || emitted) {
        throw wrapProviderError(error, args.providerLabel);
      }
      if (i >= getAIConfig().maxRetries) {
        throw wrapProviderError(error, args.providerLabel);
      }

      logger.warn('ai.stream_retryable_failed', {
        operation: args.operation,
        model: args.model,
        attempt: i + 1,
        status: (error as { status?: number })?.status,
      });

      await backoff(getAIConfig().retryBaseMs, i);
    }
  }
}
