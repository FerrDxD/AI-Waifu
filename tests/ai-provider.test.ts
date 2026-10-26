import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { __resetAIConfigForTests } from '@/lib/ai/config';
import { __resetProviderForTests, getProvider } from '@/lib/ai';
import type { GenerateOptions } from '@/lib/ai/types';

/**
 * Test adapter Gemini (M2.2/M2.6) tanpa memanggil jaringan.
 *
 * SDK di-mock di level modul karena provider sengaja menyembunyikan SDK di
 * balik satu file. Kalau nanti provider kedua ditambahkan, test ini tidak
 * perlu tahu-menahu.
 */

const generateContent = vi.fn();

vi.mock('@google/generative-ai', () => {
  class GoogleGenerativeAI {
    constructor(readonly apiKey: string) {}
    getGenerativeModel(config: unknown) {
      return {
        generateContent: (request: unknown) => generateContent(config, request),
      };
    }
  }

  return {
    GoogleGenerativeAI,
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
      BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
    },
    SchemaType: {
      OBJECT: 'object',
      STRING: 'string',
      INTEGER: 'integer',
      ARRAY: 'array',
      NUMBER: 'number',
      BOOLEAN: 'boolean',
    },
  };
});

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

/** Bentuk respons SDK yang sukses. */
function okResponse(payload: unknown) {
  return {
    response: {
      text: () => (typeof payload === 'string' ? payload : JSON.stringify(payload)),
      candidates: [{ finishReason: 'STOP' }],
      promptFeedback: {},
    },
  };
}

const ENV_KEYS = [
  'AI_MODEL_CHAT',
  'AI_MODEL_DIALOGUE',
  'AI_MODEL_FALLBACK',
  'AI_TIMEOUT_MS',
  'AI_MAX_RETRIES',
  'AI_RETRY_BASE_MS',
  'GEMINI_API_KEY',
] as const;

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.GEMINI_API_KEY = 'server-key';
  // Backoff nol supaya test retry tidak butuh detik-detik nyata.
  process.env.AI_RETRY_BASE_MS = '0';
  process.env.AI_MAX_RETRIES = '2';
  __resetAIConfigForTests();
  __resetProviderForTests();
  generateContent.mockReset();
});

afterEach(() => {
  process.env = snapshot;
  __resetAIConfigForTests();
  __resetProviderForTests();
});

describe('GeminiProvider.generate', () => {
  it('mengembalikan data tervalidasi + metadata', async () => {
    generateContent.mockResolvedValue(okResponse({ reply: 'Hmph.', affectionDelta: 1 }));

    const result = await getProvider().generate(makeOptions());

    expect(result.blocked).toBe(false);
    expect(result.data).toEqual({ reply: 'Hmph.', affectionDelta: 1 });
    expect(result.model).toBe('gemini-3.6-flash');
    expect(result.usedFallback).toBe(false);
    expect(typeof result.latencyMs).toBe('number');
  });

  it('memaksa JSON + mengirim systemInstruction & safety settings', async () => {
    generateContent.mockResolvedValue(okResponse({ reply: 'a', affectionDelta: 0 }));

    await getProvider().generate(makeOptions());

    const config = generateContent.mock.calls[0][0] as Record<string, never>;
    expect(config).toMatchObject({
      model: 'gemini-3.6-flash',
      systemInstruction: 'Kamu adalah Livia.',
      generationConfig: { responseMimeType: 'application/json' },
    });
    expect((config as unknown as { safetySettings: unknown[] }).safetySettings).toHaveLength(4);
  });

  it('memakai dialogueModel untuk operasi date.dialogue', async () => {
    process.env.AI_MODEL_DIALOGUE = 'model-dialog';
    __resetAIConfigForTests();
    generateContent.mockResolvedValue(okResponse({ reply: 'a', affectionDelta: 0 }));

    await getProvider().generate(makeOptions({ operation: 'date.dialogue' }));

    expect((generateContent.mock.calls[0][0] as { model: string }).model).toBe('model-dialog');
  });

  it('penolakan safety filter jadi hasil blocked, BUKAN error', async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () => {
          throw new Error('no candidates');
        },
        candidates: [],
        promptFeedback: { blockReason: 'SAFETY' },
      },
    });

    const result = await getProvider().generate(makeOptions());

    expect(result.blocked).toBe(true);
    expect(result.data).toBeNull();
    expect(result.blockReason).toBe('SAFETY');
  });

  it('finishReason SAFETY juga dianggap blocked', async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () => '',
        candidates: [{ finishReason: 'SAFETY' }],
        promptFeedback: {},
      },
    });

    const result = await getProvider().generate(makeOptions());
    expect(result.blocked).toBe(true);
  });

  it('tanpa kandidat sama sekali → blocked NO_CANDIDATE', async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () => {
          throw new Error('no candidates');
        },
        candidates: [],
        promptFeedback: {},
      },
    });

    const result = await getProvider().generate(makeOptions());
    expect(result.blocked).toBe(true);
    expect(result.blockReason).toBe('NO_CANDIDATE');
  });

  it('mengulang 503 lalu berhasil', async () => {
    generateContent
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { status: 503 }))
      .mockResolvedValueOnce(okResponse({ reply: 'ok', affectionDelta: 0 }));

    const result = await getProvider().generate(makeOptions());

    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ reply: 'ok', affectionDelta: 0 });
  });

  it('tidak mengulang 400 (bukan error sementara)', async () => {
    generateContent.mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));

    await expect(getProvider().generate(makeOptions())).rejects.toMatchObject({
      code: 'AI_GENERATION_FAILED',
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('menyerah setelah maxRetries + 1 percobaan', async () => {
    generateContent.mockRejectedValue(Object.assign(new Error('busy'), { status: 429 }));

    await expect(getProvider().generate(makeOptions())).rejects.toMatchObject({
      code: 'AI_GENERATION_FAILED',
    });
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it('pesan error internal tidak bocor ke client', async () => {
    generateContent.mockRejectedValue(new Error('key AIzaSyD-RAHASIA-SEKALI'));

    const error = await getProvider()
      .generate(makeOptions())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).not.toContain('AIzaSy');
  });

  it('memakai model fallback kalau model utama gagal', async () => {
    process.env.AI_MODEL_FALLBACK = 'model-cadangan';
    __resetAIConfigForTests();
    generateContent.mockImplementation((config: { model: string }) => {
      if (config.model === 'model-cadangan') {
        return Promise.resolve(okResponse({ reply: 'dari fallback', affectionDelta: 0 }));
      }
      return Promise.reject(Object.assign(new Error('busy'), { status: 503 }));
    });

    const result = await getProvider().generate(makeOptions());

    expect(result.usedFallback).toBe(true);
    expect(result.model).toBe('model-cadangan');
    expect(result.data).toEqual({ reply: 'dari fallback', affectionDelta: 0 });
  });

  it('fallback juga dipakai untuk date.dialogue', async () => {
    process.env.AI_MODEL_DIALOGUE = 'model-dialog';
    process.env.AI_MODEL_FALLBACK = 'model-cadangan';
    process.env.AI_MAX_RETRIES = '0';
    __resetAIConfigForTests();
    generateContent.mockImplementation((config: { model: string }) => {
      if (config.model === 'model-cadangan') {
        return Promise.resolve(okResponse({ reply: 'ok', affectionDelta: 0 }));
      }
      return Promise.reject(Object.assign(new Error('busy'), { status: 503 }));
    });

    const result = await getProvider().generate(makeOptions({ operation: 'date.dialogue' }));
    expect(result.usedFallback).toBe(true);
  });

  it('JSON rusak → AI_BAD_STRUCTURE, tidak diulang', async () => {
    generateContent.mockResolvedValue(okResponse('ini bukan json'));

    await expect(getProvider().generate(makeOptions())).rejects.toMatchObject({
      code: 'AI_BAD_STRUCTURE',
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('JSON valid tapi melanggar skema → AI_BAD_STRUCTURE', async () => {
    generateContent.mockResolvedValue(okResponse({ reply: 42, affectionDelta: 0 }));

    await expect(getProvider().generate(makeOptions())).rejects.toMatchObject({
      code: 'AI_BAD_STRUCTURE',
    });
  });

  it('konteks kosong → AI_EMPTY_CONTEXT tanpa memanggil SDK', async () => {
    await expect(
      getProvider().generate(makeOptions({ turns: [{ role: 'user', text: '   ' }] }))
    ).rejects.toMatchObject({ code: 'AI_EMPTY_CONTEXT' });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('tanpa key server & tanpa key user → GEMINI_NOT_CONFIGURED', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(getProvider().generate(makeOptions())).rejects.toMatchObject({
      code: 'GEMINI_NOT_CONFIGURED',
    });
  });

  it('key user dipakai kalau ada', async () => {
    delete process.env.GEMINI_API_KEY;
    generateContent.mockResolvedValue(okResponse({ reply: 'a', affectionDelta: 0 }));

    await getProvider().generate(makeOptions({ apiKey: '  user-key  ' }));

    const client = generateContent.mock.calls[0][0];
    expect(client).toBeDefined();
  });

  it('menggabungkan giliran dengan role sama', async () => {
    generateContent.mockResolvedValue(okResponse({ reply: 'a', affectionDelta: 0 }));

    await getProvider().generate(
      makeOptions({
        turns: [
          { role: 'user', text: 'satu' },
          { role: 'user', text: 'dua' },
          { role: 'model', text: 'tiga' },
          { role: 'model', text: 'empat' },
        ],
      })
    );

    const request = generateContent.mock.calls[0][1] as {
      contents: { role: string; parts: { text: string }[] }[];
    };
    expect(request.contents).toHaveLength(2);
    expect(request.contents[0].parts[0].text).toBe('satu\ndua');
    expect(request.contents[1].parts[0].text).toBe('tiga\nempat');
  });

  it('membuang giliran model di awal (Gemini menolak)', async () => {
    generateContent.mockResolvedValue(okResponse({ reply: 'a', affectionDelta: 0 }));

    await getProvider().generate(
      makeOptions({
        turns: [
          { role: 'model', text: 'halo duluan' },
          { role: 'user', text: 'halo' },
        ],
      })
    );

    const request = generateContent.mock.calls[0][1] as { contents: { role: string }[] };
    expect(request.contents[0].role).toBe('user');
  });

  it('mengirim timeout dari config', async () => {
    process.env.AI_TIMEOUT_MS = '7000';
    __resetAIConfigForTests();
    generateContent.mockResolvedValue(okResponse({ reply: 'a', affectionDelta: 0 }));

    await getProvider().generate(makeOptions());

    const request = generateContent.mock.calls[0][1] as { timeout: number };
    expect(request.timeout).toBe(7000);
  });
});
