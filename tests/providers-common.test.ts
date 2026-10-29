import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { __resetAIConfigForTests } from '@/lib/ai/config';
import {
  normalizeTurns,
  normalizeUsage,
  resolveModelForOperation,
  jsonInstruction,
  isRetryableError,
  RETRYABLE_STATUSES,
} from '@/lib/ai/providers/common';
import { toStrictJsonSchema } from '@/lib/ai/providers/openai';
import { liviaReplyResponseSchema } from '@/lib/ai/schemas';

/**
 * M8.1: helper bersama adapter provider.
 *
 * Fungsi murni — tanpa SDK, tanpa jaringan, tanpa DB.
 */

const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED);
  __resetAIConfigForTests();
});

afterEach(() => {
  process.env = snapshot;
  __resetAIConfigForTests();
});

describe('normalizeTurns', () => {
  it('membuang giliran kosong dan menggabungkan role berurutan', () => {
    const turns = normalizeTurns([
      { role: 'user', text: 'halo' },
      { role: 'user', text: '  ' },
      { role: 'user', text: 'kamu di mana?' },
      { role: 'model', text: 'di kos' },
      { role: 'model', text: 'sendirian' },
    ]);

    expect(turns).toEqual([
      { role: 'user', text: 'halo\nkamu di mana?' },
      { role: 'model', text: 'di kos\nsendirian' },
    ]);
  });

  it('membuang giliran model di awal (percakapan harus mulai dari user)', () => {
    const turns = normalizeTurns([
      { role: 'model', text: 'sapaan pembuka' },
      { role: 'user', text: 'hai' },
    ]);
    expect(turns).toEqual([{ role: 'user', text: 'hai' }]);
  });

  it('tidak memodifikasi array input asli', () => {
    const input = [
      { role: 'user' as const, text: 'a' },
      { role: 'user' as const, text: 'b' },
    ];
    normalizeTurns(input);
    expect(input[0].text).toBe('a');
  });
});

describe('normalizeUsage', () => {
  it('mengembalikan bentuk netral', () => {
    expect(normalizeUsage(10, 5)).toEqual({ inputTokens: 10, outputTokens: 5, totalTokens: 15 });
  });

  it('undefined kalau tidak ada token sama sekali', () => {
    expect(normalizeUsage(undefined, undefined)).toBeUndefined();
    expect(normalizeUsage(0, 0, 0)).toBeUndefined();
  });

  it('mengklamp nilai negatif ke 0', () => {
    expect(normalizeUsage(-5, 3)).toEqual({ inputTokens: 0, outputTokens: 3, totalTokens: 3 });
  });
});

describe('resolveModelForOperation', () => {
  it('memakai model chat untuk operasi biasa', () => {
    process.env.AI_MODEL_CHAT = 'chat-model';
    __resetAIConfigForTests();
    expect(resolveModelForOperation('chat')).toBe('chat-model');
  });

  it('memakai model dialog untuk date.dialogue', () => {
    process.env.AI_MODEL_DIALOGUE = 'dialogue-model';
    __resetAIConfigForTests();
    expect(resolveModelForOperation('date.dialogue')).toBe('dialogue-model');
  });

  it('override (pilihan user) menang atas config', () => {
    process.env.AI_MODEL_CHAT = 'chat-model';
    __resetAIConfigForTests();
    expect(resolveModelForOperation('chat', 'pilihan-user')).toBe('pilihan-user');
  });

  it('provider tanpa model default → error jelas, bukan request kosong', () => {
    process.env.AI_PROVIDER = 'openai-compat';
    delete process.env.AI_MODEL_CHAT;
    delete process.env.AI_MODEL_DIALOGUE;
    __resetAIConfigForTests();

    expect(() => resolveModelForOperation('chat')).toThrowError(/Model AI belum dikonfigurasi/);
  });

  it('default model mengikuti provider', () => {
    process.env.AI_PROVIDER = 'openai';
    __resetAIConfigForTests();
    expect(resolveModelForOperation('chat')).toBe('gpt-4o-mini');

    process.env.AI_PROVIDER = 'anthropic';
    __resetAIConfigForTests();
    expect(resolveModelForOperation('chat')).toBe('claude-3-5-haiku-latest');
  });
});

describe('toStrictJsonSchema', () => {
  it('menambahkan additionalProperties=false dan required lengkap di tiap object', () => {
    const schema = toStrictJsonSchema({
      type: 'object',
      properties: {
        a: { type: 'string' },
        nested: {
          type: 'object',
          properties: { b: { type: 'integer' } },
        },
        list: { type: 'array', items: { type: 'string' } },
      },
    });

    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(['a', 'nested', 'list']);

    const nested = (schema.properties as Record<string, Record<string, unknown>>).nested;
    expect(nested.additionalProperties).toBe(false);
    expect(nested.required).toEqual(['b']);
  });

  it('skema Livia nyata tetap valid untuk strict mode', () => {
    const schema = toStrictJsonSchema(liviaReplyResponseSchema);
    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(
      expect.arrayContaining(['reply', 'affectionDelta', 'expression', 'memories'])
    );

    const memories = (schema.properties as Record<string, Record<string, unknown>>).memories;
    expect(memories.type).toBe('array');
    const items = memories.items as Record<string, unknown>;
    expect(items.additionalProperties).toBe(false);
    expect(items.required).toEqual(['type', 'content', 'confidence']);
  });

  it('tersedia juga lewat modul adapter OpenAI', () => {
    expect(typeof toStrictJsonSchema).toBe('function');
  });
});

describe('jsonInstruction', () => {
  it('memuat system prompt + skema JSON', () => {
    const text = jsonInstruction('Kamu Livia.', liviaReplyResponseSchema);
    expect(text).toContain('Kamu Livia.');
    expect(text).toContain('HANYA dengan satu objek JSON');
    expect(text).toContain('"reply"');
  });
});

describe('isRetryableError', () => {
  it('status 429/5xx layak diulang', () => {
    for (const status of RETRYABLE_STATUSES) {
      expect(isRetryableError(Object.assign(new Error('x'), { status }))).toBe(true);
    }
  });

  it('400/401/403 tidak layak diulang', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      expect(isRetryableError(Object.assign(new Error('x'), { status }))).toBe(false);
    }
  });

  it('error tanpa status (jaringan) layak diulang', () => {
    expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
  });
});
