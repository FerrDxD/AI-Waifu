import { describe, it, expect } from 'vitest';
import { CHAPTERS, getChapter } from '@/content/story';
import { evaluateRequirement, isChapterUnlocked } from '@/lib/story/requirements';
import type { UserStatsData } from '@/lib/story/types';

/**
 * Integritas konten cerita (M5.1).
 *
 * JSON cerita diedit manusia — pasti suatu saat ada nextIndex yang salah
 * ketik. Kesalahan itu tidak boleh baru ketahuan saat pemain sudah di tengah
 * bab. Test ini mengikat semua bab ke kontrak struktur yang sama.
 */

const stats = (overrides: Partial<UserStatsData> = {}): UserStatsData => ({
  affection: 150,
  accountDays: 100,
  screenTimeHours: 200,
  itemsBrought: [],
  activeOutfit: 'default',
  ...overrides,
});

describe('konten cerita', () => {
  it('memuat 16 bab dengan id 0–15 berurutan tanpa duplikat', () => {
    expect(CHAPTERS).toHaveLength(16);
    expect(CHAPTERS.map((c) => c.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it('setiap bab punya scene tidak kosong dengan speaker & teks', () => {
    for (const ch of CHAPTERS) {
      expect(ch.scenes.length, `bab ${ch.id} kosong`).toBeGreaterThan(0);
      for (const scene of ch.scenes) {
        expect(scene.speaker.length, `bab ${ch.id}: speaker kosong`).toBeGreaterThan(0);
        expect(typeof scene.text, `bab ${ch.id}: text bukan string`).toBe('string');
      }
    }
  });

  it('semua tujuan lompatan (nextIndex & choice) valid', () => {
    for (const ch of CHAPTERS) {
      ch.scenes.forEach((scene, i) => {
        // Kontrak: indeks >= jumlah scene berarti ujung bab. Data asli memakai
        // 999 sebagai penanda tamat (bab 4) — bukan typo, jadi tidak diatur
        // batas atasnya; yang diikat hanyalah bilangan bulat non-negatif.
        if (scene.nextIndex !== undefined) {
          expect(Number.isInteger(scene.nextIndex), `bab ${ch.id} scene ${i}: nextIndex bukan integer`).toBe(true);
          expect(scene.nextIndex, `bab ${ch.id} scene ${i}: nextIndex negatif`).toBeGreaterThanOrEqual(0);
        }
        for (const choice of scene.choices ?? []) {
          expect(
            choice.nextIndex,
            `bab ${ch.id} scene ${i}: pilihan "${choice.text}" negatif`
          ).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(choice.nextIndex)).toBe(true);
        }
      });
    }
  });

  it('getChapter mengembalikan bab yang benar', () => {
    expect(getChapter(0)?.title).toBe('Hari Pertama');
    expect(getChapter(15)?.title).toBe('Pindahan ke Apartemen');
    expect(getChapter(99)).toBeUndefined();
  });
});

describe('isChapterUnlocked', () => {
  const ch2 = getChapter(2)!; // butuh afeksi 40, tanpa syarat tambahan

  it('terbuka hanya jika afeksi terpenuhi', () => {
    expect(isChapterUnlocked(ch2, stats({ affection: 39 }))).toBe(false);
    expect(isChapterUnlocked(ch2, stats({ affection: 40 }))).toBe(true);
  });

  it('bab dengan syarat item menuntut barang dimiliki', () => {
    const ch7 = getChapter(7)!; // accountDays 14, screenTime 70, outfit_casual
    expect(isChapterUnlocked(ch7, stats({ accountDays: 30, screenTimeHours: 100 }))).toBe(false);
    expect(
      isChapterUnlocked(ch7, stats({ accountDays: 30, screenTimeHours: 100, itemsBrought: ['outfit_casual'] }))
    ).toBe(true);
  });

  it('outfitOrItem menerima outfit aktif ATAU barang dimiliki', () => {
    const ch12 = getChapter(12)!;
    const trench = ch12.requirements!.find((r) => r.kind === 'outfitOrItem')!;
    const pakai = (data: UserStatsData) => evaluateRequirement(trench, data);

    expect(pakai(stats({ activeOutfit: 'trench_coat' })).met).toBe(true);
    expect(pakai(stats({ itemsBrought: ['trench_coat'] })).met).toBe(true);
    expect(pakai(stats({ activeOutfit: 'outfit_casual' })).met).toBe(false);
  });
});
