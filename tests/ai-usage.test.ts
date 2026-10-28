import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  dayBucketUtc,
  aiDailyCostLimitUsd,
  shouldAlertBudget,
  DEFAULT_AI_DAILY_COST_LIMIT_USD,
} from '@/lib/ai/usage';

/**
 * Unit test fungsi MURNI `lib/ai/usage.ts` (M7.1).
 *
 * Fungsi DB (recordAiUsage, getUsageOverview) sengaja tidak diuji di sini —
 * modulnya di-mock global di tests/setup.ts (pola `@/lib/auth`), dan kueri
 * DB-nya diverifikasi lewat test route + migrasi + drift check. Konsisten
 * dengan pendekatan tests/tts-cache.test.ts: yang diuji adalah LOGIKA yang
 * menentukan perilaku biaya, bukan lapisan SQL-nya.
 *
 * Catatan: import di atas tetap mendapat implementasi ASLI — mock global
 * memakai `importOriginal` + spread, hanya dua fungsi DB yang digantikan.
 */

describe('dayBucketUtc', () => {
  it('menyamakan ke awal hari UTC', () => {
    expect(dayBucketUtc(new Date('2026-10-28T15:42:07Z')).toISOString()).toBe(
      '2026-10-28T00:00:00.000Z'
    );
  });

  it('tepat di tengah malam UTC tetap di hari yang sama', () => {
    expect(dayBucketUtc(new Date('2026-10-28T00:00:00Z')).toISOString()).toBe(
      '2026-10-28T00:00:00.000Z'
    );
  });

  it('bucket selalu UTC, tidak ikut zona lokal', () => {
    // 01:00 WIB (UTC+07) tanggal 29 = 18:00 UTC tanggal 28.
    expect(dayBucketUtc(new Date('2026-10-29T01:00:00+07:00')).toISOString()).toBe(
      '2026-10-28T00:00:00.000Z'
    );
  });
});

describe('aiDailyCostLimitUsd', () => {
  let snapshot: string | undefined;

  beforeEach(() => {
    snapshot = process.env.AI_DAILY_COST_LIMIT_USD;
    delete process.env.AI_DAILY_COST_LIMIT_USD;
  });

  afterEach(() => {
    if (snapshot === undefined) delete process.env.AI_DAILY_COST_LIMIT_USD;
    else process.env.AI_DAILY_COST_LIMIT_USD = snapshot;
  });

  it('default $5 tanpa env', () => {
    expect(DEFAULT_AI_DAILY_COST_LIMIT_USD).toBe(5);
    expect(aiDailyCostLimitUsd()).toBe(5);
  });

  it('nilai env valid dipakai (termasuk desimal)', () => {
    process.env.AI_DAILY_COST_LIMIT_USD = '12.5';
    expect(aiDailyCostLimitUsd()).toBe(12.5);
  });

  it('nilai env tidak valid → default (fail ke batas aman)', () => {
    process.env.AI_DAILY_COST_LIMIT_USD = 'abc';
    expect(aiDailyCostLimitUsd()).toBe(DEFAULT_AI_DAILY_COST_LIMIT_USD);
    process.env.AI_DAILY_COST_LIMIT_USD = '0';
    expect(aiDailyCostLimitUsd()).toBe(DEFAULT_AI_DAILY_COST_LIMIT_USD);
    process.env.AI_DAILY_COST_LIMIT_USD = '-3';
    expect(aiDailyCostLimitUsd()).toBe(DEFAULT_AI_DAILY_COST_LIMIT_USD);
  });
});

describe('shouldAlertBudget', () => {
  const limitMicros = 5_000_000; // $5

  it('di bawah cap, belum distempel → tidak alert', () => {
    expect(shouldAlertBudget({ costMicros: limitMicros - 1, limitMicros, capExceededAt: null })).toBe(
      false
    );
  });

  it('tepat di cap (bukan lebih) → tidak alert (batas inklusif)', () => {
    expect(shouldAlertBudget({ costMicros: limitMicros, limitMicros, capExceededAt: null })).toBe(
      false
    );
  });

  it('lebih dari cap, belum distempel → ALERT', () => {
    expect(shouldAlertBudget({ costMicros: limitMicros + 1, limitMicros, capExceededAt: null })).toBe(
      true
    );
  });

  it('lebih dari cap tapi sudah distempel hari ini → tidak alert lagi (anti-spam)', () => {
    expect(
      shouldAlertBudget({
        costMicros: limitMicros * 10,
        limitMicros,
        capExceededAt: new Date('2026-10-28T03:00:00Z'),
      })
    ).toBe(false);
  });
});
