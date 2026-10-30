import { describe, it, expect } from 'vitest';
import {
  QUEST_POOL,
  getDailyQuests,
  getTodayDateString,
  recordQuestAction,
} from '@/lib/livia/quests';

describe('QUEST_POOL', () => {
  it('id unik', () => {
    const ids = QUEST_POOL.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('setiap quest punya target action & route', () => {
    for (const quest of QUEST_POOL) {
      expect(quest.targetAction).toBeTruthy();
      expect(quest.targetRoute.startsWith('/')).toBe(true);
      expect(quest.required).toBeGreaterThan(0);
      expect(quest.text.length).toBeGreaterThan(10);
    }
  });
});

describe('getTodayDateString', () => {
  it('format YYYY-MM-DD', () => {
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDailyQuests', () => {
  it('mengambil tepat 9 quest', () => {
    expect(getDailyQuests('2026-01-01')).toHaveLength(9);
  });

  it('deterministik untuk tanggal yang sama', () => {
    const a = getDailyQuests('2026-05-20').map((q) => q.id);
    const b = getDailyQuests('2026-05-20').map((q) => q.id);
    expect(a).toEqual(b);
  });

  it('tanggal berbeda menghasilkan set berbeda', () => {
    const a = getDailyQuests('2026-05-20')
      .map((q) => q.id)
      .join(',');
    const b = getDailyQuests('2026-05-21')
      .map((q) => q.id)
      .join(',');
    expect(a).not.toBe(b);
  });

  it('tidak ada quest duplikat dalam satu hari', () => {
    const ids = getDailyQuests('2026-12-31').map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('semua quest berasal dari pool', () => {
    const poolIds = new Set(QUEST_POOL.map((q) => q.id));
    for (const quest of getDailyQuests('2026-03-15')) {
      expect(poolIds.has(quest.id)).toBe(true);
    }
  });

  it('tersebar merata dalam setahun (bukan selalu 9 quest pertama)', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 28; day++) {
      const date = `2026-02-${String(day).padStart(2, '0')}`;
      for (const quest of getDailyQuests(date)) seen.add(quest.id);
    }
    // Dalam 28 hari, hampir seluruh pool harus pernah muncul.
    expect(seen.size).toBeGreaterThan(QUEST_POOL.length * 0.8);
  });
});

describe('recordQuestAction (M8.4 — kirim ke server, aman tanpa window)', () => {
  it('tanpa window → {} dan tidak throw', () => {
    // vitest environment node — `window` undefined.
    expect(recordQuestAction('visit_home')).toEqual({});
  });
});
