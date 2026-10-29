import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { __resetAIConfigForTests } from '@/lib/ai/config';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { liviaReplyResponseSchema, liviaReplyValidator } from '@/lib/ai/schemas';
import type { GenerateOptions } from '@/lib/ai/types';

/**
 * M8.1: adapter Anthropic.
 *
 * `fetch` global di-stub (bukan SDK) supaya body request yang diuji adalah
 * yang benar-benar dikirim SDK.
 */

const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

const PAYLOAD = {
  reply: 'Aku sedang di kos, sendirian. Kamu kapan pulang?',
  affectionDelta: 3,
  expression: 'clingy',
  memories: [],
  memoryUpdate: '',
};

function messageResponse(text: string, stopReason = 'end_turn') {
  return new Response(
    JSON.stringify({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-test',
      content: [{ type: 'text', text }],
      stop_reason: stopReason,
      stop_sequence: null,
      usage: { input_tokens: 200, output_tokens: 40 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}

function sseResponse(lines: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

function event(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

let snapshot: NodeJS.ProcessEnv;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED, {
    AI_PROVIDER: 'anthropic',
    AI_MODEL_CHAT: 'claude-test',
    AI_MODEL_DIALOGUE: 'claude-test',
    AI_MAX_RETRIES: '0',
    AI_RETRY_BASE_MS: '0',
    ANTHROPIC_API_KEY: 'sk-ant-test-123456789012345678901234',
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
    turns: [
      { role: 'model', text: 'sapaan basi' },
      { role: 'user', text: 'kamu di mana?' },
      { role: 'user', text: 'sendirian?' },
    ],
    responseSchema: liviaReplyResponseSchema,
    outputSchema: liviaReplyValidator,
    temperature: 1.4,
    maxOutputTokens: 700,
    ...overrides,
  };
}

function lastBody(): Record<string, unknown> {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];
  return JSON.parse(String(call[1].body)) as Record<string, unknown>;
}

describe('AnthropicProvider.generate', () => {
  it('mengirim system + skema, menormalkan giliran, mem-parse hasil', async () => {
    fetchMock.mockResolvedValueOnce(messageResponse(JSON.stringify(PAYLOAD)));

    const result = await new AnthropicProvider().generate(options());

    expect(result.blocked).toBe(false);
    expect(result.data).toMatchObject({ reply: PAYLOAD.reply, expression: 'clingy' });
    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 40, totalTokens: 240 });

    const body = lastBody();
    expect(body.model).toBe('claude-test');
    expect(body.max_tokens).toBe(700);
    // SDK Anthropic v1.3 tidak lagi mendukung `temperature`; jangan dikirim.
    expect(body.temperature).toBeUndefined();
    expect(String(body.system)).toContain('HANYA dengan satu objek JSON');
    expect(String(body.system)).toContain('"affectionDelta"');

    // Giliran model di awal dibuang, dua user berurutan digabung.
    expect(body.messages).toEqual([{ role: 'user', content: 'kamu di mana?\nsendirian?' }]);
  });

  it('stop_reason refusal → blocked, bukan error', async () => {
    fetchMock.mockResolvedValueOnce(messageResponse('', 'refusal'));

    const result = await new AnthropicProvider().generate(options());

    expect(result.blocked).toBe(true);
    expect(result.blockReason).toBe('REFUSAL');
  });

  it('konten kosong → blocked NO_CANDIDATE', async () => {
    fetchMock.mockResolvedValueOnce(messageResponse('   '));

    const result = await new AnthropicProvider().generate(options());

    expect(result.blocked).toBe(true);
    expect(result.blockReason).toBe('NO_CANDIDATE');
  });

  it('tanpa API key → ANTHROPIC_NOT_CONFIGURED tanpa request', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    __resetAIConfigForTests();

    await expect(new AnthropicProvider().generate(options())).rejects.toMatchObject({
      code: 'ANTHROPIC_NOT_CONFIGURED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AnthropicProvider.stream', () => {
  it('mengalirkan text_delta dan memakai usage dari stream', async () => {
    const json = JSON.stringify(PAYLOAD);
    const cut = Math.floor(json.length / 2);

    fetchMock.mockResolvedValueOnce(
      sseResponse([
        event('message_start', {
          type: 'message_start',
          message: {
            id: 'msg_test',
            type: 'message',
            role: 'assistant',
            model: 'claude-test',
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 180, output_tokens: 1 },
          },
        }),
        event('content_block_start', {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        }),
        event('content_block_delta', {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: json.slice(0, cut) },
        }),
        event('content_block_delta', {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: json.slice(cut) },
        }),
        event('content_block_stop', { type: 'content_block_stop', index: 0 }),
        event('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', stop_sequence: null },
          usage: { output_tokens: 33 },
        }),
        event('message_stop', { type: 'message_stop' }),
      ])
    );

    const stream = new AnthropicProvider().stream(options());
    let text = '';
    for await (const delta of stream.deltas) text += delta;
    const final = await stream.final;

    expect(text).toBe(PAYLOAD.reply);
    expect(final.data).toMatchObject({ reply: PAYLOAD.reply });
    expect(final.usage).toEqual({ inputTokens: 180, outputTokens: 33, totalTokens: 213 });
  });
});
