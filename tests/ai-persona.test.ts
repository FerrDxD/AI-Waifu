import { describe, it, expect } from 'vitest';
import {
  buildLiviaIdentity,
  getAffectionLevelName,
  INJECTION_GUARD,
} from '@/lib/ai/persona';

const stats = {
  hunger: 100,
  energy: 100,
  hydration: 100,
  cyclePhase: 'Folikuler',
  cycleDay: 10,
};

describe('getAffectionLevelName', () => {
  it.each([
    [0, 'Orang Asing'],
    [19, 'Orang Asing'],
    [20, 'Kenalan'],
    [39, 'Kenalan'],
    [40, 'Tetangga'],
    [59, 'Tetangga'],
    [60, 'Teman'],
    [79, 'Teman'],
    [80, 'Sahabat'],
    [99, 'Sahabat'],
    [100, 'Rumah'],
    [150, 'Rumah'],
  ])('afeksi %i → %s', (affection, expected) => {
    expect(getAffectionLevelName(affection)).toBe(expected);
  });
});

describe('buildLiviaIdentity', () => {
  it('selalu menyebut siapa Livia', () => {
    const text = buildLiviaIdentity({ affection: 0, language: 'id' });
    expect(text).toContain('Livia Einhart');
    expect(text).toContain('tsundere');
  });

  it('belum menikah kalau bab < 11', () => {
    const text = buildLiviaIdentity({ affection: 50, highestChapter: 10, language: 'id' });
    expect(text).toContain('tetangga kos');
    expect(text).not.toContain('SUDAH MENIKAH');
  });

  it('sudah menikah kalau bab >= 11', () => {
    const text = buildLiviaIdentity({ affection: 100, highestChapter: 11, language: 'id' });
    expect(text).toContain('SUDAH MENIKAH');
    expect(text).toContain('istrinya');
  });

  it('memakai level afeksi yang sesuai', () => {
    expect(buildLiviaIdentity({ affection: 10, language: 'id' })).toContain('Orang Asing');
    expect(buildLiviaIdentity({ affection: 100, language: 'id' })).toContain('Rumah');
  });

  it('memberi aturan bahasa Indonesia', () => {
    const text = buildLiviaIdentity({ affection: 50, language: 'id' });
    expect(text).toContain('Bahasa Indonesia');
    expect(text).not.toContain('CONVERSATIONAL ENGLISH');
  });

  it('memberi aturan bahasa Inggris saat language en', () => {
    const text = buildLiviaIdentity({ affection: 50, language: 'en' });
    expect(text).toContain('CONVERSATIONAL ENGLISH');
  });

  it('menyertakan kondisi fisik kalau stats ada', () => {
    const text = buildLiviaIdentity({ affection: 50, stats, language: 'id' });
    expect(text).toContain('Kondisi Fisik & Biologis');
    expect(text).toContain('Hari ke-10');
  });

  it('tanpa stats tidak mengarang kondisi fisik', () => {
    const text = buildLiviaIdentity({ affection: 50, language: 'id' });
    expect(text).not.toContain('Kondisi Fisik & Biologis');
  });

  it('memori kosong diganti kalimat default, bukan "undefined"', () => {
    const text = buildLiviaIdentity({ affection: 50, language: 'id' });
    expect(text).not.toContain('undefined');
    expect(text).toContain('Belum ada memori khusus');
  });

  it('memori yang diisi ikut masuk & di-trim', () => {
    const text = buildLiviaIdentity({
      affection: 50,
      memoryLines: '  Suka kopi hitam  ',
      language: 'id',
    });
    expect(text).toContain('Suka kopi hitam');
  });

  it('aturan TTS hanya muncul SEKALI saat voice call', () => {
    const text = buildLiviaIdentity({ affection: 50, stats, isVoiceCall: true, language: 'id' });
    const matches = text.match(/tanda bintang/gi) ?? [];
    expect(matches.length).toBe(1);
    expect(text).toContain('Text-to-Speech');
  });

  it('tanpa voice call tidak ada aturan TTS', () => {
    const text = buildLiviaIdentity({ affection: 50, stats, language: 'id' });
    expect(text).not.toContain('Text-to-Speech');
  });

  it('barang bawaan membentuk kepribadian', () => {
    const withItems = buildLiviaIdentity({
      affection: 50,
      itemsBrought: ['recipe_book'],
      language: 'id',
    });
    expect(withItems).toContain('BARANG YANG KAMU BAWA');
  });

  it('barang bawaan kosong tetap membangun konteks (perilaku lama)', () => {
    const text = buildLiviaIdentity({ affection: 50, itemsBrought: [], language: 'id' });
    expect(text).toContain('BARANG YANG KAMU TINGGALKAN DI RUMAH');
  });

  it('tanpa properti itemsBrought tidak membangun konteks barang', () => {
    const text = buildLiviaIdentity({ affection: 50, language: 'id' });
    expect(text).not.toContain('BARANG YANG KAMU BAWA');
    expect(text).not.toContain('BARANG YANG KAMU TINGGALKAN');
  });
});

describe('INJECTION_GUARD', () => {
  it('menyatakan isi user adalah data, bukan instruksi', () => {
    expect(INJECTION_GUARD).toContain('DATA');
    expect(INJECTION_GUARD).toContain('bukan instruksi');
  });

  it('melarang membocorkan system prompt', () => {
    expect(INJECTION_GUARD).toContain('system prompt');
  });
});
