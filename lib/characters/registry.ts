/**
 * Registry karakter (M8.2 Phase A).
 *
 * Sebelum M8.2, "siapa Livia" tertanam hardcode di `lib/ai/persona.ts`
 * (`buildLiviaIdentity`). Karakter lain (Ayame, Enji, Laura, Naomi) yang
 * asetnya sudah ada di `public/` tidak bisa dipakai engine tanpa menulis
 * kode baru. Sekarang persona adalah **data**: tiap karakter satu file
 * JSON di `content/characters/`, file ini memvalidasinya sekali saat
 * modul dimuat, dan `buildCharacterIdentity` menyusun prompt dari data.
 *
 * Livia adalah karakter default dan entry pertama; teks prompt-nya
 * disalin persis dari implementasi lama supaya nol perubahan perilaku
 * (lihat `tests/characters.test.ts` — regression test byte-identical).
 *
 * Fase berikutnya (belum dilakukan di Phase A): `characterId` di
 * `userProfiles`, pemilih karakter di onboarding/settings, dan progres
 * (afeksi/memori/chapter) yang dipisah per karakter.
 */
import { z } from 'zod';
import liviaData from '@/content/characters/livia.json';
import ayameData from '@/content/characters/ayame.json';
import enjiData from '@/content/characters/enji.json';
import lauraData from '@/content/characters/laura.json';
import naomiData from '@/content/characters/naomi.json';

export const CharacterIdSchema = z.enum(['livia', 'ayame', 'enji', 'laura', 'naomi']);
export type CharacterId = z.infer<typeof CharacterIdSchema>;

const CharacterSpriteSchema = z.object({
  /** Path folder relatif terhadap `/public/` (boleh bersarang, mis. `laura/story-bab`). */
  folder: z.string().min(1),
  /**
   * `livia-outfits`: struktur folder outit Livia yang kompleks (home-screen,
   * wardrobe, shop, story). `flat`: semua ekspresi langsung di root folder.
   */
  layout: z.enum(['livia-outfits', 'flat']),
  /** Ekspresi yang benar-benar tersedia sebagai file `.webp` di folder. */
  expressions: z.array(z.string().min(1)).min(1),
  /** Ekspresi tidak tersedia → ekspresi pengganti (mis. `clingy` → `touched` untuk Naomi). */
  fallback: z.record(z.string(), z.string()).default({}),
  /** Ekspresi terakhir kalau nilai masukan sama sekali tidak dikenal. */
  defaultExpression: z.string().min(1).default('normal'),
});

const AffectionStageSchema = z.object({
  range: z.string().min(1),
  description: z.string().min(1),
});

const CharacterSpeechSchema = z.object({
  /** Frasa kepribadian untuk aturan bahasa Inggris, mis. "her tsundere personality". */
  enPersonalityPhrase: z.string().min(1),
  /** Aturan bicara tambahan (sudah diprefix `- ` oleh builder). */
  rules: z.array(z.string().min(1)).min(1),
});

const CharacterRelationshipSchema = z.object({
  /** Premis hubungan default (digunakan saat karakter tidak punya bab pernikahan). */
  default: z.string().min(1),
  /** Bab cerita yang membuka status menikah (hanya karakter romantis, saat ini hanya Livia). */
  marriedAtChapter: z.number().int().positive().optional(),
  /** Teks premis hubungan setelah menikah. */
  married: z.string().min(1).optional(),
});

export const CharacterSchema = z
  .object({
    id: CharacterIdSchema,
    name: z.string().min(1),
    shortName: z.string().min(1),
    tagline: z.string().min(1),
    sprite: CharacterSpriteSchema,
    /** Kalimat pembuka identitas, mis. "Kamu adalah Livia Einhart, gadis 19 tahun." */
    identityLine: z.string().min(1),
    /** Sifat dasar, ditempel setelah kalimat identitas. */
    personalityLine: z.string().min(1),
    relationship: CharacterRelationshipSchema,
    /** Deskripsi perilaku per level afeksi (level 0-1, 2-3, 4-5). */
    affectionStages: z.array(AffectionStageSchema).length(3),
    memoryHeader: z.string().min(1),
    memoryEmpty: z.string().min(1),
    /** Konteks barang bawaan (sistem koper Livia). Karakter lain tidak memilikinya. */
    usesBackstoryItems: z.boolean().default(false),
    /** Memiliki sistem kondisi fisik (hunger/energy/hydration/siklus). */
    hasPhysiology: z.boolean().default(false),
    speech: CharacterSpeechSchema,
  })
  .superRefine((character, ctx) => {
    if (character.relationship.marriedAtChapter !== undefined && !character.relationship.married) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'marriedAtChapter diisi tapi teks married tidak ada',
        path: ['relationship', 'married'],
      });
    }
    const stageRanges = character.affectionStages.map(stage => stage.range);
    if (new Set(stageRanges).size !== stageRanges.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'range affectionStages tidak boleh duplikat',
        path: ['affectionStages'],
      });
    }
  });

export type Character = z.infer<typeof CharacterSchema>;
export type CharacterSprite = z.infer<typeof CharacterSpriteSchema>;

const characterFiles: unknown[] = [liviaData, ayameData, enjiData, lauraData, naomiData];

function buildRegistry(): Character[] {
  const parsed = characterFiles.map(file => CharacterSchema.parse(file));
  const ids = parsed.map(character => character.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Character registry memiliki id duplikat: ${ids.join(', ')}`);
  }
  return parsed;
}

export const characters: Character[] = buildRegistry();

export const DEFAULT_CHARACTER_ID: CharacterId = 'livia';

export function getCharacter(id?: string | null): Character {
  const found = id ? characters.find(character => character.id === id) : undefined;
  return found ?? getCharacter(DEFAULT_CHARACTER_ID);
}

/**
 * Resolusi ekspresi sprite: nilai masukan → ekspresi yang benar-benar
 * tersedia di folder karakter. Ekspresi tidak dikenal memakai peta
 * `fallback`, lalu `defaultExpression` sebagai jaring terakhir.
 */
export function resolveSpriteExpression(character: Character, expression: string): string {
  const { sprite } = character;
  if (sprite.expressions.includes(expression)) return expression;

  const mapped = sprite.fallback[expression];
  if (mapped !== undefined && sprite.expressions.includes(mapped)) return mapped;

  const fallbackTarget = mapped ?? sprite.defaultExpression;
  return sprite.expressions.includes(fallbackTarget) ? fallbackTarget : sprite.expressions[0]!;
}
