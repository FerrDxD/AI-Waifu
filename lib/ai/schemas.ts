import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { z } from 'zod';

/**
 * Skema output terstruktur (M2.4).
 *
 * Sebelumnya: prompt menyuruh "kembalikan HANYA JSON", lalu hasilnya dipotong
 * pakai regex `/\{[\s\S]*\}/` dan `JSON.parse`. Kalau model menambahkan
 * pembuka seperti "Tentu! Berikut JSON-nya:", regex masih lolos — tapi kalau
 * model memotong JSON di tengah (MAX_TOKENS), `parseJsonResponse` menambal
 * dengan `'"} '` yang **tidak selalu valid** lalu melempar error mentah.
 *
 * Sekarang: skema dikirim ke model (`responseSchema`) supaya model dipaksa
 * menghasilkan bentuk yang benar, DAN hasil akhirnya tetap divalidasi zod.
 * Model tetap bisa melanggar skema — jadi jangan percaya `responseSchema`
 * saja. Validasi zod inilah yang otoritatif.
 */

/** Ekspresi wajah yang dikenali UI. Harus sinkron dengan `LiviaExpression`. */
export const LIVIA_EXPRESSIONS = [
  'normal',
  'angry',
  'blushing',
  'clingy',
  'happy',
  'confused',
  'flirty',
  'pain',
  'pleased',
  'scared',
  'serious',
  'silly',
] as const;

export type LiviaExpression = (typeof LIVIA_EXPRESSIONS)[number];

const EXPRESSION_SET: ReadonlySet<string> = new Set(LIVIA_EXPRESSIONS);

/**
 * Normalisasi ekspresi dari model. Nilai tak dikenal → `normal`.
 * Model sering mengarang ekspresi yang tidak ada di daftar; itu tidak boleh
 * membuat seluruh respons gagal.
 */
export function normalizeExpression(value: unknown): LiviaExpression {
  return typeof value === 'string' && EXPRESSION_SET.has(value)
    ? (value as LiviaExpression)
    : 'normal';
}

/**
 * Batas `affectionDelta` dari model.
 *
 * Dulu nilai ini dipakai apa adanya: model yang "murah hati" bisa mengirim
 * `affectionDelta: 50` dan afeksi user melompat setengah bar dalam satu pesan.
 * Prompt memang bilang -5..5, tapi prompt bukan pengaman.
 */
export const MAX_AFFECTION_DELTA = 5;

function clampAffectionDelta(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-MAX_AFFECTION_DELTA, Math.min(MAX_AFFECTION_DELTA, Math.round(value)));
}

/**
 * Field non-kritis: boleh hilang, boleh bertipe apa pun, dan TIDAK PERNAH
 * menggagalkan validasi. Nilai aneh dikoersi ke default yang aman.
 *
 * `z.unknown()` saja tidak cukup — di Zod, key yang tidak ada tetap dianggap
 * "required" dan menghasilkan error. `.optional()` dulu, baru di-transform.
 */
function coerceField<T>(coerce: (value: unknown) => T) {
  return z
    .unknown()
    .optional()
    .transform((value) => coerce(value));
}

/**
 * `affectionDelta` sengaja menerima tipe apa pun lalu dikoersi.
 *
 * Alasannya: ini field *non-kritis*. Kalau model mengirim `"5"` (string),
 * `Infinity`, atau `null`, kita tidak boleh membuang seluruh balasan yang
 * sebenarnya sudah bagus hanya karena satu angka. Koersi ke 0/clamp jauh
 * lebih baik daripada user melihat "Respons AI tidak sesuai format".
 *
 * Yang tetap ketat: `reply`. Tanpa teks balasan, respons memang tidak berguna.
 */
const affectionDeltaField = coerceField((value) => {
  if (typeof value === 'number') return clampAffectionDelta(value);
  if (typeof value === 'string') return clampAffectionDelta(Number(value.trim()));
  return 0;
});

/** `expression` juga non-kritis: nilai aneh → `normal`, bukan error. */
const expressionField = coerceField((value) => normalizeExpression(value));

/** `memoryUpdate` non-kritis: bukan string → string kosong. */
const memoryUpdateField = coerceField((value) =>
  typeof value === 'string' ? value.trim() : ''
);

/** Validator balasan Livia (chat & date chat). */
export const liviaReplyValidator = z
  .object({
    reply: z.string().trim().min(1, 'reply kosong'),
    affectionDelta: affectionDeltaField,
    expression: expressionField,
    memoryUpdate: memoryUpdateField,
  })
  .transform((value) => ({
    reply: value.reply,
    affectionDelta: value.affectionDelta,
    expression: value.expression,
    memoryUpdate: value.memoryUpdate,
  }));

export type LiviaReply = z.infer<typeof liviaReplyValidator>;

/** `responseSchema` untuk balasan Livia. */
export const liviaReplyResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: {
      type: SchemaType.STRING,
      description: 'Teks balasan Livia, 1-4 kalimat, tanpa nama pembicara dan tanpa tanda kutip.',
    },
    affectionDelta: {
      type: SchemaType.INTEGER,
      description: `Perubahan afeksi sebagai bilangan bulat antara -${MAX_AFFECTION_DELTA} dan ${MAX_AFFECTION_DELTA}.`,
    },
    expression: {
      type: SchemaType.STRING,
      // Catatan: SDK ini tidak mendukung `enum` di responseSchema
      // (StringSchema.enum bertipe `never`), jadi daftar nilai yang sah
      // ditulis di description dan ditegakkan oleh normalizeExpression().
      description: `Ekspresi wajah Livia. Pilih salah satu: ${LIVIA_EXPRESSIONS.join(', ')}.`,
    },
    memoryUpdate: {
      type: SchemaType.STRING,
      description:
        'Satu kalimat fakta penting baru tentang user (hobi, makanan favorit, nama panggilan). String kosong kalau tidak ada.',
    },
  },
  required: ['reply', 'affectionDelta', 'expression', 'memoryUpdate'],
};

/** Satu baris dialog Visual Novel pada kencan. */
export const dateSceneLineValidator = z.object({
  speaker: z.string().trim().min(1),
  text: z.string().trim().min(1),
  expression: expressionField,
});

/**
 * `timeOfDay` opsional dan dikoersi: nilai aneh → `undefined`, lalu pemanggil
 * memakai jam sistem sebagai default. Bukan alasan membuang seluruh adegan.
 */
const timeOfDayField = coerceField((value) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
);

/** Validator adegan kencan. */
export const dateDialogueValidator = z
  .object({
    timeOfDay: timeOfDayField,
    scene: z.array(dateSceneLineValidator).min(1).max(20),
  })
  .transform((value) => ({
    timeOfDay: value.timeOfDay,
    scene: value.scene.map((line) => ({
      speaker: line.speaker,
      text: line.text,
      expression: line.expression,
    })),
  }));

export type DateDialogue = z.infer<typeof dateDialogueValidator>;

/** `responseSchema` untuk adegan kencan. */
export const dateDialogueResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    timeOfDay: {
      type: SchemaType.STRING,
      description: 'Waktu dalam adegan. Pilih salah satu: pagi, sore, malam.',
    },
    scene: {
      type: SchemaType.ARRAY,
      description: '5-7 baris dialog berurutan.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          speaker: {
            type: SchemaType.STRING,
            description: 'Nama pembicara: "Livia", nama user, atau "Narator".',
          },
          text: { type: SchemaType.STRING, description: 'Isi dialog atau narasi.' },
          expression: {
            type: SchemaType.STRING,
            description: `Ekspresi wajah Livia. Pilih salah satu: ${LIVIA_EXPRESSIONS.join(', ')}.`,
          },
        },
        required: ['speaker', 'text', 'expression'],
      },
    },
  },
  required: ['timeOfDay', 'scene'],
};
