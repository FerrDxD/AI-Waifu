import { describe, it, expect } from 'vitest';
import { splitSentences, takeCompleteSentences, TTS_MAX_LEN } from '@/lib/tts/sentences';
import { LIMITS } from '@/lib/validation';

describe('splitSentences', () => {
  it('TTS_MAX_LEN tidak drift dari LIMITS.ttsText (batas biaya)', () => {
    expect(TTS_MAX_LEN).toBe(LIMITS.ttsText);
  });

  it('input kosong/whitespace → []', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   \n\t ')).toEqual([]);
  });

  it('satu kalimat tanpa penutup utuh', () => {
    expect(splitSentences('Halo, kamu sudah makan?')).toEqual(['Halo, kamu sudah makan?']);
  });

  it('memecah di . ! ? yang diikuti spasi', () => {
    expect(splitSentences('Halo. Apa kabar? Aku di sini!')).toEqual([
      'Halo.',
      'Apa kabar?',
      'Aku di sini!',
    ]);
  });

  it('tidak memotong angka desimal (titik tanpa spasi)', () => {
    expect(splitSentences('Nilainya 3.14 ya. Ok?')).toEqual(['Nilainya 3.14 ya.', 'Ok?']);
  });

  it('menyertakan kutip penutup ke kalimatnya', () => {
    expect(splitSentences('Dia bilang " halo ". Kita jalan?')).toEqual([
      'Dia bilang " halo ".',
      'Kita jalan?',
    ]);
  });

  it('memecah di ellipsis …', () => {
    expect(splitSentences('Hmm… lanjut?')).toEqual(['Hmm…', 'lanjut?']);
  });

  it('kalimat >300 karakter dipecah ≤300, utamakan jeda koma', () => {
    const long = `Kata ${'a '.repeat(80).trim()}, lanjut ${'b '.repeat(80).trim()}.`;
    const out = splitSentences(long);
    expect(out.length).toBeGreaterThan(1);
    for (const seg of out) {
      expect(seg.length).toBeLessThanOrEqual(300);
      expect(seg.length).toBeGreaterThan(0);
    }
  });

  it('tidak ada segmen kosong walau banyak penumpukan tanda', () => {
    const out = splitSentences('A. B. C. , , , D!');
    expect(out.length).toBeGreaterThan(0);
    for (const seg of out) expect(seg.length).toBeGreaterThan(0);
  });
});

describe('takeCompleteSentences', () => {
  it('belum ada kalimat lengkap → semua jadi tail', () => {
    expect(takeCompleteSentences('Halo kamu')).toEqual({ sentences: [], tail: 'Halo kamu' });
  });

  it('titik di ujung buffer TIDAK dianggap penutup (bisa angka 3.1 → 3.14)', () => {
    expect(takeCompleteSentences('Nilainya 3.1')).toEqual({
      sentences: [],
      tail: 'Nilainya 3.1',
    });
  });

  it('penutup kuat (! ? …) di ujung buffer dianggap penutup', () => {
    expect(takeCompleteSentences('Benar?')).toEqual({ sentences: ['Benar?'], tail: '' });
    expect(takeCompleteSentences('Hmm…')).toEqual({ sentences: ['Hmm…'], tail: '' });
  });

  it('memisahkan kalimat lengkap dari tail', () => {
    const r = takeCompleteSentences('Halo. Apa kabar? Aku di');
    expect(r.sentences).toEqual(['Halo.', 'Apa kabar?']);
    expect(r.tail).toBe(' Aku di');
  });

  it('menggabung delta bertahap seperti stream SSE', () => {
    let buffer = '';
    const collected: string[] = [];
    for (const delta of ['Halo.', ' Apa', ' kabar?', ' Aku di sini!']) {
      buffer += delta;
      const { sentences, tail } = takeCompleteSentences(buffer);
      collected.push(...sentences);
      buffer = tail;
    }
    expect(collected).toEqual(['Halo.', 'Apa kabar?', 'Aku di sini!']);
    expect(buffer).toBe('');
  });

  it('normalisasi whitespace antar delta konsisten', () => {
    let buffer = '';
    const collected: string[] = [];
    // Delta terakhir (spasi) memicu pemotongan titik terakhir — titik di
    // ujung buffer sengaja belum dianggap penutup (aman untuk angka).
    for (const delta of ['Halo ', '\n', 'kamu.', ' Bagus.', ' ']) {
      buffer += delta;
      const { sentences, tail } = takeCompleteSentences(buffer);
      collected.push(...sentences);
      buffer = tail;
    }
    expect(collected).toEqual(['Halo kamu.', 'Bagus.']);
  });
});
