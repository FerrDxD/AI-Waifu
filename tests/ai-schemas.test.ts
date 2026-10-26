import { describe, it, expect } from 'vitest';
import {
  liviaReplyValidator,
  dateDialogueValidator,
  normalizeExpression,
  LIVIA_EXPRESSIONS,
  MAX_AFFECTION_DELTA,
  liviaReplyResponseSchema,
  dateDialogueResponseSchema,
} from '@/lib/ai/schemas';

describe('normalizeExpression', () => {
  it('meloloskan ekspresi yang dikenal', () => {
    expect(normalizeExpression('blushing')).toBe('blushing');
    expect(normalizeExpression('angry')).toBe('angry');
  });

  it('ekspresi karangan model → normal', () => {
    expect(normalizeExpression('ecstatic')).toBe('normal');
    expect(normalizeExpression('')).toBe('normal');
  });

  it('bukan string → normal', () => {
    expect(normalizeExpression(null)).toBe('normal');
    expect(normalizeExpression(42)).toBe('normal');
    expect(normalizeExpression({})).toBe('normal');
  });

  it('daftar ekspresi tidak kosong dan unik', () => {
    expect(LIVIA_EXPRESSIONS.length).toBeGreaterThan(0);
    expect(new Set(LIVIA_EXPRESSIONS).size).toBe(LIVIA_EXPRESSIONS.length);
  });
});

describe('liviaReplyValidator', () => {
  const valid = {
    reply: 'Hmph, terserah kamu.',
    affectionDelta: 2,
    expression: 'angry',
    memoryUpdate: 'Suka kopi',
  };

  it('menerima bentuk yang benar', () => {
    const parsed = liviaReplyValidator.parse(valid);
    expect(parsed.reply).toBe(valid.reply);
    expect(parsed.affectionDelta).toBe(2);
    expect(parsed.expression).toBe('angry');
    expect(parsed.memoryUpdate).toBe('Suka kopi');
  });

  it('menolak reply kosong', () => {
    expect(liviaReplyValidator.safeParse({ ...valid, reply: '' }).success).toBe(false);
    expect(liviaReplyValidator.safeParse({ ...valid, reply: '   ' }).success).toBe(false);
    expect(liviaReplyValidator.safeParse({ ...valid, reply: undefined }).success).toBe(false);
  });

  it('reply di-trim', () => {
    expect(liviaReplyValidator.parse({ ...valid, reply: '  hai  ' }).reply).toBe('hai');
  });

  it('field opsional punya default aman', () => {
    const parsed = liviaReplyValidator.parse({ reply: 'hai' });
    expect(parsed.affectionDelta).toBe(0);
    expect(parsed.expression).toBe('normal');
    expect(parsed.memoryUpdate).toBe('');
  });

  it(`affectionDelta di-clamp ke ±${MAX_AFFECTION_DELTA}`, () => {
    expect(liviaReplyValidator.parse({ ...valid, affectionDelta: 50 }).affectionDelta).toBe(
      MAX_AFFECTION_DELTA
    );
    expect(liviaReplyValidator.parse({ ...valid, affectionDelta: -50 }).affectionDelta).toBe(
      -MAX_AFFECTION_DELTA
    );
  });

  it('affectionDelta dibulatkan ke integer', () => {
    expect(liviaReplyValidator.parse({ ...valid, affectionDelta: 2.6 }).affectionDelta).toBe(3);
  });

  it('affectionDelta berupa string angka dikoersi, bukan dibuang', () => {
    expect(liviaReplyValidator.parse({ ...valid, affectionDelta: '5' }).affectionDelta).toBe(5);
    expect(liviaReplyValidator.parse({ ...valid, affectionDelta: '-2' }).affectionDelta).toBe(-2);
  });

  it('affectionDelta tipe sampah → 0, bukan crash', () => {
    expect(liviaReplyValidator.parse({ ...valid, affectionDelta: null }).affectionDelta).toBe(0);
    expect(liviaReplyValidator.parse({ ...valid, affectionDelta: {} }).affectionDelta).toBe(0);
    expect(liviaReplyValidator.parse({ ...valid, affectionDelta: 'banyak' }).affectionDelta).toBe(0);
  });

  it('affectionDelta Infinity/NaN tidak lolos', () => {
    // JSON tidak bisa membawa Infinity, tapi provider lain bisa mengirimnya.
    const parsed = liviaReplyValidator.parse({ ...valid, affectionDelta: Infinity });
    expect(Number.isFinite(parsed.affectionDelta)).toBe(true);
    expect(parsed.affectionDelta).toBe(0);
  });

  it('ekspresi tak dikenal dinormalisasi, bukan menggagalkan respons', () => {
    expect(liviaReplyValidator.parse({ ...valid, expression: 'wink' }).expression).toBe('normal');
  });

  it('memoryUpdate di-trim', () => {
    expect(liviaReplyValidator.parse({ ...valid, memoryUpdate: '  kopi  ' }).memoryUpdate).toBe('kopi');
  });
});

describe('dateDialogueValidator', () => {
  const valid = {
    timeOfDay: 'malam',
    scene: [
      { speaker: 'Livia', text: 'Kenapa lihat terus?', expression: 'blushing' },
      { speaker: 'Narator', text: 'Langit gelap.', expression: 'normal' },
    ],
  };

  it('menerima adegan yang benar', () => {
    const parsed = dateDialogueValidator.parse(valid);
    expect(parsed.scene).toHaveLength(2);
    expect(parsed.scene[0].expression).toBe('blushing');
  });

  it('menolak adegan kosong', () => {
    expect(dateDialogueValidator.safeParse({ ...valid, scene: [] }).success).toBe(false);
  });

  it('menolak baris tanpa teks', () => {
    expect(
      dateDialogueValidator.safeParse({ ...valid, scene: [{ speaker: 'Livia', text: '' }] }).success
    ).toBe(false);
  });

  it('menolak adegan lebih dari 20 baris', () => {
    const scene = Array.from({ length: 21 }, (_, i) => ({ speaker: 'Livia', text: `baris ${i}` }));
    expect(dateDialogueValidator.safeParse({ ...valid, scene }).success).toBe(false);
  });

  it('ekspresi baris dinormalisasi', () => {
    const parsed = dateDialogueValidator.parse({
      ...valid,
      scene: [{ speaker: 'Livia', text: 'halo', expression: 'smug' }],
    });
    expect(parsed.scene[0].expression).toBe('normal');
  });

  it('timeOfDay opsional (divalidasi pemanggil)', () => {
    expect(dateDialogueValidator.safeParse({ scene: valid.scene }).success).toBe(true);
  });
});

describe('responseSchema', () => {
  it('liviaReply menyatakan semua field wajib', () => {
    expect(liviaReplyResponseSchema.type).toBe('object');
    const schema = liviaReplyResponseSchema as unknown as {
      required?: string[];
      properties: object;
    };
    expect(schema.required).toEqual(
      expect.arrayContaining(['reply', 'affectionDelta', 'expression', 'memoryUpdate'])
    );
    expect(Object.keys(schema.properties)).toHaveLength(4);
  });

  it('dateDialogue menyatakan scene sebagai array of object', () => {
    const schema = dateDialogueResponseSchema as unknown as {
      required?: string[];
      properties: { scene: { type: string; items: { properties: object } } };
    };
    expect(schema.required).toEqual(expect.arrayContaining(['timeOfDay', 'scene']));
    expect(schema.properties.scene.type).toBe('array');
    expect(Object.keys(schema.properties.scene.items.properties)).toEqual(
      expect.arrayContaining(['speaker', 'text', 'expression'])
    );
  });

  it('deskripsi ekspresi memuat seluruh nilai yang sah', () => {
    const schema = liviaReplyResponseSchema as unknown as {
      properties: { expression: { description: string } };
    };
    for (const expression of LIVIA_EXPRESSIONS) {
      expect(schema.properties.expression.description).toContain(expression);
    }
  });
});
