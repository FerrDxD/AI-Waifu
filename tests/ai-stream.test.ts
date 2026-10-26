import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { __resetAIConfigForTests } from '@/lib/ai/config';
import { __resetProviderForTests, getProvider } from '@/lib/ai';
import { createDeltaQueue } from '@/lib/ai/stream/queue';
import type { GenerateOptions } from '@/lib/ai/types';
import {
  mockGenerateContent,
  mockGenerateContentStream,
} from './gemini-sdk-mock';

/**
 * Streaming provider (M2.1) — diuji dengan SDK yang di-mock, tanpa jaringan.
 *
 * Mock didaftarkan global di `tests/setup.ts`.
 */

const outputSchema = z.object({
  reply: z.string(),
  affectionDelta: z.number(),
});

type Opts = GenerateOptions<{ reply: string; affectionDelta: number }>;

function makeOptions(overrides: Partial<Opts> = {}): Opts {
  return {
    operation: 'chat',
    systemInstruction: 'Kamu adalah Livia.',
    turns: [{ role: 'user', text: 'Halo' }],
    responseSchema: { type: 'object' } as never,
    outputSchema,
    ...overrides,
  };
}

/** Konsumsi seluruh deltas dan balikkan hasilnya + final yang sudah ditunggu. */
async function consume(streaming: Awaited<ReturnType<typeof runStream>>) {
  let text = '';
  for await (const delta of streaming.deltas) text += delta;
  const final = await streaming.final;
  return { text, final };
}

// helper agar tipe hasil sama seperti pemanggil di route
function runStream(options: Opts) {
  return getProvider().stream(options);
}

/**
 * Kumpulan chunk jadi aliran SDK:
 * `{ stream: AsyncGenerator<chunk>, response: Promise<aggregated> }`.
 */
function sdkStream(chunks: unknown[], aggregated: unknown) {
  return {
    stream: (async function* () {
      for (const chunk of chunks) yield chunk as never;
    })(),
    response: Promise.resolve(aggregated as never),
  };
}

const chunk = (text: string) => ({
  candidates: [{ content: { parts: [{ text }] } }],
  promptFeedback: {},
});

const ENV_KEYS = [
  'AI_MODEL_CHAT',
  'AI_MODEL_DIALOGUE',
  'AI_MODEL_FALLBACK',
  'AI_TIMEOUT_MS',
  'AI_MAX_RETRIES',
  'AI_RETRY_BASE_MS',
  'AI_BREAKER_FAILURE_THRESHOLD',
  'AI_BREAKER_COOLDOWN_MS',
  'GEMINI_API_KEY',
] as const;

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.GEMINI_API_KEY = 'server-key';
  process.env.AI_RETRY_BASE_MS = '0';
  process.env.AI_MAX_RETRIES = '0';
  __resetAIConfigForTests();
  __resetProviderForTests();
  mockGenerateContentStream.mockReset();
  mockGenerateContent.mockReset();
});

afterEach(() => {
  process.env = snapshot;
  __resetAIConfigForTests();
  __resetProviderForTests();
});

describe('delta queue', () => {
  it('konsumen lebih dulu tetap menerima urutan push', async () => {
    const queue = createDeltaQueue();
    const iterated = (async () => {
      const out: string[] = [];
      for await (const delta of queue) out.push(delta);
      return out;
    })();

    queue.push('a');
    queue.push('b');
    queue.close();

    await expect(iterated).resolves.toEqual(['a', 'b']);
  });

  it('produksi lebih dulu tetap tertata', async () => {
    const queue = createDeltaQueue();
    queue.push('satu');
    queue.push('dua');
    queue.close();

    const out: string[] = [];
    for await (const delta of queue) out.push(delta);
    expect(out).toEqual(['satu', 'dua']);
  });

  it('delta kosong diabaikan', async () => {
    const queue = createDeltaQueue();
    queue.push('');
    queue.push('x');
    queue.close();
    const out: string[] = [];
    for await (const delta of queue) out.push(delta);
    expect(out).toEqual(['x']);
  });
});

describe('GeminiProvider.stream', () => {
  it('delta mengalir dan final berisi hasil tervalidasi', async () => {
    mockGenerateContentStream.mockResolvedValue(
      sdkStream(
        [chunk('{"reply":"Hah?'), chunk('\\nO-o...'), chunk('halo","affectionDelta":1}')],
        {
          candidates: [{ finishReason: 'STOP' }],
          promptFeedback: {},
        }
      ) as never
    );

    const result = await consume(runStream(makeOptions()));

    expect(result.text).toBe('Hah?\nO-o...halo');
    expect(result.final.blocked).toBe(false);
    expect(result.final.data).toEqual({ reply: 'Hah?\nO-o...halo', affectionDelta: 1 });
    // Paksa JSON + skema dikirim.
    const config = mockGenerateContentStream.mock.calls[0][0] as Record<string, never>;
    expect(config.generationConfig).toMatchObject({ responseMimeType: 'application/json' });
  });

  it('diblokir → tanpa delta, final blocked', async () => {
    mockGenerateContentStream.mockResolvedValue(
      sdkStream([], {
        candidates: [],
        promptFeedback: { blockReason: 'SAFETY' },
      }) as never
    );

    const result = await consume(runStream(makeOptions()));

    expect(result.text).toBe('');
    expect(result.final.blocked).toBe(true);
  });

  it('JSON rusak → final reject AI_BAD_STRUCTURE, deltas tertutup', async () => {
    mockGenerateContentStream.mockResolvedValue(
      sdkStream([chunk('{"reply":"terpotong')], {
        candidates: [{ finishReason: 'STOP' }],
        promptFeedback: {},
      }) as never
    );

    await expect(consume(runStream(makeOptions()))).rejects.toMatchObject({
      code: 'AI_BAD_STRUCTURE',
    });
  });

  it('konteks kosong → AI_EMPTY_CONTEXT tanpa menyentuh SDK', async () => {
    let caught: unknown;
    try {
      runStream(makeOptions({ turns: [{ role: 'user', text: '  ' }] }));
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: 'AI_EMPTY_CONTEXT' });
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });

  it('gagal sebelum delta pertama diulang, lalu berhasil', async () => {
    process.env.AI_MAX_RETRIES = '1';
    __resetAIConfigForTests();
    mockGenerateContentStream
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { status: 503 }))
      .mockResolvedValueOnce(
        sdkStream([chunk('{"reply":"ok","affectionDelta":0}')], {
          candidates: [{ finishReason: 'STOP' }],
          promptFeedback: {},
        }) as never
      );

    const result = await consume(runStream(makeOptions()));

    expect(mockGenerateContentStream).toHaveBeenCalledTimes(2);
    expect(result.text).toBe('ok');
  });

  it('sudah mengirim delta → JANGAN diulang (teks bisa dobel)', async () => {
    process.env.AI_MAX_RETRIES = '2';
    __resetAIConfigForTests();
    // Chunk pertama mengalir, lalu koneksi putus di tengah aliran.
    const streamErr = Object.assign(new Error('broken pipe'), { status: undefined });
    const broken = {
      stream: (async function* () {
        yield chunk('{"reply":"bagian awal"}') as never;
        throw streamErr;
      })(),
      response: Promise.resolve({ candidates: [], promptFeedback: {} } as never),
    };
    mockGenerateContentStream.mockResolvedValue(broken as never);

    const streaming = runStream(makeOptions());
    let text = '';
    for await (const delta of streaming.deltas) text += delta;

    await expect(streaming.final).rejects.toMatchObject({ code: 'AI_GENERATION_FAILED' });
    expect(text).toBe('bagian awal');
    expect(mockGenerateContentStream).toHaveBeenCalledTimes(1);
  });
});
