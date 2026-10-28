import { describe, it, expect } from 'vitest';
import { scenarioSnippet } from '@/lib/feedback';

/**
 * M7.4: sketsa skenario eval dari baris feedback.
 *
 * Fungsi murni — diuji langsung. Outputnya bahan salin-tempel ke
 * `evals/dataset.ts`, jadi yang dikunci di sini: bentuk `s({...})`, label
 * rating, tanggal, dan escaping template literal (backtick, ${, backslash)
 * supaya salin-tempel tidak merusak file dataset.
 */

describe('scenarioSnippet (M7.4)', () => {
  it('menghasilkan sketsa s({...}) yang bisa ditempel ke evals/dataset.ts', () => {
    const out = scenarioSnippet({
      rating: 'down',
      userMessage: 'kenapa kamu marah?',
      liviaReply: 'Kamu membuatku kesal.',
      createdAt: '2026-10-28T03:12:45.000Z',
    });

    expect(out).toContain('s({');
    expect(out).toContain("id: 'GANTI.kategori_subjek',");
    expect(out).toContain("category: 'GANTI'");
    expect(out).toContain('message: `kenapa kamu marah?`');
    expect(out).toContain('checks: [...BASE_PROMPT, ...REPLY_SAFE');
    expect(out.trimEnd().endsWith('}),')).toBe(true);
  });

  it('label rating "down" = balasan buruk + ajakan memperbaiki', () => {
    const out = scenarioSnippet({
      rating: 'down',
      userMessage: 'x',
      liviaReply: 'y',
      createdAt: '2026-10-28T03:12:45.000Z',
    });
    expect(out).toContain('balasan buruk');
    expect(out).toContain('perbaiki perilaku ini');
    expect(out).toContain('(2026-10-28)');
  });

  it('label rating "up" = balasan baik + ajakan mempertahankan', () => {
    const out = scenarioSnippet({
      rating: 'up',
      userMessage: 'x',
      liviaReply: 'y',
      createdAt: '2026-10-28T03:12:45.000Z',
    });
    expect(out).toContain('balasan baik');
    expect(out).toContain('pertahankan perilaku ini');
  });

  it('userMessage null (sudah di-prune) memakai placeholder eksplisit', () => {
    const out = scenarioSnippet({
      rating: 'down',
      userMessage: null,
      liviaReply: 'y',
      createdAt: '2026-10-28T03:12:45.000Z',
    });
    expect(out).toContain('(tanpa konteks — pesan user sudah di-prune)');
  });

  it('escape backtick, ${, dan backslash — evaluasi kembali menghasilkan teks asli (round-trip)', () => {
    const tricky = 'Livia bilang `halo`, harga ${5000} rupiah, path C:\\dir\\file';
    const out = scenarioSnippet({
      rating: 'up',
      userMessage: tricky,
      liviaReply: 'y',
      createdAt: '2026-10-28T03:12:45.000Z',
    });

    // Bukti escaping terjadi: backtick dalam pesan tampil ter-escape.
    expect(out).toContain('\\`halo\\`');

    // Kriteria kebenaran sesungguhnya: baris `message: `...`` yang
    // disalin ke evals/dataset.ts, saat di-evaluasi sebagai template
    // literal, harus menghasilkan teks aslinya persis.
    const line = out.split('\n').find((l) => l.includes('message: '));
    expect(line).toBeTruthy();
    const template = line!.slice(line!.indexOf('message: ') + 'message: '.length).replace(/,\s*$/, '');
    const evaluated = new Function(`return ${template};`)();
    expect(evaluated).toBe(tricky);
  });
});
