import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageCreateParamsStreaming,
  MessageParam,
} from '@anthropic-ai/sdk/resources/messages';

import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getAIConfig } from '../config';
import { CircuitBreaker } from '../circuit-breaker';
import { createReplyExtractor } from '../stream/extract';
import { createDeltaQueue } from '../stream/queue';
import type {
  GenerateOptions,
  GenerateResult,
  LLMProvider,
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
 * Adapter Anthropic (M8.1).
 *
 * Berbeda dari Gemini/OpenAI, Messages API **tidak punya native structured
 * output**. Kontrak JSON ditegakkan dua lapis:
 *  1. system prompt diperkuat dengan skema (field `jsonInstruction`),
 *  2. hasil tetap diparse & divalidasi zod — sumber kebenaran yang sama
 *     dengan semua adapter lain.
 *
 * Kalau kelak eval menunjukkan pelanggaran skema, jalur peningkatan yang
 * sudah disiapkan adalah tool-use paksa (`tool_choice`), bukan mengubah
 * kontrak domain.
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;

  private readonly breaker = new CircuitBreaker({
    failureThreshold: getAIConfig().breakerFailureThreshold,
    cooldownMs: getAIConfig().breakerCooldownMs,
  });

  circuitState(): string {
    return this.breaker.state(this.name);
  }

  resetCircuit(): void {
    this.breaker.reset();
  }

  private clientForKey(apiKey: string | undefined): Anthropic {
    const key = apiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim();
    if (!key) {
      throw new AppError(
        'ANTHROPIC_NOT_CONFIGURED',
        'Server AI belum dikonfigurasi. Hubungi admin.',
        500,
        true
      );
    }
    // Retry & backoff milik kita sendiri (M2.6) — jangan dobel.
    return new Anthropic({ apiKey: key, maxRetries: 0 });
  }

  private messages<T>(options: GenerateOptions<T>): MessageParam[] {
    return normalizeTurns(options.turns).map<MessageParam>((turn) => ({
      role: turn.role === 'model' ? 'assistant' : 'user',
      content: turn.text,
    }));
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
      providerLabel: 'AI Anthropic',
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

    const response = await client.messages.create(
      {
        model,
        max_tokens: options.maxOutputTokens ?? 1_024,
        // Catatan M8.1: SDK Anthropic v1.3 TIDAK lagi menerima `temperature`
        // (parameter itu sudah dihapus dari Messages API). Kreativitas diatur
        // lewat prompt persona, bukan angka temperature.
        system: jsonInstruction(options.systemInstruction, options.responseSchema),
        messages: this.messages(options),
      },
      { timeout: timeoutMs }
    );

    const latencyMs = Date.now() - startedAt;
    const usage = normalizeUsage(response.usage?.input_tokens, response.usage?.output_tokens);

    if (response.stop_reason === 'refusal') {
      return {
        data: null,
        blocked: true,
        blockReason: 'REFUSAL',
        model,
        usedFallback: false,
        latencyMs,
        usage,
      };
    }

    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

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
          providerLabel: 'AI Anthropic',
          model: primaryModel,
          queue,
          attempt: (push) => this.streamAttempt(options, cfg.timeoutMs, primaryModel, push),
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

    const stream = await client.messages.create(
      {
        model,
        max_tokens: options.maxOutputTokens ?? 1_024,
        system: jsonInstruction(options.systemInstruction, options.responseSchema),
        messages: this.messages(options),
        stream: true,
      } as MessageCreateParamsStreaming,
      { timeout: timeoutMs }
    );

    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let stopReason: string | null = null;

    for await (const event of stream) {
      switch (event.type) {
        case 'message_start':
          inputTokens = event.message.usage?.input_tokens;
          outputTokens = event.message.usage?.output_tokens;
          break;
        case 'content_block_delta':
          if (event.delta.type === 'text_delta') {
            push(extractor.push(event.delta.text));
          }
          break;
        case 'message_delta':
          if (event.delta.stop_reason) stopReason = event.delta.stop_reason;
          // `output_tokens` di sini bersifat kumulatif.
          if (typeof event.usage?.output_tokens === 'number') {
            outputTokens = event.usage.output_tokens;
          }
          break;
        default:
          break;
      }
    }

    const latencyMs = Date.now() - startedAt;
    const usage = normalizeUsage(inputTokens, outputTokens);

    if (stopReason === 'refusal') {
      return {
        data: null,
        blocked: true,
        blockReason: 'REFUSAL',
        model,
        usedFallback: false,
        latencyMs,
        usage,
      };
    }

    return this.parseResult(options, extractor.raw, model, latencyMs, usage);
  }

  /** Parse + validasi JSON — jalur stream & non-stream memakai aturan identik. */
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
