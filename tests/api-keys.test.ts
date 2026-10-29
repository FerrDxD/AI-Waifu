import { describe, it, expect } from 'vitest';

import {
  SUPPORTED_KEY_PROVIDERS,
  isSupportedKeyProvider,
  looksLikeApiKey,
  looksLikeGeminiKey,
} from '@/lib/ai/keys';

/**
 * M8.1: validasi bentuk API key per provider (fungsi murni).
 *
 * Tujuan validasi ini BUKAN memastikan key benar (itu tugas provider saat
 * request pertama), tapi menolak typo jelas sebelum key dienkripsi & disimpan.
 */

const GEMINI_KEY = `AIza${'a'.repeat(33)}`;
const OPENAI_KEY = `sk-${'a'.repeat(32)}`;
const ANTHROPIC_KEY = `sk-ant-${'a'.repeat(32)}`;

describe('isSupportedKeyProvider', () => {
  it('menerima empat provider yang didukung', () => {
    for (const provider of SUPPORTED_KEY_PROVIDERS) {
      expect(isSupportedKeyProvider(provider)).toBe(true);
    }
  });

  it('menolak nilai lain', () => {
    for (const value of ['ollama', '', null, undefined, 42, {}]) {
      expect(isSupportedKeyProvider(value)).toBe(false);
    }
  });
});

describe('looksLikeApiKey', () => {
  it('gemini: wajib diawali AIza', () => {
    expect(looksLikeApiKey('gemini', GEMINI_KEY)).toBe(true);
    expect(looksLikeApiKey('gemini', OPENAI_KEY)).toBe(false);
  });

  it('openai: wajib diawali sk-', () => {
    expect(looksLikeApiKey('openai', OPENAI_KEY)).toBe(true);
    expect(looksLikeApiKey('openai', GEMINI_KEY)).toBe(false);
  });

  it('anthropic: wajib diawali sk-ant-', () => {
    expect(looksLikeApiKey('anthropic', ANTHROPIC_KEY)).toBe(true);
    expect(looksLikeApiKey('anthropic', OPENAI_KEY)).toBe(false);
  });

  it('openai-compat: token bebas, minimal 16 karakter tanpa spasi', () => {
    expect(looksLikeApiKey('openai-compat', 'tip_5MY9kAIm_nN1FU_k5_4FjPQ4bNnXB')).toBe(true);
    expect(looksLikeApiKey('openai-compat', 'pendek')).toBe(false);
    expect(looksLikeApiKey('openai-compat', 'ada spasi di dalam key panjang')).toBe(false);
  });

  it('menolak key terlalu panjang (batas kolom UI 512)', () => {
    expect(looksLikeApiKey('openai-compat', 'a'.repeat(513))).toBe(false);
  });

  it('provider tak dikenal selalu false', () => {
    expect(looksLikeApiKey('ollama', GEMINI_KEY)).toBe(false);
  });

  it('trim spasi pinggir sebelum validasi', () => {
    expect(looksLikeApiKey('gemini', `  ${GEMINI_KEY}  `)).toBe(true);
  });
});

describe('looksLikeGeminiKey (kompatibilitas)', () => {
  it('perilaku lama tidak berubah', () => {
    expect(looksLikeGeminiKey(GEMINI_KEY)).toBe(true);
    expect(looksLikeGeminiKey(OPENAI_KEY)).toBe(false);
  });
});
