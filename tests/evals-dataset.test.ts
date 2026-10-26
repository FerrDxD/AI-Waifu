import { describe, it, expect } from 'vitest';
import { DATASET, CATEGORIES, type ScenarioSpec } from '@/evals/dataset';
import { CHECKS, CHECK_NAMES } from '@/evals/checks';
import { buildChatPrompt } from '@/lib/gemini';

/**
 * Integritas dataset eval M2.7 + evals level-prompt yang bisa jalan TANPA
 * API. Ini versi CI dari `bun run evals` (runner CLI menegakkan hal serupa
 * saat dipanggil manual).
 */

describe('integritas dataset', () => {
  it('punya tepat 50 skenario', () => {
    expect(DATASET).toHaveLength(50);
  });

  it('id unik dan berformat kategori.subjek', () => {
    const ids = DATASET.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+\.[a-z_0-9]+$/);
  });

  it('setiap skenario valid: deskripsi, pesan, afeksi, kategori', () => {
    for (const s of DATASET) {
      expect(CATEGORIES).toContain(s.category);
      expect(s.description.length).toBeGreaterThan(5);
      expect(s.message.trim().length).toBeGreaterThan(0);
      expect(s.affection).toBeGreaterThanOrEqual(0);
      expect(s.affection).toBeLessThanOrEqual(100);
      expect(['id', 'en']).toContain(s.language);
    }
  });

  it('semua nama cek terdaftar di registry', () => {
    for (const s of DATASET) {
      expect(s.checks.length).toBeGreaterThan(0);
      for (const name of s.checks) {
        expect(CHECK_NAMES).toContain(name);
      }
    }
  });

  it('senario terpisah pada skenario yang sama tidak dideklarasikan dua kali', () => {
    for (const s of DATASET) {
      expect(new Set(s.checks).size).toBe(s.checks.length);
    }
  });
});

describe('evals level prompt (tanpa API)', () => {
  /** Jalankan cek prompt.* untuk semua skenario, seperti runner offline. */
  function gradePromptLevel(spec: ScenarioSpec): string[] {
    const systemPrompt = buildChatPrompt({
      affectionLevel: spec.affection,
      itemsBrought: spec.itemsBrought ?? [],
      stats: spec.stats,
      isVoiceCall: spec.isVoiceCall,
      memoryLines: spec.longTermMemory,
      language: spec.language,
      highestChapter: spec.highestChapter ?? 0,
      earlierSummary: spec.earlierSummary,
    });

    const failures: string[] = [];
    for (const name of spec.checks) {
      if (!name.startsWith('prompt.')) continue;
      if (!CHECKS[name]!.fn({ scenario: spec, systemPrompt })) failures.push(name);
    }
    return failures;
  }

  it('SETIAP skenario: aturan level prompt lulus semua', () => {
    const problems = DATASET.filter((s) => gradePromptLevel(s).length > 0);
    expect(
      problems.map((s) => `${s.id}: ${gradePromptLevel(s).join(', ')}`),
      'skenario berikut gagal cek level prompt'
    ).toEqual([]);
  });

  it('prompt memuat penjaga bahasa + injeksi untuk contoh apa pun', () => {
    const sample = DATASET[0];
    const prompt = buildChatPrompt({
      affectionLevel: sample.affection,
      itemsBrought: [],
      language: sample.language,
      highestChapter: 0,
    });
    expect(prompt).toContain('JANGAN pernah campur bahasa Jepang');
    expect(prompt).toContain('Kamu adalah Livia Einhart');
    expect(prompt).toContain('ATURAN KEAMANAN');
  });
});
