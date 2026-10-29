import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { __resetAIConfigForTests } from '@/lib/ai/config';
import {
  OpenAIProvider,
  OpenAICompatProvider,
  toStrictJsonSchema,
} from '@/lib/ai/providers/openai';
import { liviaReplyResponseSchema, liviaReplyValidator } from '@/lib/ai/schemas';
import type { GenerateOptions } from '@/lib/ai/types';

/**
 * M8.1: adapter OpenAI & provider OpenAI-compatible.
 *
 * SDK TIDAK di-mock — `fetch` global yang di-stub. Dengan begitu yang diuji
 * adalah body request yang benar-benar dikirim SDK (model, response_format,
 * messages, stream_options), bukan tiruan tangan yang bisa menyimpang dari
 * perilaku nyata.
 */

const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

const PAYLOAD = {
  reply: 'Iya, aku di kos. Kamu kapan pulang?',
  affectionDelta: 2,
  expression: 'happy',
  memories: [],
  memoryUpdate: '',
};

function chatResponse(content: string, finishReason = 'stop', usage = { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 }) {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 1,
      model: 'test-model',
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: finishReason }],
      usage,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}

function apiError(status: number, message: string) {
  return new Response(JSON.stringify({ error: { message, type: 'invalid_request_error' } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function sseResponse(lines: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

function chunk(content: string, finishReason: string | null = null, usage?: unknown): string {
  return `data: ${JSON.stringify({
    id: 'chatcmpl-test',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'test-model',
    choices: [{ index: 0, delta: { content }, finish_reason: finishReason }],
    ...(usage ? { usage } : {}),
  })}\n\n`;
}

let snapshot: NodeJS.ProcessEnv;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED, {
    AI_PROVIDER: 'openai-compat',
    AI_MODEL_CHAT: 'test-model',
    AI_MODEL_DIALOGUE: 'test-model',
    AI_MAX_RETRIES: '0',
    AI_RETRY_BASE_MS: '0',
    OPENAI_API_KEY: 'sk-test-key-123456789012345678901234',
    OPENAI_COMPAT_BASE_URL: 'https://provider.example/v1',
    OPENAI_COMPAT_API_KEY: 'tip_test_key_1234567890',
  });
  __resetAIConfigForTests();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  process.env = snapshot;
  __resetAIConfigForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function options(overrides: Partial<GenerateOptions<unknown>> = {}): GenerateOptions<unknown> {
  return {
    operation: 'chat',
    systemInstruction: 'Kamu Livia.',
    turns: [{ role: 'user', text: 'kamu di mana?' }],
    responseSchema: liviaReplyResponseSchema,
    outputSchema: liviaReplyValidator,
    temperature: 0.6,
    maxOutputTokens: 512,
    ...overrides,
  };
}

function lastBody(): Record<string, unknown> {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];
  return JSON.parse(String(call[1].body)) as Record<string, unknown>;
}

describe('OpenAIProvider (API resmi)', () => {
  it('mengirim json_schema strict + mem-parse hasil', async () => {
    fetchMock.mockResolvedValueOnce(chatResponse(JSON.stringify(PAYLOAD)));

    const provider = new OpenAIProvider();
    const result = await provider.generate(options());

    expect(result.blocked).toBe(false);
    expect(result.data).toMatchObject({ reply: PAYLOAD.reply, affectionDelta: 2 });
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 30, totalTokens: 150 });
    expect(result.model).toBe('test-model');

    const body = lastBody();
    expect(body.model).toBe('test-model');
    expect(body.temperature).toBe(0.6);
    expect(body.max_tokens).toBe(512);
    const format = body.response_format as { type: string; json_schema: { strict: boolean; schema: unknown } };
    expect(format.type).toBe('json_schema');
    expect(format.json_schema.strict).toBe(true);
    expect(format.json_schema.schema).toEqual(toStrictJsonSchema(liviaReplyResponseSchema));

    const messages = body.messages as { role: string; content: string }[];
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe('Kamu Livia.');
    expect(messages[1]).toEqual({ role: 'user', content: 'kamu di mana?' });
  });

  it('finish_reason content_filter → blocked, bukan error', async () => {
    fetchMock.mockResolvedValueOnce(chatResponse('', 'content_filter'));

    const result = await new OpenAIProvider().generate(options());

    expect(result.blocked).toBe(true);
    expect(result.data).toBeNull();
    expect(result.blockReason).toBe('CONTENT_FILTER');
  });

  it('tanpa API key → AppError OPENAI_NOT_CONFIGURED (tidak ada request)', async () => {
    delete process.env.OPENAI_API_KEY;
    __resetAIConfigForTests();

    await expect(new OpenAIProvider().generate(options())).rejects.toMatchObject({
      code: 'OPENAI_NOT_CONFIGURED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('OpenAICompatProvider (pihak ketiga)', () => {
  it('memakai base URL env + json_object + instruksi skema di system prompt', async () => {
    fetchMock.mockResolvedValueOnce(chatResponse(JSON.stringify(PAYLOAD)));

    const result = await new OpenAICompatProvider().generate(options());

    expect(result.data).toMatchObject({ reply: PAYLOAD.reply });

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(call[0])).toContain('https://provider.example/v1');
    // SDK mengirim `Headers`, jadi bandingkan lewat accessor-nya.
    expect(new Headers(call[1].headers).get('authorization')).toBe(
      'Bearer tip_test_key_1234567890'
    );

    const body = lastBody();
    expect(body.response_format).toEqual({ type: 'json_object' });
    const messages = body.messages as { role: string; content: string }[];
    expect(messages[0].content).toContain('HANYA dengan satu objek JSON');
    expect(messages[0].content).toContain('"reply"');
  });

  it('provider menolak response_format (400) → turun ke mode tanpa response_format, lalu berhasil', async () => {
    fetchMock
      .mockResolvedValueOnce(apiError(400, 'response_format json_object is not supported'))
      .mockResolvedValueOnce(chatResponse(JSON.stringify(PAYLOAD)));

    const provider = new OpenAICompatProvider();
    const result = await provider.generate(options());

    expect(result.data).toMatchObject({ reply: PAYLOAD.reply });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const second = JSON.parse(
      String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body)
    ) as Record<string, unknown>;
    expect(second.response_format).toBeUndefined();

    // Mode yang berhasil diingat: request berikutnya langsung tanpa percobaan gagal.
    fetchMock.mockResolvedValueOnce(chatResponse(JSON.stringify(PAYLOAD)));
    await provider.generate(options());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const third = JSON.parse(
      String((fetchMock.mock.calls[2] as [string, RequestInit])[1].body)
    ) as Record<string, unknown>;
    expect(third.response_format).toBeUndefined();
  });

  it('400 karena model tidak ada TIDAK ditelan sebagai downgrade fitur', async () => {
    fetchMock.mockResolvedValueOnce(apiError(400, 'The model `nope` does not exist'));

    await expect(new OpenAICompatProvider().generate(options())).rejects.toMatchObject({
      code: 'AI_GENERATION_FAILED',
    });
  });

  it('output bukan JSON → AI_BAD_STRUCTURE', async () => {
    fetchMock.mockResolvedValueOnce(chatResponse('Tentu! Berikut jawabannya...'));

    await expect(new OpenAICompatProvider().generate(options())).rejects.toMatchObject({
      code: 'AI_BAD_STRUCTURE',
    });
  });

  it('JSON valid tapi melanggar skema → AI_BAD_STRUCTURE', async () => {
    fetchMock.mockResolvedValueOnce(chatResponse(JSON.stringify({ reply: 42 })));

    await expect(new OpenAICompatProvider().generate(options())).rejects.toMatchObject({
      code: 'AI_BAD_STRUCTURE',
    });
  });
});

describe('OpenAICompatProvider.stream', () => {
  it('mengalirkan teks reply dari delta dan memvalidasi hasil akhir', async () => {
    const json = JSON.stringify(PAYLOAD);
    const middle = Math.floor(json.length / 2);

    fetchMock.mockResolvedValueOnce(
      sseResponse([
        chunk(json.slice(0, middle)),
        chunk(json.slice(middle)),
        chunk('', 'stop', { prompt_tokens: 100, completion_tokens: 25, total_tokens: 125 }),
        'data: [DONE]\n\n',
      ])
    );

    const stream = new OpenAICompatProvider().stream(options());
    let text = '';
    for await (const delta of stream.deltas) text += delta;
    const final = await stream.final;

    expect(text).toBe(PAYLOAD.reply);
    expect(final.data).toMatchObject({ reply: PAYLOAD.reply });
    expect(final.usage).toEqual({ inputTokens: 100, outputTokens: 25, totalTokens: 125 });

    const body = lastBody();
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  it('stream_options ditolak → retry tanpa include_usage', async () => {
    const json = JSON.stringify(PAYLOAD);
    fetchMock
      .mockResolvedValueOnce(apiError(400, 'stream_options is not supported'))
      .mockResolvedValueOnce(
        sseResponse([chunk(json), chunk('', 'stop'), 'data: [DONE]\n\n'])
      );

    const stream = new OpenAICompatProvider().stream(options());
    for await (const _delta of stream.deltas) {
      // habiskan aliran
    }
    const final = await stream.final;

    expect(final.data).toMatchObject({ reply: PAYLOAD.reply });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = JSON.parse(
      String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body)
    ) as Record<string, unknown>;
    expect(second.stream_options).toBeUndefined();
  });
});
