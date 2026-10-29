import OpenAI from 'openai';
import type {
  ChatCompletionCreateParamsBase,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';

import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getAIConfig } from '../config';
import { CircuitBreaker } from '../circuit-breaker';
import { createReplyExtractor } from '../stream/extract';
import { createDeltaQueue } from '../stream/queue';
import type {
  AIProviderName,
  GenerateOptions,
  GenerateResult,
  LLMProvider,
  LlmResponseSchema,
  StreamingGenerate,
} from '../types';
import {
  isBackendFailure,
  jsonInstruction,
  normalizeTurns,
  normalizeUsage,
  resolveModelForOperation,
  runGenerateWithRetry,
  streamOnceWithRetry,
} from './common';

/**
 * Adapter OpenAI + provider OpenAI-compatible (M8.1).
 *
 * Satu class dasar, dua instance:
 *  - `OpenAIProvider`     → api.openai.com, key `OPENAI_API_KEY`.
 *  - `OpenAICompatProvider` → base URL & key dari env (`OPENAI_COMPAT_*`),
 *    dipakai untuk provider pihak ketiga (TipRouter, OpenRouter, Groq,
 *    Ollama yang di-host publik, dsb.) yang bicara protokol Chat Completions.
 *
 * Perbedaan kemampuan antar-provider compatible itu nyata: banyak yang tidak
 * mendukung `response_format: json_schema` strict, sebagian menolak
 * `stream_options.include_usage`. Karena itu ada **downgrade bertahap**:
 * fitur penuh → JSON mode → tanpa fitur opsional, dan mode yang berhasil
 * diingat per proses supaya request berikutnya tidak membayar percobaan gagal.
 * Error 400 karena fitur tidak didukung tidak mengonsumsi token.
 */

/** Mode structured output yang dicoba berurutan. */
type StructuredMode = 'json_schema' | 'json_object' | 'none';

interface ProviderSettings {
  name: AIProviderName;
  /** Nama manusiawi untuk pesan error, mis. "AI OpenAI". */
  providerLabel: string;
  apiKeyEnv: 'OPENAI_API_KEY' | 'OPENAI_COMPAT_API_KEY';
  /** `undefined` = base URL bawaan SDK (api.openai.com/v1). */
  baseURL?: string;
  preferredMode: StructuredMode;
}

/**
 * Normalisasi skema netral ke persyaratan `json_schema` strict OpenAI:
 * setiap object wajib `additionalProperties: false` dan `required` memuat
 * SEMUA properti. Tanpa ini OpenAI menolak dengan 400.
 */
export function toStrictJsonSchema(schema: LlmResponseSchema): Record<string, unknown> {
  const node: Record<string, unknown> = { type: schema.type };
  if (schema.description) node.description = schema.description;

  if (schema.type === 'object') {
    const properties: Record<string, unknown> = {};
    const keys: string[] = [];
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      properties[key] = toStrictJsonSchema(child);
      keys.push(key);
    }
    node.properties = properties;
    node.required = keys;
    node.additionalProperties = false;
  }

  if (schema.type === 'array' && schema.items) {
    node.items = toStrictJsonSchema(schema.items);
  }

  return node;
}

function responseFormatFor(
  mode: StructuredMode,
  schema: LlmResponseSchema
): ChatCompletionCreateParamsBase['response_format'] | undefined {
  if (mode === 'json_schema') {
    return {
      type: 'json_schema',
      json_schema: {
        name: 'livia_response',
        strict: true,
        schema: toStrictJsonSchema(schema),
      },
    };
  }
  if (mode === 'json_object') return { type: 'json_object' };
  return undefined;
}

function errorMessageOf(error: unknown): string {
  return (error as Error | null)?.message ?? '';
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Error 400/422 yang menandakan fitur opsional tidak didukung provider ini
 * (bukan error input user, bukan backend mati).
 */
function isUnsupportedFeatureError(error: unknown): boolean {
  const status = statusOf(error);
  if (status !== 400 && status !== 422) return false;
  return /response_format|json_schema|json_object|structured|stream_options|include_usage/i.test(
    errorMessageOf(error)
  );
}

/** Model reasoning (o1/o3/o4/gpt-5) menolak `temperature` & `max_tokens`. */
function isReasoningModel(model: string): boolean {
  return /^(o1|o3|o4|gpt-5)/i.test(model);
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: AIProviderName;

  private readonly settings: ProviderSettings;
  private readonly breaker: CircuitBreaker;

  /** Mode yang terbukti bekerja di proses ini (`null` = belum dicoba). */
  private workingMode: StructuredMode | null = null;
  /** `false` setelah provider menolak `stream_options.include_usage`. */
  private includeUsage = true;

  constructor(settings: ProviderSettings) {
    this.name = settings.name;
    this.settings = settings;
    this.breaker = new CircuitBreaker({
      failureThreshold: getAIConfig().breakerFailureThreshold,
      cooldownMs: getAIConfig().breakerCooldownMs,
    });
  }

  circuitState(): string {
    return this.breaker.state(this.name);
  }

  resetCircuit(): void {
    this.breaker.reset();
  }

  private clientForKey(apiKey: string | undefined): OpenAI {
    const key = apiKey?.trim() || process.env[this.settings.apiKeyEnv]?.trim();
    if (!key) {
      throw new AppError(
        'OPENAI_NOT_CONFIGURED',
        'Server AI belum dikonfigurasi. Hubungi admin.',
        500,
        true
      );
    }

    return new OpenAI({
      apiKey: key,
      baseURL: this.settings.baseURL,
      // Retry & backoff milik kita sendiri (M2.6) — jangan dobel.
      maxRetries: 0,
    });
  }

  private messages<T>(
    options: GenerateOptions<T>,
    mode: StructuredMode
  ): ChatCompletionMessageParam[] {
    const system =
      mode === 'json_schema'
        ? options.systemInstruction
        : jsonInstruction(options.systemInstruction, options.responseSchema);

    return [
      { role: 'system', content: system },
      ...normalizeTurns(options.turns).map<ChatCompletionMessageParam>((turn) => ({
        role: turn.role === 'model' ? 'assistant' : 'user',
        content: turn.text,
      })),
    ];
  }

  private baseParams<T>(
    options: GenerateOptions<T>,
    model: string,
    mode: StructuredMode
  ): ChatCompletionCreateParamsBase {
    const params: ChatCompletionCreateParamsBase = {
      model,
      messages: this.messages(options, mode),
    };

    const maxTokens = options.maxOutputTokens ?? 1_024;
    if (isReasoningModel(model)) {
      params.max_completion_tokens = maxTokens;
    } else {
      params.temperature = options.temperature ?? 0.7;
      params.max_tokens = maxTokens;
    }

    const format = responseFormatFor(mode, options.responseSchema);
    if (format) params.response_format = format;

    return params;
  }

  /**
   * Jalankan satu request; kalau provider menolak fitur opsional, turunkan
   * mode lalu coba lagi (maks. 3 tingkat: json_schema → json_object → none,
   * dan include_usage → tanpa usage). Mode yang berhasil diingat per proses.
   */
  private async withFeatureFallback<T>(
    fn: (mode: StructuredMode, includeUsage: boolean) => Promise<T>
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const mode = this.workingMode ?? this.settings.preferredMode;
      const includeUsage = this.includeUsage;

      try {
        return await fn(mode, includeUsage);
      } catch (error) {
        if (!isUnsupportedFeatureError(error)) throw error;

        const message = errorMessageOf(error);
        let nextMode = mode;
        let nextUsage = includeUsage;

        if (/response_format|json_schema|json_object|structured/i.test(message) && mode !== 'none') {
          nextMode = mode === 'json_schema' ? 'json_object' : 'none';
        }
        if (/stream_options|include_usage/i.test(message)) {
          nextUsage = false;
        }

        // 400 lain (mis. model tidak ada) — jangan telan, teruskan apa adanya.
        if (nextMode === mode && nextUsage === includeUsage) throw error;

        this.workingMode = nextMode;
        this.includeUsage = nextUsage;
        logger.warn('ai.openai_features_downgraded', {
          provider: this.name,
          fromMode: mode,
          toMode: nextMode,
          includeUsage: nextUsage,
        });
      }
    }

    // Semua tingkat ditolak — provider ini kompatibilitasnya terlalu rendah.
    throw new AppError(
      'AI_GENERATION_FAILED',
      'Provider AI menolak format permintaan. Hubungi admin.',
      503,
      true
    );
  }

  async generate<T>(options: GenerateOptions<T>): Promise<GenerateResult<T>> {
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

    try {
      const result = await this.generateWithRetry(options);
      this.breaker.success(this.name);
      return result;
    } catch (error) {
      if (isBackendFailure(error)) this.breaker.failure(this.name);
      else this.breaker.success(this.name);
      throw error;
    }
  }

  private async generateWithRetry<T>(options: GenerateOptions<T>): Promise<GenerateResult<T>> {
    const cfg = getAIConfig();
    const primaryModel = resolveModelForOperation(options.operation, options.model, cfg);

    return runGenerateWithRetry({
      operation: options.operation,
      providerLabel: this.settings.providerLabel,
      primaryModel,
      fallbackModel: cfg.fallbackModel,
      attempt: (model) => this.generateOnce(options, cfg.timeoutMs, model),
    });
  }

  private async generateOnce<T>(
    options: GenerateOptions<T>,
    timeoutMs: number,
    model: string
  ): Promise<GenerateResult<T>> {
    const startedAt = Date.now();
    const client = this.clientForKey(options.apiKey);

    // Cast eksplisit ke varian non-streaming: `baseParams` sengaja bertipe
    // `ChatCompletionCreateParamsBase` (dipakai juga jalur stream), dan tanpa
    // cast ini TypeScript menganggap `create()` bisa mengembalikan union
    // `ChatCompletion | Stream<ChatCompletionChunk>`.
    const response = await this.withFeatureFallback((mode) =>
      client.chat.completions.create(
        this.baseParams(options, model, mode) as ChatCompletionCreateParamsNonStreaming,
        { timeout: timeoutMs }
      )
    );

    const latencyMs = Date.now() - startedAt;
    const usage = normalizeUsage(
      response.usage?.prompt_tokens,
      response.usage?.completion_tokens,
      response.usage?.total_tokens
    );
    const choice = response.choices?.[0];

    // Safety filter provider → hasil sah, bukan error (kontrak M0/H0.2).
    if (choice?.finish_reason === 'content_filter') {
      return {
        data: null,
        blocked: true,
        blockReason: 'CONTENT_FILTER',
        model,
        usedFallback: false,
        latencyMs,
        usage,
      };
    }

    const text = choice?.message?.content ?? '';
    return this.parseResult(options, text, model, latencyMs, usage);
  }

  stream<T>(options: GenerateOptions<T>): StreamingGenerate<T> {
    const cfg = getAIConfig();

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

    const primaryModel = resolveModelForOperation(options.operation, options.model, cfg);
    const queue = createDeltaQueue();

    const final = (async (): Promise<GenerateResult<T>> => {
      try {
        const result = await streamOnceWithRetry({
          operation: options.operation,
          providerLabel: this.settings.providerLabel,
          model: primaryModel,
          queue,
          attempt: (push) =>
            this.streamAttempt(options, cfg.timeoutMs, primaryModel, push),
        });
        this.breaker.success(this.name);
        return result;
      } catch (error) {
        if (isBackendFailure(error)) this.breaker.failure(this.name);
        else this.breaker.success(this.name);
        throw error;
      } finally {
        queue.close();
      }
    })();

    return { deltas: queue, final };
  }

  private async streamAttempt<T>(
    options: GenerateOptions<T>,
    timeoutMs: number,
    model: string,
    push: (delta: string) => void
  ): Promise<GenerateResult<T>> {
    const startedAt = Date.now();
    const client = this.clientForKey(options.apiKey);
    const extractor = createReplyExtractor();

    const stream = await this.withFeatureFallback((mode, includeUsage) =>
      client.chat.completions.create(
        {
          ...this.baseParams(options, model, mode),
          stream: true,
          ...(includeUsage ? { stream_options: { include_usage: true } } : {}),
        } as ChatCompletionCreateParamsStreaming,
        { timeout: timeoutMs }
      )
    );

    let finishReason: string | null = null;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let totalTokens: number | undefined;

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      const content = choice?.delta?.content;
      if (typeof content === 'string' && content.length > 0) {
        push(extractor.push(content));
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;

      // Chunk terakhir (dengan include_usage) membawa usage & choices kosong.
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
        totalTokens = chunk.usage.total_tokens;
      }
    }

    const latencyMs = Date.now() - startedAt;
    const usage = normalizeUsage(inputTokens, outputTokens, totalTokens);

    if (finishReason === 'content_filter') {
      return {
        data: null,
        blocked: true,
        blockReason: 'CONTENT_FILTER',
        model,
        usedFallback: false,
        latencyMs,
        usage,
      };
    }

    return this.parseResult(options, extractor.raw, model, latencyMs, usage);
  }

  /**
   * Parse + validasi output JSON. Dipakai jalur non-stream & stream supaya
   * aturannya identik (termasuk kode error yang sama).
   */
  private parseResult<T>(
    options: GenerateOptions<T>,
    text: string,
    model: string,
    latencyMs: number,
    usage: GenerateResult<T>['usage']
  ): GenerateResult<T> {
    if (!text.trim()) {
      return {
        data: null,
        blocked: true,
        blockReason: 'NO_CANDIDATE',
        model,
        usedFallback: false,
        latencyMs,
        usage,
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      logger.warn('ai.output_not_json', { operation: options.operation, model });
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
        model,
        issues: parsed.error.issues.slice(0, 5).map((issue) => issue.path.join('.')),
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
      model,
      usedFallback: false,
      latencyMs,
      usage,
    };
  }
}

/** OpenAI resmi — kunci `OPENAI_API_KEY`, JSON Schema strict didahulukan. */
export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      name: 'openai',
      providerLabel: 'AI OpenAI',
      apiKeyEnv: 'OPENAI_API_KEY',
      preferredMode: 'json_schema',
    });
  }
}

/**
 * Provider pihak ketiga berprotokol OpenAI (base URL sendiri).
 * `json_object` didahulukan: paling luas didukung; naik ke `json_schema`
 * tidak dilakukan otomatis karena strict mode bisa menolak skema.
 */
export class OpenAICompatProvider extends OpenAICompatibleProvider {
  constructor(baseURL: string | undefined = process.env.OPENAI_COMPAT_BASE_URL?.trim()) {
    super({
      name: 'openai-compat',
      providerLabel: 'AI provider',
      apiKeyEnv: 'OPENAI_COMPAT_API_KEY',
      baseURL: baseURL || undefined,
      preferredMode: 'json_object',
    });
  }
}
