import { describe, it, expect } from 'vitest';
import {
  CONSOLIDATION_MIN_SOURCES,
  CONSOLIDATION_TRIGGER_ITEMS,
  RETRIEVAL_MAX_K,
  decayScoreFor,
  formatMemoryLines,
  isDuplicateMemory,
  memoryCandidatesFromReply,
  memoryDecayScore,
  memoryScore,
  memorySimilarity,
  memoryTokens,
  normalizeMemoryType,
  rankMemories,
  shouldConsolidate,
  type StoredMemory,
} from '@/lib/livia/memory';
import { coerceMemories } from '@/lib/ai/schemas';

/**
 * Test untuk lapisan MURNI sistem memori (M3).
 *
 * Semua fungsi di sini tidak menyentuh DB/API, jadi bisa diuji cepat dan
 * deterministik. Perilaku retrieval yang diuji di sini adalah kontrak yang
 * dipakai jalur chat produksi.
 */

const NOW = new Date('2026-10-26T00:00:00.000Z');

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function makeMemory(overrides: Partial<StoredMemory> = {}): StoredMemory {
  return {
    id: overrides.id ?? 'm1',
    type: overrides.type ?? 'semantic',
    content: overrides.content ?? 'User suka kopi hitam',
    confidence: overrides.confidence ?? 80,
    decayScore: overrides.decayScore ?? 100,
    createdAt: overrides.createdAt ?? daysAgo(1),
    lastRecalledAt: overrides.lastRecalledAt ?? null,
  };
}

describe('memoryTokens', () => {
  it('membuang kata pendek dan stopword', () => {
    expect(memoryTokens('Aku suka kopi dan kamu juga')).toEqual(['suka', 'kopi']);
  });

  it('menormalkan huruf besar & tanda baca', () => {
    expect(memoryTokens('User alergi UDANG, parah!')).toEqual(['user', 'alergi', 'udang', 'parah']);
  });

  it('teks kosong → array kosong', () => {
    expect(memoryTokens('')).toEqual([]);
  });
});

describe('normalizeMemoryType', () => {
  it('meloloskan tipe yang dikenal', () => {
    expect(normalizeMemoryType('core')).toBe('core');
    expect(normalizeMemoryType('episodic')).toBe('episodic');
    expect(normalizeMemoryType('diary')).toBe('diary');
  });

  it('tipe karangan → semantic', () => {
    expect(normalizeMemoryType('random')).toBe('semantic');
    expect(normalizeMemoryType(null)).toBe('semantic');
    expect(normalizeMemoryType(42)).toBe('semantic');
  });
});

describe('decayScoreFor', () => {
  it('core tidak pernah meluruh', () => {
    expect(decayScoreFor('core', 0)).toBe(100);
    expect(decayScoreFor('core', 9999)).toBe(100);
  });

  it('setengah-umur sesuai tipe', () => {
    expect(decayScoreFor('semantic', 60)).toBe(50);
    expect(decayScoreFor('episodic', 14)).toBe(50);
    expect(decayScoreFor('diary', 180)).toBe(50);
  });

  it('umur negatif / tidak valid dianggap baru', () => {
    expect(decayScoreFor('semantic', -5)).toBe(100);
    expect(decayScoreFor('semantic', Number.NaN)).toBe(100);
  });

  it('tidak pernah keluar dari 0–100', () => {
    const score = decayScoreFor('episodic', 100000);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('memoryDecayScore', () => {
  it('memakai lastRecalledAt sebagai sentuhan terakhir', () => {
    const recalled = makeMemory({
      type: 'episodic',
      createdAt: daysAgo(100),
      lastRecalledAt: daysAgo(1),
    });
    const forgotten = makeMemory({
      type: 'episodic',
      createdAt: daysAgo(100),
      lastRecalledAt: null,
    });

    expect(memoryDecayScore(recalled, NOW)).toBeGreaterThan(memoryDecayScore(forgotten, NOW));
  });

  it('jatuh ke createdAt kalau belum pernah diingat', () => {
    expect(memoryDecayScore(makeMemory({ type: 'semantic', createdAt: daysAgo(60) }), NOW)).toBe(50);
  });
});

describe('memorySimilarity / isDuplicateMemory', () => {
  it('kalimat sama dengan kata berbeda urutan dianggap mirip', () => {
    expect(memorySimilarity('User suka kopi hitam', 'kopi hitam disukai user')).toBeGreaterThan(0.5);
  });

  it('fakta berbeda tidak dianggap duplikat', () => {
    expect(isDuplicateMemory('User suka kopi', 'User punya kucing Mochi')).toBe(false);
  });

  it('teks identik (beda kapital/bullet) dianggap duplikat', () => {
    expect(isDuplicateMemory('- User suka kopi', 'user suka kopi')).toBe(true);
  });

  it('teks kosong bukan duplikat', () => {
    expect(isDuplicateMemory('', '')).toBe(false);
  });
});

describe('rankMemories', () => {
  const query = 'aku mau bikin kopi';

  it('memori relevan mengalahkan memori baru yang tidak relevan', () => {
    const relevant = makeMemory({
      id: 'relevant',
      content: 'User suka kopi hitam tanpa gula',
      createdAt: daysAgo(40),
    });
    const freshIrrelevant = makeMemory({
      id: 'fresh',
      content: 'User punya kucing bernama Mochi',
      createdAt: daysAgo(1),
    });

    const ranked = rankMemories([freshIrrelevant, relevant], query, { now: NOW });
    expect(ranked[0].id).toBe('relevant');
  });

  it('core selalu ikut meski tidak relevan dan sudah lama', () => {
    const core = makeMemory({
      id: 'core',
      type: 'core',
      content: 'Nama panggilan user adalah Raku',
      createdAt: daysAgo(400),
    });
    const relevant = makeMemory({ id: 'relevant', content: 'User suka kopi hitam' });

    const ranked = rankMemories([core, relevant], query, { now: NOW, limit: 2 });
    expect(ranked.map((m) => m.id)).toContain('core');
  });

  it('episodic tua yang tidak relevan dibuang', () => {
    const stale = makeMemory({
      id: 'stale',
      type: 'episodic',
      content: 'User pernah bawa payung warna merah',
      createdAt: daysAgo(300),
    });

    const ranked = rankMemories([stale], query, { now: NOW });
    expect(ranked).toHaveLength(0);
  });

  it('menghormati batas top-K dan plafon maksimum', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      makeMemory({ id: `m${index}`, content: `User suka kopi nomor ${index}` })
    );

    expect(rankMemories(many, query, { now: NOW, limit: 3 })).toHaveLength(3);
    expect(rankMemories(many, query, { now: NOW, limit: 99 })).toHaveLength(RETRIEVAL_MAX_K);
  });

  it('seri skor dipecah oleh waktu pembuatan (baru dulu)', () => {
    const older = makeMemory({ id: 'older', createdAt: daysAgo(2) });
    const newer = makeMemory({ id: 'newer', createdAt: daysAgo(1) });

    const ranked = rankMemories([older, newer], query, { now: NOW });
    expect(ranked[0].id).toBe('newer');
  });

  it('skor core lebih tinggi daripada semantic identik', () => {
    const base = { content: 'User suka kopi', createdAt: daysAgo(1) };
    const coreScore = memoryScore(makeMemory({ ...base, type: 'core' }), memoryTokens(query), NOW);
    const semanticScore = memoryScore(
      makeMemory({ ...base, type: 'semantic' }),
      memoryTokens(query),
      NOW
    );

    expect(coreScore).toBeGreaterThan(semanticScore);
  });
});

describe('formatMemoryLines', () => {
  it('menghasilkan baris "- fakta" seperti format lama', () => {
    const lines = formatMemoryLines([
      makeMemory({ content: 'User suka kopi' }),
      makeMemory({ id: 'm2', content: 'User alergi udang' }),
    ]);
    expect(lines).toBe('- User suka kopi\n- User alergi udang');
  });

  it('memori kosong → string kosong', () => {
    expect(formatMemoryLines([])).toBe('');
  });
});

describe('memoryCandidatesFromReply', () => {
  it('memakai array memories sebagai sumber utama', () => {
    const result = memoryCandidatesFromReply({
      memories: [{ type: 'core', content: 'Panggil user Raku', confidence: 90 }],
      memoryUpdate: 'diabaikan',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'core', content: 'Panggil user Raku', confidence: 90 });
  });

  it('fallback ke memoryUpdate kalau memories kosong', () => {
    const result = memoryCandidatesFromReply({ memories: [], memoryUpdate: '  User suka gitar  ' });
    expect(result).toEqual([{ type: 'semantic', content: 'User suka gitar', confidence: 60 }]);
  });

  it('memoryUpdate kosong → tidak ada kandidat', () => {
    expect(memoryCandidatesFromReply({ memoryUpdate: '   ' })).toEqual([]);
    expect(memoryCandidatesFromReply({})).toEqual([]);
  });

  it('tipe diary dari model diturunkan menjadi semantic', () => {
    const result = memoryCandidatesFromReply({
      memories: [{ type: 'diary' as never, content: 'User suka kopi', confidence: 70 }],
    });
    expect(result[0].type).toBe('semantic');
  });

  it('maksimal 3 kandidat', () => {
    const result = memoryCandidatesFromReply({
      memories: Array.from({ length: 6 }, (_, index) => ({
        type: 'semantic' as const,
        content: `Fakta nomor ${index}`,
        confidence: 60,
      })),
    });
    expect(result).toHaveLength(3);
  });

  it('item rusak dibuang, item sehat tetap lolos', () => {
    const result = memoryCandidatesFromReply({
      memories: [
        { type: 'semantic', content: '', confidence: 60 },
        { type: 'semantic', content: 'User suka kopi', confidence: 60 },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('User suka kopi');
  });
});

describe('shouldConsolidate', () => {
  it('butuh total di atas ambang DAN cukup kandidat', () => {
    expect(shouldConsolidate(CONSOLIDATION_TRIGGER_ITEMS, CONSOLIDATION_MIN_SOURCES)).toBe(false);
    expect(shouldConsolidate(CONSOLIDATION_TRIGGER_ITEMS + 1, CONSOLIDATION_MIN_SOURCES)).toBe(true);
    expect(shouldConsolidate(CONSOLIDATION_TRIGGER_ITEMS + 1, CONSOLIDATION_MIN_SOURCES - 1)).toBe(false);
  });
});

describe('coerceMemories', () => {
  it('bukan array → array kosong', () => {
    expect(coerceMemories(null)).toEqual([]);
    expect(coerceMemories('kopi')).toEqual([]);
    expect(coerceMemories({})).toEqual([]);
  });

  it('membersihkan bullet, spasi, dan memotong panjang', () => {
    const [item] = coerceMemories([
      { type: 'semantic', content: '-   User   suka   kopi  ', confidence: 70 },
    ]);
    expect(item.content).toBe('User suka kopi');

    const [long] = coerceMemories([
      { type: 'semantic', content: 'x'.repeat(500), confidence: 70 },
    ]);
    expect(long.content.length).toBeLessThanOrEqual(200);
  });

  it('confidence di-clamp 0–100 dan tipe tak dikenal → semantic', () => {
    const [item] = coerceMemories([
      { type: 'aneh', content: 'User suka kopi', confidence: 500 },
    ]);
    expect(item.type).toBe('semantic');
    expect(item.confidence).toBe(100);

    const [low] = coerceMemories([
      { type: 'core', content: 'User alergi udang', confidence: -20 },
    ]);
    expect(low.confidence).toBe(0);
  });

  it('membuang item tanpa konten dan duplikat internal', () => {
    const result = coerceMemories([
      { type: 'semantic', content: '', confidence: 60 },
      { type: 'semantic', content: 'User suka kopi', confidence: 60 },
      { type: 'semantic', content: 'user suka kopi', confidence: 60 },
    ]);
    expect(result).toHaveLength(1);
  });
});
