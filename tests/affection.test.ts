import { describe, it, expect } from 'vitest';
import {
  AFFECTION_LEVELS,
  getAffectionLevel,
  calculateAffectionDelta,
  getUnlockedChapters,
  shouldUnlockChapter,
} from '@/lib/livia/affection';

describe('getAffectionLevel', () => {
  it('memetakan setiap batas level dengan benar', () => {
    expect(getAffectionLevel(0).level).toBe(0);
    expect(getAffectionLevel(19).level).toBe(0);
    expect(getAffectionLevel(20).level).toBe(1);
    expect(getAffectionLevel(39).level).toBe(1);
    expect(getAffectionLevel(40).level).toBe(2);
    expect(getAffectionLevel(60).level).toBe(3);
    expect(getAffectionLevel(80).level).toBe(4);
    expect(getAffectionLevel(100).level).toBe(5);
  });

  it('meng-clamp nilai di luar 0–100', () => {
    expect(getAffectionLevel(-50).level).toBe(0);
    expect(getAffectionLevel(999).level).toBe(5);
  });

  it('setiap nilai 0–100 mendapat level (tidak ada lubang)', () => {
    for (let i = 0; i <= 100; i++) {
      const level = getAffectionLevel(i);
      expect(level).toBeDefined();
      expect(i).toBeGreaterThanOrEqual(level.min);
      expect(i).toBeLessThanOrEqual(level.max);
    }
  });

  it('level berurutan dan tidak tumpang tindih', () => {
    for (let i = 1; i < AFFECTION_LEVELS.length; i++) {
      expect(AFFECTION_LEVELS[i].level).toBe(AFFECTION_LEVELS[i - 1].level + 1);
      expect(AFFECTION_LEVELS[i].min).toBe(AFFECTION_LEVELS[i - 1].max + 1);
    }
  });

  it('tidak menerima NaN sebagai level valid', () => {
    // NaN di-clamp tetap NaN → find gagal → fallback level 0
    expect(getAffectionLevel(NaN).level).toBe(0);
  });
});

describe('calculateAffectionDelta', () => {
  it('positif +3', () => {
    expect(calculateAffectionDelta({ text: 'x', sentiment: 'positive' })).toBe(3);
  });

  it('negatif -2', () => {
    expect(calculateAffectionDelta({ text: 'x', sentiment: 'negative' })).toBe(-2);
  });

  it('netral 0', () => {
    expect(calculateAffectionDelta({ text: 'x', sentiment: 'neutral' })).toBe(0);
  });
});

describe('getUnlockedChapters', () => {
  it('tidak membuka apa pun kalau level tidak naik', () => {
    expect(getUnlockedChapters(25, 25)).toEqual([]);
    expect(getUnlockedChapters(25, 20)).toEqual([]);
  });

  it('membuka satu chapter saat naik satu level', () => {
    expect(getUnlockedChapters(19, 20)).toEqual([1]);
  });

  it('membuka semua chapter yang terlewati (loncat level)', () => {
    expect(getUnlockedChapters(0, 60)).toEqual([1, 2, 3]);
  });

  it('naik ke level maksimum membuka chapter 5', () => {
    expect(getUnlockedChapters(99, 100)).toEqual([5]);
  });
});

describe('shouldUnlockChapter', () => {
  it('mengembalikan chapter tertinggi yang baru terbuka', () => {
    expect(shouldUnlockChapter(0, 60)).toBe(3);
  });

  it('null kalau tidak ada chapter baru', () => {
    expect(shouldUnlockChapter(50, 50)).toBeNull();
  });
});
