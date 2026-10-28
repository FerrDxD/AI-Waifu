import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ttsCacheKey,
  ttsMaxCharsPerDay,
  dayBucketNow,
  DEFAULT_TTS_MAX_CHARS_PER_DAY,
  TTS_CACHE_MAX_ROWS,
} from '@/lib/tts/cache';

/**
 * Unit test fungsi MURNI `lib/tts/cache.ts` (M6.4).
 *
 * Fungsi DB (get/put/evict/usage) sengaja tidak diuji di sini — query-nya
 * tipis dan diverifikasi lewat test route (mock modul cache) + drift check.
 * Yang diuji di sini adalah LOGIKA yang menentukan perilaku biaya:
 * key deterministik, bucket harian, dan parsing cap env.
 */

describe('ttsCacheKey', () => {
  it('deterministik (input sama → key sama)', () => {
    expect(ttsCacheKey('Halo', 'v1', 'm1')).toBe(ttsCacheKey('Halo', 'v1', 'm1'));
  });

  it('format sha256 hex 64 karakter', () => {
    expect(ttsCacheKey('Halo', 'v1', 'm1')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('teks, voice, dan model masing-masing memengaruhi key', () => {
    const base = ttsCacheKey('Halo', 'v1', 'm1');
    expect(ttsCacheKey('Hallo', 'v1', 'm1')).not.toBe(base);
    expect(ttsCacheKey('Halo', 'v2', 'm1')).not.toBe(base);
    expect(ttsCacheKey('Halo', 'v1', 'm2')).not.toBe(base);
  });

  it('pergeseran field tidak menghasilkan key sama (separatur)', () => {
    // "a|b" sebagai teks vs "b|c" sebagai voice — konten join sama
    // ("a|b" | "c" vs "a" | "b|c" menghasilkan string berbeda).
    expect(ttsCacheKey('a|b', 'c', 'm')).not.toBe(ttsCacheKey('a', 'b|c', 'm'));
  });
});

describe('dayBucketNow', () => {
  it('menyamakan ke awal hari UTC', () => {
    const d = dayBucketNow(new Date('2026-10-28T15:42:07Z'));
    expect(d.toISOString()).toBe('2026-10-28T00:00:00.000Z');
  });

  it('hari lokal beda ≠ hari UTC beda (bucket selalu UTC)', () => {
    // 01:00 WIB-7 (UTC+08:00) tanggal 29 = 17:00 UTC tanggal 28.
    const d = dayBucketNow(new Date('2026-10-29T01:00:00+08:00'));
    expect(d.toISOString()).toBe('2026-10-28T00:00:00.000Z');
  });
});

describe('ttsMaxCharsPerDay', () => {
  let snapshot: string | undefined;

  beforeEach(() => {
    snapshot = process.env.TTS_MAX_CHARS_PER_DAY;
    delete process.env.TTS_MAX_CHARS_PER_DAY;
  });

  afterEach(() => {
    if (snapshot === undefined) delete process.env.TTS_MAX_CHARS_PER_DAY;
    else process.env.TTS_MAX_CHARS_PER_DAY = snapshot;
  });

  it('default 30.000 tanpa env', () => {
    expect(ttsMaxCharsPerDay()).toBe(DEFAULT_TTS_MAX_CHARS_PER_DAY);
    expect(DEFAULT_TTS_MAX_CHARS_PER_DAY).toBe(30_000);
  });

  it('nilai env valid dipakai', () => {
    process.env.TTS_MAX_CHARS_PER_DAY = '50000';
    expect(ttsMaxCharsPerDay()).toBe(50000);
  });

  it('nilai env tidak valid → default (fail ke batas aman)', () => {
    process.env.TTS_MAX_CHARS_PER_DAY = 'abc';
    expect(ttsMaxCharsPerDay()).toBe(DEFAULT_TTS_MAX_CHARS_PER_DAY);
    process.env.TTS_MAX_CHARS_PER_DAY = '-5';
    expect(ttsMaxCharsPerDay()).toBe(DEFAULT_TTS_MAX_CHARS_PER_DAY);
  });
});

describe('TTS_CACHE_MAX_ROWS', () => {
  it('positif (eviction selalu bisa berjalan)', () => {
    expect(TTS_CACHE_MAX_ROWS).toBeGreaterThan(0);
  });
});
