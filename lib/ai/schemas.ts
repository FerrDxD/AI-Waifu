import type { LlmResponseSchema } from './types';
import { z } from 'zod';
import { TOOL_NAME_SET, type ToolName } from '@/lib/tools/registry';

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

/**
 * Memori terstruktur (M3.2).
 *
 * Dulu satu-satunya jalur tulis memori adalah field teks `memoryUpdate`:
 * model menulis satu kalimat bebas, server menempelkannya ke blob 20 baris.
 * Itu tidak bisa diberi tipe, tidak bisa di-dedupe dengan baik, dan tidak
 * bisa di-ranking saat retrieval.
 *
 * Sekarang model mengirim array `memories` yang terstruktur. Tipe `diary`
 * sengaja TIDAK boleh dibuat model — itu hasil konsolidasi server (M3.4).
 */
export const EXTRACTABLE_MEMORY_TYPES = ['core', 'episodic', 'semantic'] as const;
export type ExtractedMemoryType = (typeof EXTRACTABLE_MEMORY_TYPES)[number];

export interface ExtractedMemory {
  type: ExtractedMemoryType;
  content: string;
  confidence: number;
}

const EXTRACTABLE_MEMORY_SET: ReadonlySet<string> = new Set(EXTRACTABLE_MEMORY_TYPES);

/** Batas panjang satu fakta — cukup untuk satu kalimat, tidak untuk esai. */
export const MAX_MEMORY_CONTENT_LENGTH = 200;

/** Maksimal fakta baru yang boleh ditulis dari satu balasan. */
export const MAX_MEMORIES_PER_REPLY = 3;

export function normalizeExtractedMemoryType(value: unknown): ExtractedMemoryType {
  return typeof value === 'string' && EXTRACTABLE_MEMORY_SET.has(value)
    ? (value as ExtractedMemoryType)
    : 'semantic';
}

export function clampMemoryConfidence(value: unknown, fallback = 60): number {
  const numeric =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

/** Bersihkan satu fakta: trim, buang bullet, rapikan spasi, potong panjang. */
export function cleanMemoryContent(value: unknown, maxLength = MAX_MEMORY_CONTENT_LENGTH): string {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .replace(/^[-*•]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength).trim() : cleaned;
}

/**
 * Koersi array `memories` dari model.
 *
 * Sama seperti field non-kritis lain: array rusak TIDAK boleh membuang balasan
 * yang teksnya sudah bagus. Item yang tidak bisa dipahami dibuang satu per
 * satu, bukan menggagalkan semuanya.
 */
export function coerceMemories(value: unknown): ExtractedMemory[] {
  if (!Array.isArray(value)) return [];

  const result: ExtractedMemory[] = [];
  const seen = new Set<string>();

  for (const raw of value) {
    if (result.length >= MAX_MEMORIES_PER_REPLY) break;
    if (!raw || typeof raw !== 'object') continue;

    const item = raw as Record<string, unknown>;
    const content = cleanMemoryContent(item.content);
    if (content.length < 3) continue;

    const key = content.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      type: normalizeExtractedMemoryType(item.type),
      content,
      confidence: clampMemoryConfidence(item.confidence),
    });
  }

  return result;
}

/** `memoryUpdate` non-kritis: bukan string → string kosong (fallback lama). */
const memoryUpdateField = coerceField((value) =>
  typeof value === 'string' ? value.trim() : ''
);

/** `memories` non-kritis: bentuk aneh → array kosong. */
const memoriesField = coerceField((value) => coerceMemories(value));

/**
 * Panggilan tool Livia (M8.3).
 *
 * Livia mengembalikan field opsional `tools: [{name, args}]` di JSON
 * balasannya. Server memvalidasi + mengeksekusi (lihat `lib/tools/`), lalu
 * menambahkan baris konfirmasi faktual ke reply.
 */
export interface LiviaToolCall {
  name: ToolName;
  args: Record<string, unknown>;
}

/** Maksimal tool per balasan — pembatas biaya/risiko. */
export const MAX_TOOLS_PER_REPLY = 5;

/**
 * Koersi array `tools` dari model.
 *
 * Sama seperti `memories`: array rusak tidak boleh menggagalkan balasan yang
 * teksnya sudah bagus. Item yang tidak dikenal / bentuknya salah dibuang satu
 * per satu. Nama tool divalidasi terhadap registry; `args` harus plain object
 * (validasi detail per-tool dilakukan executor).
 */
export function coerceTools(value: unknown): LiviaToolCall[] {
  if (!Array.isArray(value)) return [];

  const result: LiviaToolCall[] = [];

  for (const raw of value) {
    if (result.length >= MAX_TOOLS_PER_REPLY) break;
    if (!raw || typeof raw !== 'object') continue;

    const item = raw as Record<string, unknown>;
    if (typeof item.name !== 'string' || !TOOL_NAME_SET.has(item.name)) continue;
    if (!item.args || typeof item.args !== 'object' || Array.isArray(item.args)) continue;

    result.push({
      name: item.name as ToolName,
      args: item.args as Record<string, unknown>,
    });
  }

  return result;
}

/** `tools` non-kritis: bentuk aneh → array kosong. */
const toolsField = coerceField((value) => coerceTools(value));

/** Validator balasan Livia (chat & date chat). */
export const liviaReplyValidator = z
  .object({
    reply: z.string().trim().min(1, 'reply kosong'),
    affectionDelta: affectionDeltaField,
    expression: expressionField,
    memories: memoriesField,
    memoryUpdate: memoryUpdateField,
    tools: toolsField,
  })
  .transform((value) => ({
    reply: value.reply,
    affectionDelta: value.affectionDelta,
    expression: value.expression,
    memories: value.memories,
    memoryUpdate: value.memoryUpdate,
    tools: value.tools,
  }));

export type LiviaReply = z.infer<typeof liviaReplyValidator>;

/** `responseSchema` untuk balasan Livia. */
export const liviaReplyResponseSchema: LlmResponseSchema = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Teks balasan Livia, 1-4 kalimat, tanpa nama pembicara dan tanpa tanda kutip.',
    },
    affectionDelta: {
      type: 'integer',
      description: `Perubahan afeksi sebagai bilangan bulat antara -${MAX_AFFECTION_DELTA} dan ${MAX_AFFECTION_DELTA}.`,
    },
    expression: {
      type: 'string',
      // Catatan: SDK ini tidak mendukung `enum` di responseSchema
      // (StringSchema.enum bertipe `never`), jadi daftar nilai yang sah
      // ditulis di description dan ditegakkan oleh normalizeExpression().
      description: `Ekspresi wajah Livia. Pilih salah satu: ${LIVIA_EXPRESSIONS.join(', ')}.`,
    },
    memoryUpdate: {
      type: 'string',
      description:
        'Warisan lama. Kosongkan saja; fakta baru ditulis di field memories.',
    },
    memories: {
      type: 'array',
      description:
        'Fakta tahan lama BARU tentang user. Maksimal 2. Array kosong kalau tidak ada fakta baru.',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description:
              'core (identitas inti: nama panggilan, alergi) | episodic (kejadian/rencana) | semantic (fakta stabil: hobi, kerja, makanan).',
          },
          content: {
            type: 'string',
            description: 'Satu kalimat fakta, maksimal 200 karakter, tanpa bullet.',
          },
          confidence: {
            type: 'integer',
            description: 'Keyakinan bahwa fakta ini benar, 0–100.',
          },
        },
        required: ['type', 'content', 'confidence'],
      },
    },
    tools: {
      type: 'array',
      description:
        'TINDAKAN yang user minta (opsional, M8.3): buat pengingat / tambah daftar belanja. Array kosong [ ] atau dihilangkan kalau tidak ada tindakan.',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description:
              'create_reminder (args: text, time) | add_shopping_item (args: item) | list_shopping_items (args: {}).',
          },
          args: {
            type: 'object',
            description:
              'Argumen tool. create_reminder: {text: "isi", time: "jam 7"}; add_shopping_item: {item: "telur"}; list_shopping_items: {}.',
          },
        },
        required: ['name', 'args'],
      },
    },
  },
  required: ['reply', 'affectionDelta', 'expression', 'memories'],
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
export const dateDialogueResponseSchema: LlmResponseSchema = {
  type: 'object',
  properties: {
    timeOfDay: {
      type: 'string',
      description: 'Waktu dalam adegan. Pilih salah satu: pagi, sore, malam.',
    },
    scene: {
      type: 'array',
      description: '5-7 baris dialog berurutan.',
      items: {
        type: 'object',
        properties: {
          speaker: {
            type: 'string',
            description: 'Nama pembicara: "Livia", nama user, atau "Narator".',
          },
          text: { type: 'string', description: 'Isi dialog atau narasi.' },
          expression: {
            type: 'string',
            description: `Ekspresi wajah Livia. Pilih salah satu: ${LIVIA_EXPRESSIONS.join(', ')}.`,
          },
        },
        required: ['speaker', 'text', 'expression'],
      },
    },
  },
  required: ['timeOfDay', 'scene'],
};

/**
 * Skema ringkasan percakapan (M2.5).
 *
 * Ringkasan tidak perlu tahu ekspresi/afeksi — hanya teks catatan Livia.
 * Output dibatasi pendek di provider karena isi ringkasan ini masuk ke
 * prompt SETIAP turn chat.
 */
export const chatSummaryValidator = z.object({
  summary: z.string().trim().min(1),
});

export type ChatSummary = z.infer<typeof chatSummaryValidator>;

export const chatSummaryResponseSchema: LlmResponseSchema = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        'Ringkasan 3-5 kalimat Bahasa Indonesia, dari sudut pandang Livia. Fokus pada fakta user, janji/jadwal, dan konflik yang belum selesai.',
    },
  },
  required: ['summary'],
};

/**
 * Hasil konsolidasi memori (M3.4).
 *
 * Beberapa memori lama dipadatkan menjadi SATU "inti memori" bergaya diary.
 * Output dibatasi pendek karena akan ikut masuk konteks chat.
 */
export const memoryDigestValidator = z.object({
  memory: z.string().trim().min(1),
});

export type MemoryDigest = z.infer<typeof memoryDigestValidator>;

export const memoryDigestResponseSchema: LlmResponseSchema = {
  type: 'object',
  properties: {
    memory: {
      type: 'string',
      description:
        'Satu paragraf 2-4 kalimat, sudut pandang Livia, merangkum memori-memori tersebut menjadi satu ingatan yang utuh.',
    },
  },
  required: ['memory'],
};
