import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCycleInfo, describePhysiologicalState, CYCLE_LENGTH_DAYS } from '@/lib/livia/cycle';

const DAY_MS = 1000 * 60 * 60 * 24;
const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('getCycleInfo', () => {
  it('hari ke-1 saat anchor = sekarang', () => {
    const info = getCycleInfo(NOW, NOW);
    expect(info.dayOfCycle).toBe(1);
    expect(info.phase).toBe('Menstruasi');
  });

  it('tanpa anchor → hari ke-1 (perilaku lama)', () => {
    expect(getCycleInfo(null, NOW)).toEqual({ dayOfCycle: 1, phase: 'Menstruasi' });
    expect(getCycleInfo(undefined, NOW)).toEqual({ dayOfCycle: 1, phase: 'Menstruasi' });
  });

  it('anchor tidak valid → hari ke-1, tidak NaN', () => {
    const info = getCycleInfo('bukan tanggal', NOW);
    expect(info.dayOfCycle).toBe(1);
    expect(Number.isNaN(info.dayOfCycle)).toBe(false);
  });

  it.each([
    [0, 1, 'Menstruasi'],
    [4, 5, 'Menstruasi'],
    [5, 6, 'Folikuler'],
    [13, 14, 'Folikuler'],
    [14, 15, 'Ovulasi'],
    [16, 17, 'Ovulasi'],
    [17, 18, 'Luteal'],
    [27, 28, 'Luteal'],
  ])('anchor %i hari lalu → hari ke-%i fase %s', (daysAgo, expectedDay, expectedPhase) => {
    const anchor = new Date(NOW.getTime() - daysAgo * DAY_MS);
    const info = getCycleInfo(anchor, NOW);
    expect(info.dayOfCycle).toBe(expectedDay);
    expect(info.phase).toBe(expectedPhase);
  });

  it('membungkus tepat di panjang siklus', () => {
    const anchor = new Date(NOW.getTime() - CYCLE_LENGTH_DAYS * DAY_MS);
    const info = getCycleInfo(anchor, NOW);
    expect(info.dayOfCycle).toBe(1);
    expect(info.phase).toBe('Menstruasi');
  });

  it('anchor di masa depan tidak menghasilkan hari negatif', () => {
    const anchor = new Date(NOW.getTime() + 5 * DAY_MS);
    const info = getCycleInfo(anchor, NOW);
    expect(info.dayOfCycle).toBeGreaterThanOrEqual(1);
    expect(info.dayOfCycle).toBeLessThanOrEqual(CYCLE_LENGTH_DAYS);
  });

  it('anchor jauh di masa lalu tetap dalam 1..28', () => {
    const anchor = new Date('2020-01-01T00:00:00.000Z');
    const info = getCycleInfo(anchor, NOW);
    expect(info.dayOfCycle).toBeGreaterThanOrEqual(1);
    expect(info.dayOfCycle).toBeLessThanOrEqual(CYCLE_LENGTH_DAYS);
  });

  it('menerima anchor string ISO', () => {
    const anchor = new Date(NOW.getTime() - 7 * DAY_MS).toISOString();
    expect(getCycleInfo(anchor, NOW).dayOfCycle).toBe(8);
  });
});

describe('describePhysiologicalState', () => {
  const base = {
    hunger: 100,
    energy: 100,
    hydration: 100,
    cyclePhase: 'Folikuler',
    cycleDay: 10,
  };

  it('memetakan kondisi penuh ke kata sifat yang benar', () => {
    const text = describePhysiologicalState({ stats: base });
    expect(text).toContain('Kenyang');
    expect(text).toContain('Berenergi');
    expect(text).toContain('Cukup Minum');
    expect(text).toContain('Hari ke-10');
  });

  it('memetakan kondisi kritis ke nada marah', () => {
    const text = describePhysiologicalState({
      stats: { ...base, hunger: 10, energy: 10, hydration: 10 },
    });
    expect(text).toContain('SANGAT KELAPARAN');
    expect(text).toContain('SANGAT KELELAHAN');
    expect(text).toContain('SANGAT DEHIDRASI');
  });

  it.each([
    ['Menstruasi', 'HAID'],
    ['Luteal', 'PMS'],
    ['Ovulasi', 'Ovulasi'],
    ['Folikuler', 'Siklus Normal'],
  ])('fase %s menghasilkan deskripsi yang sesuai', (phase, expected) => {
    const text = describePhysiologicalState({ stats: { ...base, cyclePhase: phase } });
    expect(text).toContain(expected);
  });

  it('bisa mematikan hint perilaku', () => {
    const withHint = describePhysiologicalState({ stats: base });
    const withoutHint = describePhysiologicalState({ stats: base, includeBehaviorHint: false });
    expect(withHint).toContain('HARUS sangat mempengaruhi nada bicara');
    expect(withoutHint).not.toContain('HARUS sangat mempengaruhi nada bicara');
  });

  it('menambahkan aturan TTS saat panggilan suara', () => {
    const text = describePhysiologicalState({ stats: base, voiceCall: true });
    expect(text).toContain('PANGGILAN TELEPON SUARA');
    expect(text).toContain('Text-to-Speech');
  });
});
