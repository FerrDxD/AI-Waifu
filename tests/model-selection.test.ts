import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { __resetAIConfigForTests, getAIConfig } from '@/lib/ai/config';
import {
  getModelCatalog,
  isModelAllowed,
  parseAllowedModels,
  sanitizePreferredModel,
} from '@/lib/ai/model-selection';

/**
 * M8.1 Phase 2: allowlist model.
 *
 * Aturan yang dijaga: server yang menentukan daftar model. Client hanya boleh
 * memilih dari situ; nilai lain harus ditolak, bukan diteruskan ke provider.
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
  delete process.env.AI_ALLOWED_MODELS;
  delete process.env.AI_MODEL_CHAT;
  delete process.env.AI_MODEL_DIALOGUE;
  delete process.env.AI_MODEL_FALLBACK;
  delete process.env.AI_PROVIDER;
  __resetAIConfigForTests();
});

afterEach(() => {
  process.env = snapshot;
  __resetAIConfigForTests();
});

describe('parseAllowedModels', () => {
  it('memisah koma, trim, buang kosong & duplikat', () => {
    expect(parseAllowedModels(' a, b ,, a ,  ')).toEqual(['a', 'b']);
  });

  it('kosong / undefined → array kosong', () => {
    expect(parseAllowedModels('')).toEqual([]);
    expect(parseAllowedModels(undefined)).toEqual([]);
  });
});

describe('getModelCatalog', () => {
  it('memakai AI_ALLOWED_MODELS apa adanya saat diisi', () => {
    process.env.AI_ALLOWED_MODELS = 'deepseek-v4.1-flash-1017,gpt-6-luna';
    __resetAIConfigForTests();

    expect(getModelCatalog()).toEqual([
      { id: 'deepseek-v4.1-flash-1017', label: 'deepseek-v4.1-flash-1017' },
      { id: 'gpt-6-luna', label: 'gpt-6-luna' },
    ]);
  });

  it('tanpa allowlist hanya menawarkan model server (fail-closed)', () => {
    process.env.AI_MODEL_CHAT = 'model-chat';
    process.env.AI_MODEL_DIALOGUE = 'model-dialog';
    process.env.AI_MODEL_FALLBACK = 'model-cadangan';
    __resetAIConfigForTests();

    expect(getModelCatalog().map((option) => option.id)).toEqual([
      'model-chat',
      'model-dialog',
      'model-cadangan',
    ]);
  });

  it('dedupe model server yang sama untuk chat & dialogue', () => {
    process.env.AI_MODEL_CHAT = 'sama';
    process.env.AI_MODEL_DIALOGUE = 'sama';
    __resetAIConfigForTests();

    expect(getModelCatalog()).toEqual([{ id: 'sama', label: 'sama' }]);
  });

  it('provider tanpa default model → katalog kosong, bukan entri string kosong', () => {
    process.env.AI_PROVIDER = 'openai-compat';
    __resetAIConfigForTests();

    expect(getAIConfig().chatModel).toBe('');
    expect(getModelCatalog()).toEqual([]);
  });
});

describe('isModelAllowed', () => {
  it('hanya menerima yang ada di allowlist (case-sensitive)', () => {
    process.env.AI_ALLOWED_MODELS = 'gpt-6-luna';
    __resetAIConfigForTests();

    expect(isModelAllowed('gpt-6-luna')).toBe(true);
    expect(isModelAllowed('GPT-6-Luna')).toBe(false);
    expect(isModelAllowed('gemini-2.5-pro')).toBe(false);
  });

  it('string kosong / spasi tidak pernah diizinkan', () => {
    process.env.AI_ALLOWED_MODELS = 'gpt-6-luna';
    __resetAIConfigForTests();

    expect(isModelAllowed('')).toBe(false);
    expect(isModelAllowed('   ')).toBe(false);
  });
});

describe('sanitizePreferredModel', () => {
  it('null / undefined → undefined (pakai model server)', () => {
    process.env.AI_ALLOWED_MODELS = 'gpt-6-luna';
    __resetAIConfigForTests();

    expect(sanitizePreferredModel(null)).toBeUndefined();
    expect(sanitizePreferredModel(undefined)).toBeUndefined();
  });

  it('pilihan usang (sudah dihapus owner) jatuh ke model server', () => {
    process.env.AI_ALLOWED_MODELS = 'gpt-6-luna';
    __resetAIConfigForTests();

    expect(sanitizePreferredModel('model-yang-sudah-dihapus')).toBeUndefined();
    expect(sanitizePreferredModel('gpt-6-luna')).toBe('gpt-6-luna');
  });

  it('trim nilai tersimpan sebelum dicocokkan', () => {
    process.env.AI_ALLOWED_MODELS = 'gpt-6-luna';
    __resetAIConfigForTests();

    expect(sanitizePreferredModel('  gpt-6-luna  ')).toBe('gpt-6-luna');
  });
});
