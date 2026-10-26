import { describe, it, expect } from 'vitest';
import {
  approximateTokens,
  mergeTurns,
  buildChatContext,
  pickRelevantTurns,
  summarizeContextText,
  DEFAULT_CONTEXT_BUDGET_TOKENS,
  ALWAYS_KEEP_RECENT_TURNS,
  MAX_ROOT_TURNS,
} from '@/lib/ai/context';

/**
 * Context window (M2.5) — semuanya murni, tanpa DB dan SDK.
 */

function turns(
  ...items: Array<[role: 'user' | 'model', text: string]>
): { role: 'user' | 'model'; text: string }[] {
  return items.map(([role, text]) => ({ role, text }));
}

describe('approximateTokens', () => {
  it('teks kosong = 0 token', () => {
    expect(approximateTokens('')).toBe(0);
  });

  it('proporsional terhadap panjang karakter', () => {
    const short = approximateTokens('abcd'); // 4/3.5 → 2
    const long = approximateTokens('abcdefgh'); // 8/3.5 → 3
    expect(long).toBeGreaterThan(short);
  });
});

describe('summarizeContextText', () => {
  it('menggabung ringkasan dengan pemisah', () => {
    expect(summarizeContextText(['A', 'B'])).toBe('A / B');
  });

  it('buang ringkasan kosong', () => {
    expect(summarizeContextText(['', 'B'])).toBe('B');
  });

  it('tidak ada ringkasan = teks kosong', () => {
    expect(summarizeContextText([])).toBe('');
  });
});

describe('mergeTurns', () => {
  it('anggaran longgar: semua turn masih ada', () => {
    const input = turns(['user', 'halo'], ['model', 'hai juga']);
    const result = mergeTurns(input, DEFAULT_CONTEXT_BUDGET_TOKENS);
    expect(result.turns).toHaveLength(2);
    expect(result.dropped).toBe(0);
  });

  it('anggaran kencang: yang hilang duluan yang PALING LAMA, bukan terbaru', () => {
    const input = turns(
      ['user', 'x'.repeat(200)],
      ['model', 'y'.repeat(200)],
      ['user', 'terakhir yang pendek'] // murah — wajib selamat
    );
    // cukup untuk turn terakhir + satu turn 200-karakter, tidak untuk dua
    const result = mergeTurns(input, 130);
    const texts = result.turns.map((t) => t.text);
    expect(texts).toContain('terakhir yang pendek');
    expect(texts[0]).toContain('yyy');
    expect(texts).not.toContain('x'.repeat(200));
  });

  it('turn mahal di tengah dilewati, bukan berhenti di situ', () => {
    const input = turns(
      ['user', 'a'.repeat(30)],
      ['user', 'z'.repeat(500)], // tidak muat → skip
      ['user', 'c'.repeat(30)], // masih muat → tetap ikut
      ['user', 'd'.repeat(30)]
    );
    const result = mergeTurns(input, 30);
    const texts = result.turns.map((t) => t.text);
    expect(texts).not.toContain('z'.repeat(500));
    // bukti skip-bukan-berhenti: turn 'c' yang lebih lama dari 'd' ikut
    expect(texts.some((t) => t === 'c'.repeat(30))).toBe(true);
  });
});

describe('pickRelevantTurns', () => {
  it('pesan dengan 2 kata topik yang sama dipilih', () => {
    const old = turns(['user', 'aku latihan badminton sampai pegal semua badanku']);
    const picked = pickRelevantTurns(old, 'besok main badminton lagi ayok latihan');
    expect(picked).toHaveLength(1);
  });

  it('satu kata umum pendek saja tidak cukup', () => {
    const old = turns(['model', 'nanti kita ngobrol jam delapan malam ya']);
    expect(pickRelevantTurns(old, 'jam berapa')).toHaveLength(0);
  });

  it('satu kata panjang khas sudah cukup (nama/topik unik)', () => {
    const old = turns(['user', 'namaku rafaelkanzler menurutku bagus']);
    // hanya "rafaelkanzler" yang bersinggungan, tapi panjangnya ≥7 huruf
    expect(pickRelevantTurns(old, 'panggil aku rafaelkanzler aja')).toHaveLength(1);
  });

  it('window terbaru tidak ikut dinilai di sini', () => {
    // pickRelevantTurns hanya menerima oldTurns — diuji lewat buildChatContext
    expect(MAX_ROOT_TURNS).toBeGreaterThan(0);
  });
});

describe('buildChatContext', () => {
  it('window terbaru selalu ikut, pesan terbaru TIDAK ditambahkan dobel', () => {
    const history = turns(
      ...Array.from({ length: ALWAYS_KEEP_RECENT_TURNS + 5 }, (_, i) => {
        const role = i % 2 === 0 ? ('user' as const) : ('model' as const);
        return [role, `pesan ke-${i}`] as ['user' | 'model', string];
      })
    );
    const result = buildChatContext({ history, latestUserMessage: 'obsesi aku apaan sih' });

    expect(result.turns.length).toBeGreaterThanOrEqual(ALWAYS_KEEP_RECENT_TURNS);
    // pesan terbaru user TIDAK di-append di sini (domain turnsFromHistory yang menambahkannya)
    expect(result.turns[result.turns.length - 1].text).toBe('pesan ke-18');
    // urutan tetap kronologis
    const indices = result.turns.map((t) => Number(t.text.split('-')[1]));
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it('pesan LAMA yang relevan dibawa kembali di depan window', () => {
    const history = turns(
      ['user', 'gemar sekali memelihara kaktus, merawatnya tiap pagi'], // lama
      ...Array.from({ length: ALWAYS_KEEP_RECENT_TURNS }, (_, i) => {
        const role = i % 2 === 0 ? ('user' as const) : ('model' as const);
        return [role, `obrolan basa-basi nomor ${i}`] as ['user' | 'model', string];
      })
    );
    const result = buildChatContext({
      history,
      latestUserMessage: 'kaktus ku hampir layu, gimana merawatnya?',
      summaries: [],
    });

    // root turn ada di depan, window menyusul
    expect(result.turns[0].text).toContain('kaktus');
  });

  it('anggaran kecil memangkas dari sisi lama, window terbaru selamat', () => {
    const history = turns(
      ...Array.from({ length: 30 }, (_, i) => {
        const role = i % 2 === 0 ? ('user' as const) : ('model' as const);
        return [role, 'x'.repeat(200)] as ['user' | 'model', string];
      })
    );
    const result = buildChatContext({
      history,
      latestUserMessage: 'halo',
      budgetTokens: 120,
    });

    expect(result.turns.length).toBeLessThan(30);
    expect(result.droppedTurns).toBeGreaterThan(0);
    // turn terakhir (paling baru) tidak pernah dibuang
    expect(result.turns[result.turns.length - 1].text).toBe('x'.repeat(200));
  });

  it('ringkasan memakan anggaran tapi tetap tercatat di summaryText', () => {
    const history = turns(['user', 'halo'], ['model', 'hai']);
    const result = buildChatContext({
      history,
      latestUserMessage: 'hi',
      summaries: ['User suka kopi. Janji nonton film Sabtu.'],
    });

    expect(result.summaryText).toContain('kopi');
    expect(result.usedTokens).toBeGreaterThan(approximateTokens(result.summaryText));
  });
});
