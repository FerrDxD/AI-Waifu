import { describe, it, expect } from 'vitest';
import {
  wrapTextLines,
  buildShareUrl,
  parseShareParams,
  shareFileName,
  DEFAULT_LAYOUT,
} from '@/lib/share/share-card';

describe('wrapTextLines (M8.6)', () => {
  const measure = (s: string) => s.length * 10;

  it('mengembalikan [] untuk teks kosong', () => {
    expect(wrapTextLines(measure, '', 100)).toEqual([]);
    expect(wrapTextLines(measure, '   ', 100)).toEqual([]);
  });

  it('tidak memecah teks yang muat satu baris', () => {
    expect(wrapTextLines(measure, 'halo dunia', 200)).toEqual(['halo dunia']);
  });

  it('memecah teks panjang menjadi beberapa baris', () => {
    const lines = wrapTextLines(measure, 'satu dua tiga empat lima', 60);
    expect(lines.length).toBeGreaterThan(1);
    // Gabungan harus sama dengan teks asli (tanpa spasi ganda).
    expect(lines.join(' ')).toBe('satu dua tiga empat lima');
  });

  it('memecah paragraf dengan newline', () => {
    const lines = wrapTextLines(measure, 'baris satu\nbaris dua', 200);
    expect(lines).toEqual(['baris satu', 'baris dua']);
  });

  it('memotong kata yang lebih panjang dari maxWidth', () => {
    const lines = wrapTextLines(measure, 'supercalifragilisticexpialidocious', 50);
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((l) => expect(measure(l)).toBeLessThanOrEqual(50));
  });
});

describe('buildShareUrl / parseShareParams (M8.6)', () => {
  it('roundtrip: build lalu parse mengembalikan data yang sama', () => {
    const data = { userText: 'halo', liviaText: 'hai juga', userName: 'Budi' };
    const url = buildShareUrl('https://livia.qzz.io', data);
    expect(url).toContain('/share?');
    const params = new URL(url).searchParams;
    const parsed = parseShareParams(params);
    expect(parsed).not.toBeNull();
    expect(parsed?.userText).toBe('halo');
    expect(parsed?.liviaText).toBe('hai juga');
    expect(parsed?.userName).toBe('Budi');
  });

  it('parse mengembalikan null kalau u/l tidak lengkap', () => {
    expect(parseShareParams(new URLSearchParams('u=halo'))).toBeNull();
    expect(parseShareParams(new URLSearchParams('l=hai'))).toBeNull();
    expect(parseShareParams(new URLSearchParams(''))).toBeNull();
  });

  it('buildShareUrl membuang trailing slash origin', () => {
    const url = buildShareUrl('https://livia.qzz.io/', { userText: 'a', liviaText: 'b' });
    expect(url).toBe('https://livia.qzz.io/share?u=a&l=b');
  });
});

describe('shareFileName (M8.6)', () => {
  it('membuat slug dari balasan Livia', () => {
    expect(shareFileName({ userText: 'x', liviaText: 'Halo Dunia!' })).toBe('teman-kos-halo-dunia.png');
  });

  it('fallback "moment" kalau balasan kosong/non-alphanum', () => {
    expect(shareFileName({ userText: 'x', liviaText: '!!!' })).toBe('teman-kos-moment.png');
  });
});

describe('DEFAULT_LAYOUT (M8.6)', () => {
  it('dimensi portrait 1080x1350', () => {
    expect(DEFAULT_LAYOUT.width).toBe(1080);
    expect(DEFAULT_LAYOUT.height).toBe(1350);
  });
});
