import { describe, it, expect } from 'vitest';
import {
  characters,
  getCharacter,
  resolveSpriteExpression,
  DEFAULT_CHARACTER_ID,
  type Character,
} from '@/lib/characters/registry';
import {
  buildCharacterIdentity,
  buildLiviaIdentity,
  type PersonaContextInput,
} from '@/lib/ai/persona';
import { describePhysiologicalState } from '@/lib/livia/cycle';

const stats = {
  hunger: 100,
  energy: 100,
  hydration: 100,
  cyclePhase: 'Folikuler',
  cycleDay: 10,
};

/**
 * Regression kritis M8.2 Phase A: prompt Livia dari builder generik harus
 *identik byte-demi-byte dengan implementasi `buildLiviaIdentity` lama.
 * Kalau ini pecah, berarti refactor mengubah perilaku Livia.
 */
describe('Livia prompt tidak berubah (byte-identical)', () => {
  const combos: PersonaContextInput[] = [
    { affection: 0, language: 'id' },
    { affection: 19, language: 'id' },
    { affection: 50, highestChapter: 10, language: 'id' },
    {
      affection: 100,
      highestChapter: 11,
      language: 'id',
      memoryLines: '  - Suka kopi hitam  ',
      itemsBrought: ['recipe_book'],
    },
    { affection: 75, language: 'en', isVoiceCall: true, stats },
    { affection: 75, language: 'id', stats, itemsBrought: [] },
    { affection: 60, highestChapter: 15, language: 'id', isVoiceCall: true },
  ];

  it.each(combos)('kombinasi input %#', input => {
    const viaRegistry = buildCharacterIdentity(getCharacter('livia'), input);
    const viaLegacy = buildLiviaIdentity(input);
    expect(viaRegistry).toBe(viaLegacy);
  });

  it('eval marker tetap ada: identitas, tsundere, dan kondisi fisik', () => {
    const text = buildLiviaIdentity({ affection: 50, stats, language: 'id' });
    expect(text).toContain('Kamu adalah Livia Einhart, gadis');
    expect(text).toContain('tsundere');
    expect(text).toContain('Kondisi Fisik & Biologis Livia');
  });
});

describe('registry karakter', () => {
  it('memuat lima karakter dengan id unik', () => {
    const ids = characters.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('livia');
    expect(ids).toContain('ayame');
    expect(ids).toContain('enji');
    expect(ids).toContain('laura');
    expect(ids).toContain('naomi');
  });

  it('default karakter adalah Livia', () => {
    expect(DEFAULT_CHARACTER_ID).toBe('livia');
    expect(getCharacter().id).toBe('livia');
    expect(getCharacter(null).id).toBe('livia');
    expect(getCharacter('').id).toBe('livia');
    expect(getCharacter('karakter-tidak-ada').id).toBe('livia');
  });

  it('fallback menutup semua ekspresi inti', () => {
    for (const character of characters) {
      expect(character.sprite.expressions.length).toBeGreaterThan(0);
      // setiap karakter punya jaring terakhir yang valid
      expect(character.sprite.expressions).toContain(character.sprite.defaultExpression);
    }
  });

  it('hanya Livia yang punya bab pernikahan dan sistem barang/fisiologi', () => {
    for (const character of characters) {
      const isLivia = character.id === 'livia';
      expect(character.relationship.marriedAtChapter !== undefined).toBe(isLivia);
      expect(character.usesBackstoryItems).toBe(isLivia);
      expect(character.hasPhysiology).toBe(isLivia);
    }
  });
});

describe('buildCharacterIdentity untuk karakter lain', () => {
  it('memakai identitas karakter, bukan Livia', () => {
    const text = buildCharacterIdentity(getCharacter('ayame'), {
      affection: 50,
      language: 'id',
    });
    expect(text).toContain('Kamu adalah Ayame');
    expect(text).toContain('senpai');
    expect(text).not.toContain('Livia');
    expect(text).toContain('Ayame tentang User');
  });

  it('karakter non-Livia tidak memakai bab pernikahan', () => {
    const text = buildCharacterIdentity(getCharacter('laura'), {
      affection: 100,
      highestChapter: 15,
      language: 'id',
    });
    expect(text).not.toContain('MENIKAH');
    expect(text).toContain('Kamu dan User adalah ibu dan anak kos');
  });

  it('Laura selalu ibu, bukan pasangan romantis', () => {
    const text = buildCharacterIdentity(getCharacter('laura'), {
      affection: 100,
      language: 'id',
    });
    expect(text).toContain('IBU, bukan pasangan romantis');
  });

  it('karakter tanpa barang bawaan tidak membangun konteks koper', () => {
    const text = buildCharacterIdentity(getCharacter('naomi'), {
      affection: 50,
      itemsBrought: ['recipe_book'],
      language: 'id',
    });
    expect(text).not.toContain('BARANG YANG KAMU BAWA');
  });

  it('aturan bahasa Inggris memakai frasa kepribadian karakter', () => {
    const text = buildCharacterIdentity(getCharacter('naomi'), {
      affection: 50,
      language: 'en',
    });
    expect(text).toContain('gentle, soft-spoken personality');
    expect(text).not.toContain('tsundere personality');
  });

  it('level afeksi bersifat bersama (shared)', () => {
    const text = buildCharacterIdentity(getCharacter('enji'), {
      affection: 5,
      language: 'id',
    });
    expect(text).toContain('Orang Asing');
  });
});

describe('describePhysiologicalState dengan nama karakter', () => {
  it('default tetap "Livia"', () => {
    const text = describePhysiologicalState({ stats });
    expect(text).toContain('Kondisi Fisik & Biologis Livia');
    expect(text).toContain('nada bicara Livia');
  });

  it('nama bisa diganti', () => {
    const text = describePhysiologicalState({ stats, name: 'Naomi' });
    expect(text).toContain('Kondisi Fisik & Biologis Naomi');
    expect(text).toContain('nada bicara Naomi');
    expect(text).not.toContain('Livia');
  });
});

describe('resolveSpriteExpression', () => {
  const naomi = getCharacter('naomi');
  const ayame = getCharacter('ayame');
  const enji = getCharacter('enji');

  it('ekspresi yang tersedia dipakai langsung', () => {
    expect(resolveSpriteExpression(naomi, 'happy')).toBe('happy');
    expect(resolveSpriteExpression(ayame, 'normal')).toBe('normal');
  });

  it('ekspresi yang tidak ada dipetakan via fallback', () => {
    expect(resolveSpriteExpression(naomi, 'clingy')).toBe('touched');
    expect(resolveSpriteExpression(enji, 'happy')).toBe('pleased');
    expect(resolveSpriteExpression(ayame, 'clingy')).toBe('rikuto');
  });

  it('nilai asing jatuh ke defaultExpression', () => {
    expect(resolveSpriteExpression(naomi, 'ngakak')).toBe('normal');
    expect(resolveSpriteExpression(ayame, 'ngakak')).toBe('normal');
  });

  it('fallback yang tidak valid jatuh ke ekspresi pertama yang tersedia', () => {
    const broken: Character = {
      ...naomi,
      sprite: {
        ...naomi.sprite,
        fallback: { clingy: 'tidak-ada-pose-begini' },
        defaultExpression: 'juga-tidak-ada',
      },
    };
    expect(resolveSpriteExpression(broken, 'clingy')).toBe(naomi.sprite.expressions[0]);
  });
});
