import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type GenerateContentRequest,
  type GenerateContentResponse,
  type ResponseSchema,
} from '@google/generative-ai';
import type { LLMProvider, GenerateOptions, GenerateResult, StreamingGenerate } from '../types';
import { getAIConfig } from '../config';
import { CircuitBreaker } from '../circuit-breaker';
import { createReplyExtractor } from '../stream/extract';
import { createDeltaQueue, type DeltaQueue } from '../stream/queue';
import { AppError } from '@/lib/errors';
import { logger, serializeError } from '@/lib/logger';

/**
 * Adapter Gemini (M2.2 + M2.6).
 *
 * Satu-satunya tempat yang menyentuh `@google/generative-ai`. Domain
 * (`lib/ai/persona.ts`, route) hanya berbicara lewat kontrak `LLMProvider`.
 *
 * Yang dijamin adapter ini, DULU tersebar & hilang-hilang di `lib/gemini.ts`:
 *  1. Safety settings terpusat (H0.2) — jangan edit di tempat lain.
 *  2. Retry exponential backoff + jitter untuk 429/5xx/error jaringan.
 *  3. Timeout wajib — panggilan Gemini yang menggantung tidak boleh
 *     menggantung request user selamanya.
 *  4. Fallback model kalau model utama gagal dan AI_MODEL_FALLBACK diset.
 *  5. Penolakan safety filter diubah jadi hasil `blocked: true`, bukan error.
 *  6. Error internal JANGAN bocor: `AppError` dengan pesan generik, detail
 *     hanya ke log.
 */

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number' && RETRYABLE_STATUSES.has(status)) return true;
    // Error tanpa status = TCP/timeout/jaringan. Layak diulang sekali.
    if (status === undefined) return true;
  }
  return false;
}

/** Tidur dengan jitter ±25% untuk menghindari thundering herd. */
function backoff(baseMs: number, attempt: number): Promise<void> {
  const jitter = 0.75 + Math.random() * 0.5;
  const delay = Math.min(8_000, baseMs * 2 ** attempt) * jitter;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Apakah error ini menandakan backend-nya sedang bermasalah?
 *
 * Dipakai circuit breaker. Error klasifikasi sendiri (`AI_BAD_STRUCTURE`,
 * `GEMINI_NOT_CONFIGURED`, `AI_EMPTY_CONTEXT`) TIDAK dihitung: backend jelas
 * merespons, yang salah ada di konfigurasi atau di output model.
 */
function isBackendFailure(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === 'AI_TIMEOUT' || error.code === 'AI_GENERATION_FAILED';
  }
  return true;
}

/**
 * Tandai error jaringan mentah jadi error klasifikasi tanpa membocorkan isi.
 * Raw error (`Error: broken pipe`, dsb.) tidak boleh sampai ke client.
 */
function wrapProviderError(error: unknown): unknown {
  if (error instanceof AppError) return error;
  return new AppError('AI_GENERATION_FAILED', 'Gagal menghubungi server AI Google.', 503, true);
}

/**
 * Ubah kegagalan bertanda timeout/abort dari SDK menjadi `AI_TIMEOUT` yang
 * jelas. Dipakai `generateOnce` dan `streamOnce`.
 */
function toTimeoutError(error: unknown): AppError | null {
  if (error instanceof AppError) return null;
  const status = (error as { status?: number } | null)?.status;
  const msg = (error as Error | null)?.message ?? '';
  const timedOut =
    status === undefined &&
    (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort'));
  return timedOut
    ? new AppError('AI_TIMEOUT', 'Server AI terlalu lama merespons.', 504, true)
    : null;
}

/**
 * Ambil teks dari satu chunk streaming tanpa memanggil `chunk.text()` yang
 * bisa melempar kalau kandidatnya tidak ada (mis. chunk penutup).
 */
function chunkTextOf(response: GenerateContentResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('');
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const;

  /**
   * Circuit breaker per provider (M2.6).
   *
   * Key sengaja hanya nama provider, bukan nama model: kalau Gemini sedang
   * mati, model chat maupun model dialog ikut mati. Memisahkan per model hanya
   * akan membuat fallback tetap menghantam backend yang sama.
   */
  private readonly breaker = new CircuitBreaker({
    failureThreshold: getAIConfig().breakerFailureThreshold,
    cooldownMs: getAIConfig().breakerCooldownMs,
  });

  /** Untuk test & diagnostik. */
  circuitState(): string {
    return this.breaker.state(this.name);
  }

  resetCircuit(): void {
    this.breaker.reset();
  }

  private clientForKey(apiKey: string | undefined): GoogleGenerativeAI {
    if (apiKey && apiKey.trim().length > 0) {
      return new GoogleGenerativeAI(apiKey.trim());
    }
    const serverKey = process.env.GEMINI_API_KEY;
    if (!serverKey) {
      throw new AppError(
        'GEMINI_NOT_CONFIGURED',
        'Server AI belum dikonfigurasi. Hubungi admin.',
        500,
        true
      );
    }
    return new GoogleGenerativeAI(serverKey);
  }

  private toContent(turns: { role: 'user' | 'model'; text: string }[]): GenerateContentRequest['contents'] {
    const contents: GenerateContentRequest['contents'] = [];

    for (const turn of turns) {
      const text = turn.text?.trim();
      if (!text) continue;

      const role = turn.role;
      const last = contents[contents.length - 1];
      if (last && last.role === role && last.parts[0]) {
        // Gabungkan giliran berurutan — Gemini menolak dua giliran dengan role sama.
        last.parts[0].text += `\n${text}`;
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }

    // Gemini mengharuskan contents diawali giliran 'user'.
    if (contents.length > 0 && contents[0].role === 'model') contents.shift();

    return contents;
  }

  async generate<T>(options: GenerateOptions<T>): Promise<GenerateResult<T>> {
    const breakerKey = this.name;

    // M2.6: kalau backend baru saja mati berulang kali, jangan biarkan user
    // menunggu 25 detik × 3 percobaan untuk kegagalan yang sudah pasti.
    if (!this.breaker.allow(breakerKey)) {
      logger.warn('ai.circuit_open', {
        operation: options.operation,
        state: this.breaker.state(breakerKey),
      });
      throw new AppError(
        'AI_CIRCUIT_OPEN',
        'Layanan AI sedang tidak tersedia. Coba beberapa saat lagi.',
        503,
        true
      );
    }

    try {
      const result = await this.generateWithRetry(options);
      this.breaker.success(breakerKey);
      return result;
    } catch (error) {
      if (isBackendFailure(error)) {
        this.breaker.failure(breakerKey);
      } else {
        // Error seperti AI_BAD_STRUCTURE / GEMINI_NOT_CONFIGURED justru
        // membuktikan backend merespons. Jangan buka breaker karenanya.
        this.breaker.success(breakerKey);
      }
      throw error;
    }
  }

  private async generateWithRetry<T>(options: GenerateOptions<T>): Promise<GenerateResult<T>> {
    const cfg = getAIConfig();

    const contents = this.toContent(options.turns);
    if (contents.length === 0) {
      throw new AppError('AI_EMPTY_CONTEXT', 'Tidak ada isi percakapan untuk dikirim ke AI.', 400, true);
    }

    // Model utama bergantung pada jenis operasi. Dulu pemilihan ini terjadi di
    // dalam percobaan, sehingga jalur fallback untuk `date.dialogue` tidak
    // pernah benar-benar memakai model fallback.
    const primaryModel =
      options.operation === 'date.dialogue' ? cfg.dialogueModel : cfg.chatModel;

    const attempt = async (model: string) =>
      this.generateOnce(options, cfg.timeoutMs, contents, model);

    let lastError: unknown = null;
    let attempts = 0;

    for (let i = 0; i <= cfg.maxRetries; i++) {
      attempts++;
      try {
        return await attempt(primaryModel);
      } catch (error) {
        lastError = error;

        // AppError berarti kita SUDAH mengklasifikasikan masalahnya
        // (struktur respons buruk, konfigurasi hilang, timeout). Jangan
        // diulang, jangan ditimpa pesan generik — user berhak tahu bedanya
        // "AI belum dikonfigurasi" vs "server Google sedang sibuk".
        if (error instanceof AppError) {
          logger.warn('ai.generate_aborted', {
            operation: options.operation,
            model: primaryModel,
            attempt: i + 1,
            code: error.code,
          });
          throw error;
        }

        logger.warn('ai.generate_retryable_failed', {
          operation: options.operation,
          model: primaryModel,
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

    // Fallback model (M2.6): model utama gagal, coba yang lebih murah/padat.
    if (cfg.fallbackModel && cfg.fallbackModel !== primaryModel) {
      logger.warn('ai.fallback_model', {
        operation: options.operation,
        from: primaryModel,
        to: cfg.fallbackModel,
      });
      try {
        const result = await attempt(cfg.fallbackModel);
        return { ...result, usedFallback: true };
      } catch (error) {
        // AppError dari fallback (mis. struktur buruk) juga tidak perlu
        // ditimpa pesan generik.
        if (error instanceof AppError) throw error;
        lastError = error;
      }
    }

    logger.error('ai.generate_failed', {
      operation: options.operation,
      model: primaryModel,
      attempts,
      error: serializeError(lastError),
    });
    throw new AppError('AI_GENERATION_FAILED', 'Gagal menghubungi server AI Google.', 503, true);
  }

  stream<T>(options: GenerateOptions<T>): StreamingGenerate<T> {
    const cfg = getAIConfig();

    const contents = this.toContent(options.turns);
    if (contents.length === 0) {
      throw new AppError('AI_EMPTY_CONTEXT', 'Tidak ada isi percakapan untuk dikirim ke AI.', 400, true);
    }

    // M2.6: kalau backend baru saja mati berulang kali, jangan biarkan user
    // menunggu 25 detik × 3 percobaan untuk kegagalan yang sudah pasti.
    if (!this.breaker.allow(this.name)) {
      logger.warn('ai.circuit_open', {
        operation: options.operation,
        state: this.breaker.state(this.name),
      });
      throw new AppError(
        'AI_CIRCUIT_OPEN',
        'Layanan AI sedang tidak tersedia. Coba beberapa saat lagi.',
        503,
        true
      );
    }

    // Model utama bergantung pada jenis operasi — sama dengan `generate`.
    const primaryModel =
      options.operation === 'date.dialogue' ? cfg.dialogueModel : cfg.chatModel;

    const queue = createDeltaQueue();

    const final = (async (): Promise<GenerateResult<T>> => {
      try {
        const result = await this.streamOnce(options, cfg.timeoutMs, contents, primaryModel, queue);
        this.breaker.success(this.name);
        return result;
      } catch (error) {
        if (isBackendFailure(error)) {
          this.breaker.failure(this.name);
        } else {
          this.breaker.success(this.name);
        }
        throw error;
      } finally {
        // Apapun hasilnya, konsumen di `deltas` harus bisa berhenti.
        queue.close();
      }
    })();

    return { deltas: queue, final };
  }

  /**
   * Satu percobaan streaming.
   *
   * Aturan retry: boleh diulang SELAMA belum ada satu delta pun yang terkirim
   * ke konsumen. Kalau sudah ada teks yang mengalir dan koneksi putus,
   * mengulang berarti teks akan terulang dua kali di layar — lebih aman
   * menyuruh user coba lagi.
   */
  private async streamOnce<T>(
    options: GenerateOptions<T>,
    timeoutMs: number,
    contents: GenerateContentRequest['contents'],
    resolvedModel: string,
    queue: DeltaQueue
  ): Promise<GenerateResult<T>> {
    const startedAt = Date.now();
    const client = this.clientForKey(options.apiKey);

    const model = client.getGenerativeModel({
      model: resolvedModel,
      systemInstruction: options.systemInstruction,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 1_024,
        responseMimeType: 'application/json',
        responseSchema: options.responseSchema,
      },
    });

    let emitted = false;

    for (let i = 0; ; i++) {
      const extractor = createReplyExtractor();

      try {
        const streamResult = await model.generateContentStream({
          contents,
          timeout: timeoutMs,
        } as GenerateContentRequest);

        for await (const chunk of streamResult.stream) {
          const raw = chunkTextOf(chunk);
          if (!raw) continue;
          const delta = extractor.push(raw);
          if (delta) {
            emitted = true;
            queue.push(delta);
          }
        }

        // Respons lengkap dipakai untuk deteksi blokir + validasi.
        const aggregated = await streamResult.response;

        // M0/H0.2: penolakan safety bukan error, ini hasil yang sah.
        if (isBlocked({ response: aggregated })) {
          return {
            data: null,
            blocked: true,
            blockReason: blockReasonOf({ response: aggregated }),
            model: resolvedModel,
            usedFallback: false,
            latencyMs: Date.now() - startedAt,
          };
        }

        const raw = extractor.raw;
        if (!raw.trim()) {
          return {
            data: null,
            blocked: true,
            blockReason: 'NO_CANDIDATE',
            model: resolvedModel,
            usedFallback: false,
            latencyMs: Date.now() - startedAt,
          };
        }

        // JSON.parse bisa melempar SyntaxError mentah; itu BUKAN error
        // jaringan, jadi jangan diulang sampai satu percobaan penuh (M2.2).
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(raw);
        } catch {
          logger.warn('ai.stream_output_not_json', { operation: options.operation, model: resolvedModel });
          throw new AppError(
            'AI_BAD_STRUCTURE',
            'Respons AI tidak sesuai format. Coba lagi ya.',
            502,
            true
          );
        }

        const parsed = options.outputSchema.safeParse(parsedJson);
        if (!parsed.success) {
          logger.warn('ai.output_validation_failed', {
            operation: options.operation,
            model: resolvedModel,
            issues: parsed.error.issues.slice(0, 5).map((iss) => iss.path.join('.')),
          });
          throw new AppError(
            'AI_BAD_STRUCTURE',
            'Respons AI tidak sesuai format. Coba lagi ya.',
            502,
            true
          );
        }

        return {
          data: parsed.data,
          blocked: false,
          model: resolvedModel,
          usedFallback: false,
          latencyMs: Date.now() - startedAt,
        };
      } catch (error) {
        // Timeout/abort dari SDK → AI_TIMEOUT yang jelas, tidak diulang.
        const timeoutError = toTimeoutError(error);
        if (timeoutError) throw timeoutError;

        // Error yang sudah terklasifikasi (struktur/konfigurasi/timeout)
        // tidak diulang dan tidak ditimpa — sama seperti di `generate`.
        if (error instanceof AppError) throw error;

        // Error mentah tidak boleh lolos apa adanya ke route (bisa bocor ke
        // log client), dibungkus supaya tipe errornya konsisten.
        if (!isRetryableError(error) || emitted) throw wrapProviderError(error);
        if (i >= getAIConfig().maxRetries) throw wrapProviderError(error);

        logger.warn('ai.stream_retryable_failed', {
          operation: options.operation,
          model: resolvedModel,
          attempt: i + 1,
          status: (error as { status?: number })?.status,
        });

        await backoff(getAIConfig().retryBaseMs, i);
      }
    }
  }

  private async generateOnce<T>(
    options: GenerateOptions<T>,
    timeoutMs: number,
    contents: GenerateContentRequest['contents'],
    resolvedModel: string
  ): Promise<GenerateResult<T>> {
    const startedAt = Date.now();
    const client = this.clientForKey(options.apiKey);

    const model = client.getGenerativeModel({
      model: resolvedModel,
      systemInstruction: options.systemInstruction,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 1_024,
        responseMimeType: 'application/json',
        responseSchema: options.responseSchema,
      },
    });

    let result;
    try {
      result = await model.generateContent({
        contents,
        timeout: timeoutMs,
      } as GenerateContentRequest);
    } catch (error) {
      // Timeout dari SDK melempar versi-nya sendiri; ubah jadi AppError jelas.
      const timeoutError = toTimeoutError(error);
      if (timeoutError) throw timeoutError;
      throw error;
    }

    const latencyMs = Date.now() - startedAt;

    // M0/H0.2: safety filter aktif — penolakan bukan error, ini hasil yang sah.
    const blocked = isBlocked(result);
    if (blocked) {
      return {
        data: null,
        blocked: true,
        blockReason: blockReasonOf(result),
        model: resolvedModel,
        usedFallback: false,
        latencyMs,
      };
    }

    let text: string;
    try {
      text = result.response.text();
    } catch {
      // response.text() melempar kalau tidak ada kandidat.
      return {
        data: null,
        blocked: true,
        blockReason: 'NO_CANDIDATE',
        model: resolvedModel,
        usedFallback: false,
        latencyMs,
      };
    }

    // JSON.parse bisa melempar SyntaxError mentah. Dulu error itu lolos ke
    // `generate()`, dikira error jaringan (tanpa `status`), lalu diulang
    // percuma. Sekarang dipisah: parse gagal = struktur buruk, bukan jaringan.
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      logger.warn('ai.output_not_json', { operation: options.operation, model: resolvedModel });
      throw new AppError(
        'AI_BAD_STRUCTURE',
        'Respons AI tidak sesuai format. Coba lagi ya.',
        502,
        true
      );
    }

    const parsed = options.outputSchema.safeParse(parsedJson);
    if (!parsed.success) {
      logger.warn('ai.output_validation_failed', {
        operation: options.operation,
        model: resolvedModel,
        issues: parsed.error.issues.slice(0, 5).map((i) => i.path.join('.')),
      });
      throw new AppError(
        'AI_BAD_STRUCTURE',
        'Respons AI tidak sesuai format. Coba lagi ya.',
        502,
        true
      );
    }

    return {
      data: parsed.data,
      blocked: false,
      model: resolvedModel,
      usedFallback: false,
      latencyMs,
    };
  }
}

/**
 * Safety settings (M0/H0.2).
 *
 * harassment/hate/dangerous → BLOCK_MEDIUM_AND_ABOVE; sexually explicit →
 * BLOCK_ONLY_HIGH (tetap longgar agar persona tsundere romantis hidup, TAPI
 * wajib dikompensasi guardrail sendiri di M4.2). Jangan turunkan tanpa M4.2.
 */
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

interface GeminiRawResult {
  response?: {
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{ finishReason?: string }>;
  };
}

function isBlocked(result: GeminiRawResult): boolean {
  if (result?.response?.promptFeedback?.blockReason) return true;
  const candidates = result?.response?.candidates;
  if (Array.isArray(candidates) && candidates.length > 0) {
    return candidates.some(
      (c) => c?.finishReason === 'SAFETY' || c?.finishReason === 'PROHIBITED_CONTENT'
    );
  }
  return false;
}

function blockReasonOf(result: GeminiRawResult): string | undefined {
  return result?.response?.promptFeedback?.blockReason;
}
