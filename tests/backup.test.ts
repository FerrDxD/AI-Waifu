import { describe, it, expect } from 'vitest';
import {
  BACKUP_LIMITS,
  clampInt,
  sanitizeItemList,
  sanitizeChapters,
  sanitizeJobStats,
  sanitizeOutfit,
  sanitizeCycleAnchor,
} from '@/lib/backup';

describe('clampInt', () => {
  it('memotong ke rentang', () => {
    expect(clampInt(150, 0, 100, 0)).toBe(100);
    expect(clampInt(-5, 0, 100, 0)).toBe(0);
    expect(clampInt(42, 0, 100, 0)).toBe(42);
  });

  it('membulatkan ke bawah (truncate)', () => {
    expect(clampInt(7.9, 0, 100, 0)).toBe(7);
    expect(clampInt(-7.9, 0, 100, 0)).toBe(0);
  });

  it('memakai fallback untuk nilai bukan angka', () => {
    expect(clampInt('50', 0, 100, 7)).toBe(7);
    expect(clampInt(null, 0, 100, 7)).toBe(7);
    expect(clampInt(undefined, 0, 100, 7)).toBe(7);
    expect(clampInt({}, 0, 100, 7)).toBe(7);
    expect(clampInt([], 0, 100, 7)).toBe(7);
  });

  it('menolak NaN dan Infinity', () => {
    expect(clampInt(NaN, 0, 100, 7)).toBe(7);
    expect(clampInt(Infinity, 0, 100, 7)).toBe(7);
    expect(clampInt(-Infinity, 0, 100, 7)).toBe(7);
  });

  it('memakai batas uang dari BACKUP_LIMITS', () => {
    expect(clampInt(999_999_999, 0, BACKUP_LIMITS.maxMoney, 0)).toBe(BACKUP_LIMITS.maxMoney);
  });
});

describe('sanitizeItemList', () => {
  it('mengembalikan undefined kalau bukan array', () => {
    expect(sanitizeItemList('buku')).toBeUndefined();
    expect(sanitizeItemList(null)).toBeUndefined();
    expect(sanitizeItemList({ 0: 'buku' })).toBeUndefined();
  });

  it('membuang entri yang bukan string', () => {
    expect(sanitizeItemList(['buku', 1, null, {}, 'pensil'])).toEqual(['buku', 'pensil']);
  });

  it('trim dan membuang string kosong', () => {
    expect(sanitizeItemList(['  buku  ', '   ', ''])).toEqual(['buku']);
  });

  it('membuang duplikat', () => {
    expect(sanitizeItemList(['buku', 'buku', 'pensil'])).toEqual(['buku', 'pensil']);
  });

  it('membatasi panjang tiap ID', () => {
    const long = 'x'.repeat(BACKUP_LIMITS.maxItemIdLength + 1);
    expect(sanitizeItemList(['ok', long])).toEqual(['ok']);
  });

  it('membatasi jumlah item', () => {
    const many = Array.from({ length: 500 }, (_, i) => `item-${i}`);
    expect(sanitizeItemList(many)).toHaveLength(BACKUP_LIMITS.maxItems);
  });

  it('array kosong tetap array kosong (inventaris boleh dikosongkan)', () => {
    expect(sanitizeItemList([])).toEqual([]);
  });
});

describe('sanitizeChapters', () => {
  it('undefined untuk bukan array', () => {
    expect(sanitizeChapters(3)).toBeUndefined();
    expect(sanitizeChapters(null)).toBeUndefined();
  });

  it('membuang chapter di luar 0–5', () => {
    expect(sanitizeChapters([0, 3, 6, -1, 99])).toEqual([0, 3]);
  });

  it('membuang non-integer', () => {
    expect(sanitizeChapters([1, 2.5, '3', null])).toEqual([1]);
  });

  it('unik dan terurut', () => {
    expect(sanitizeChapters([4, 1, 4, 0])).toEqual([0, 1, 4]);
  });

  it('undefined kalau tidak ada chapter valid', () => {
    expect(sanitizeChapters([9, 10])).toBeUndefined();
    expect(sanitizeChapters([])).toBeUndefined();
  });
});

describe('sanitizeJobStats', () => {
  it('undefined untuk bukan objek', () => {
    expect(sanitizeJobStats(null)).toBeUndefined();
    expect(sanitizeJobStats([])).toBeUndefined();
    expect(sanitizeJobStats('x')).toBeUndefined();
  });

  it('hanya menyimpan angka valid', () => {
    expect(sanitizeJobStats({ kasir: 5, koki: 'x', bersih: null })).toEqual({ kasir: 5 });
  });

  it('meng-clamp negatif ke 0 dan memotong desimal', () => {
    expect(sanitizeJobStats({ kasir: -10, koki: 3.9 })).toEqual({ kasir: 0, koki: 3 });
  });

  it('membatasi nilai maksimum', () => {
    expect(sanitizeJobStats({ kasir: 99_999_999 })).toEqual({
      kasir: BACKUP_LIMITS.maxJobStatValue,
    });
  });

  it('membatasi jumlah key', () => {
    const many: Record<string, number> = {};
    for (let i = 0; i < 100; i++) many[`job-${i}`] = i;
    expect(Object.keys(sanitizeJobStats(many) ?? {})).toHaveLength(BACKUP_LIMITS.maxJobStatsKeys);
  });

  it('membuang key kepanjangan', () => {
    const longKey = 'k'.repeat(BACKUP_LIMITS.maxJobStatsKeyLength + 1);
    expect(sanitizeJobStats({ [longKey]: 1, ok: 2 })).toEqual({ ok: 2 });
  });

  it('undefined kalau tidak ada angka sama sekali', () => {
    expect(sanitizeJobStats({ a: 'x' })).toBeUndefined();
    expect(sanitizeJobStats({})).toBeUndefined();
  });
});

describe('sanitizeOutfit', () => {
  it('trim string valid', () => {
    expect(sanitizeOutfit('  yukata  ')).toBe('yukata');
  });

  it('undefined untuk bukan string', () => {
    expect(sanitizeOutfit(42)).toBeUndefined();
    expect(sanitizeOutfit(null)).toBeUndefined();
  });

  it('undefined untuk string kosong atau kepanjangan', () => {
    expect(sanitizeOutfit('   ')).toBeUndefined();
    expect(sanitizeOutfit('x'.repeat(BACKUP_LIMITS.maxItemIdLength + 1))).toBeUndefined();
  });
});

describe('sanitizeCycleAnchor', () => {
  const now = Date.UTC(2026, 9, 25);

  it('menerima tanggal ISO valid', () => {
    const result = sanitizeCycleAnchor('2026-01-15T00:00:00.000Z', now);
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('menolak string bukan tanggal', () => {
    expect(sanitizeCycleAnchor('bukan tanggal', now)).toBeUndefined();
  });

  it('menolak bukan string', () => {
    expect(sanitizeCycleAnchor(1234567890, now)).toBeUndefined();
  });

  it('menolak tanggal sebelum 2020', () => {
    expect(sanitizeCycleAnchor('1999-01-01T00:00:00.000Z', now)).toBeUndefined();
  });

  it('menolak tanggal jauh di masa depan', () => {
    expect(sanitizeCycleAnchor('2099-01-01T00:00:00.000Z', now)).toBeUndefined();
  });

  it('menerima masa depan dekat (toleransi 1 hari)', () => {
    const soon = new Date(now + 60 * 60 * 1000).toISOString();
    expect(sanitizeCycleAnchor(soon, now)).toBeInstanceOf(Date);
  });
});
