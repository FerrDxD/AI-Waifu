import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from '@/lib/ai/circuit-breaker';

/**
 * Circuit breaker (M2.6) — murni logika, tanpa jaringan.
 * Waktu di-inject supaya cooldown bisa diuji tanpa menunggu.
 */

function makeBreaker(overrides: Partial<Parameters<typeof build>[0]> = {}) {
  return build({
    failureThreshold: 3,
    cooldownMs: 1_000,
    ...overrides,
  });
}

type Opts = { failureThreshold: number; cooldownMs: number; now?: () => number };

function build(opts: Opts) {
  let clock = 0;
  const now = opts.now ?? (() => clock);
  const breaker = new CircuitBreaker({ ...opts, now });
  return {
    breaker,
    advance(ms: number) {
      clock += ms;
    },
  };
}

describe('CircuitBreaker', () => {
  it('mulai dari keadaan closed', () => {
    const { breaker } = makeBreaker();
    expect(breaker.state('gemini')).toBe('closed');
    expect(breaker.allow('gemini')).toBe(true);
  });

  it('tetap closed selama kegagalan belum mencapai ambang', () => {
    const { breaker } = makeBreaker();
    breaker.failure('gemini');
    breaker.failure('gemini');
    expect(breaker.state('gemini')).toBe('closed');
    expect(breaker.allow('gemini')).toBe(true);
  });

  it('membuka setelah mencapai ambang', () => {
    const { breaker } = makeBreaker();
    breaker.failure('gemini');
    breaker.failure('gemini');
    breaker.failure('gemini');
    expect(breaker.state('gemini')).toBe('open');
    expect(breaker.allow('gemini')).toBe(false);
  });

  it('keberhasilan mereset hitungan kegagalan', () => {
    const { breaker } = makeBreaker();
    breaker.failure('gemini');
    breaker.failure('gemini');
    breaker.success('gemini');
    breaker.failure('gemini');
    breaker.failure('gemini');
    expect(breaker.state('gemini')).toBe('closed');
  });

  it('beralih ke half_open setelah cooldown habis', () => {
    const { breaker, advance } = makeBreaker();
    breaker.failure('gemini');
    breaker.failure('gemini');
    breaker.failure('gemini');
    expect(breaker.state('gemini')).toBe('open');

    advance(999);
    expect(breaker.state('gemini')).toBe('open');

    advance(2);
    expect(breaker.state('gemini')).toBe('half_open');
    expect(breaker.allow('gemini')).toBe(true);
  });

  it('half_open hanya mengizinkan satu percobaan uji', () => {
    const { breaker, advance } = makeBreaker();
    for (let i = 0; i < 3; i++) breaker.failure('gemini');
    advance(1_000);

    expect(breaker.allow('gemini')).toBe(true); // percobaan uji
    expect(breaker.allow('gemini')).toBe(false); // yang lain ditahan
  });

  it('percobaan uji berhasil → closed', () => {
    const { breaker, advance } = makeBreaker();
    for (let i = 0; i < 3; i++) breaker.failure('gemini');
    advance(1_000);

    expect(breaker.allow('gemini')).toBe(true);
    breaker.success('gemini');

    expect(breaker.state('gemini')).toBe('closed');
    expect(breaker.allow('gemini')).toBe(true);
  });

  it('percobaan uji gagal → open lagi tanpa menunggu ambang', () => {
    const { breaker, advance } = makeBreaker();
    for (let i = 0; i < 3; i++) breaker.failure('gemini');
    advance(1_000);
    expect(breaker.allow('gemini')).toBe(true);

    breaker.failure('gemini');

    expect(breaker.state('gemini')).toBe('open');
    // Cooldown baru dihitung dari sekarang, bukan dari pembukaan pertama.
    advance(999);
    expect(breaker.state('gemini')).toBe('open');
    advance(2);
    expect(breaker.state('gemini')).toBe('half_open');
  });

  it('key berbeda tidak saling memengaruhi', () => {
    const { breaker } = makeBreaker();
    for (let i = 0; i < 3; i++) breaker.failure('gemini');

    expect(breaker.state('gemini')).toBe('open');
    expect(breaker.state('lain')).toBe('closed');
    expect(breaker.allow('lain')).toBe(true);
  });

  it('reset(key) membuka kembali satu key saja', () => {
    const { breaker } = makeBreaker();
    for (let i = 0; i < 3; i++) {
      breaker.failure('gemini');
      breaker.failure('lain');
    }
    breaker.reset('gemini');

    expect(breaker.state('gemini')).toBe('closed');
    expect(breaker.state('lain')).toBe('open');
  });

  it('reset() tanpa argumen membersihkan semua', () => {
    const { breaker } = makeBreaker();
    for (let i = 0; i < 3; i++) {
      breaker.failure('gemini');
      breaker.failure('lain');
    }
    breaker.reset();
    expect(breaker.snapshot()).toEqual({});
  });

  it('snapshot hanya berisi breaker yang tidak closed', () => {
    const { breaker, advance } = makeBreaker();
    for (let i = 0; i < 3; i++) breaker.failure('gemini');
    breaker.failure('lain');

    expect(breaker.snapshot()).toEqual({ gemini: 'open' });

    advance(1_000);
    expect(breaker.snapshot()).toEqual({ gemini: 'half_open' });
  });

  it('cooldown 0 langsung half_open setelah gagal', () => {
    const { breaker } = makeBreaker({ cooldownMs: 0 });
    for (let i = 0; i < 3; i++) breaker.failure('gemini');
    expect(breaker.state('gemini')).toBe('half_open');
  });

  it('ambang 1 berarti satu kegagalan langsung membuka', () => {
    const { breaker } = makeBreaker({ failureThreshold: 1 });
    breaker.failure('gemini');
    expect(breaker.state('gemini')).toBe('open');
  });

  it('ambang tidak valid (0) tetap diperlakukan minimal 1', () => {
    const { breaker } = makeBreaker({ failureThreshold: 0 });
    breaker.failure('gemini');
    expect(breaker.state('gemini')).toBe('open');
  });
});
