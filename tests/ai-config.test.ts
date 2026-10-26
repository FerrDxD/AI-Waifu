import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAIConfig, __resetAIConfigForTests } from '@/lib/ai/config';

const ENV_KEYS = [
  'AI_PROVIDER',
  'AI_MODEL_CHAT',
  'AI_MODEL_DIALOGUE',
  'AI_MODEL_FALLBACK',
  'AI_TIMEOUT_MS',
  'AI_MAX_RETRIES',
] as const;

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  for (const key of ENV_KEYS) delete process.env[key];
  __resetAIConfigForTests();
});

afterEach(() => {
  process.env = snapshot;
  __resetAIConfigForTests();
});

describe('getAIConfig', () => {
  it('memakai default lama saat env kosong (tidak mengubah perilaku)', () => {
    const cfg = getAIConfig();
    expect(cfg.provider).toBe('gemini');
    expect(cfg.chatModel).toBe('gemini-3.6-flash');
    expect(cfg.dialogueModel).toBe('gemini-3.6-flash');
    expect(cfg.fallbackModel).toBeNull();
    expect(cfg.timeoutMs).toBe(25_000);
    expect(cfg.maxRetries).toBe(2);
  });

  it('membaca model dari env', () => {
    process.env.AI_MODEL_CHAT = 'model-chat-x';
    process.env.AI_MODEL_DIALOGUE = 'model-dialogue-y';
    const cfg = getAIConfig();
    expect(cfg.chatModel).toBe('model-chat-x');
    expect(cfg.dialogueModel).toBe('model-dialogue-y');
  });

  it('string kosong dianggap tidak diset', () => {
    process.env.AI_MODEL_CHAT = '   ';
    expect(getAIConfig().chatModel).toBe('gemini-3.6-flash');
  });

  it('fallback model kosong → null, bukan string kosong', () => {
    process.env.AI_MODEL_FALLBACK = '';
    expect(getAIConfig().fallbackModel).toBeNull();
  });

  it('membaca fallback model kalau diset', () => {
    process.env.AI_MODEL_FALLBACK = 'gemini-3.6-flash-lite';
    expect(getAIConfig().fallbackModel).toBe('gemini-3.6-flash-lite');
  });

  it('provider tak dikenal diabaikan, tidak membuat app mati', () => {
    process.env.AI_PROVIDER = 'openai';
    expect(getAIConfig().provider).toBe('gemini');
  });

  it('timeout di-clamp ke batas aman', () => {
    process.env.AI_TIMEOUT_MS = '99999999';
    expect(getAIConfig().timeoutMs).toBe(120_000);

    __resetAIConfigForTests();
    process.env.AI_TIMEOUT_MS = '1';
    expect(getAIConfig().timeoutMs).toBe(1_000);
  });

  it('timeout bukan angka → default', () => {
    process.env.AI_TIMEOUT_MS = 'lama';
    expect(getAIConfig().timeoutMs).toBe(25_000);
  });

  it('maxRetries di-clamp dan dibulatkan', () => {
    process.env.AI_MAX_RETRIES = '99';
    expect(getAIConfig().maxRetries).toBe(5);

    __resetAIConfigForTests();
    process.env.AI_MAX_RETRIES = '2.7';
    expect(getAIConfig().maxRetries).toBe(2);
  });

  it('maxRetries negatif → 0', () => {
    process.env.AI_MAX_RETRIES = '-3';
    expect(getAIConfig().maxRetries).toBe(0);
  });

  it('hasil di-cache sampai di-reset', () => {
    const first = getAIConfig();
    process.env.AI_MODEL_CHAT = 'model-baru';
    expect(getAIConfig().chatModel).toBe(first.chatModel);

    __resetAIConfigForTests();
    expect(getAIConfig().chatModel).toBe('model-baru');
  });
});
