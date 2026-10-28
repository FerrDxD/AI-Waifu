import type { ResponseSchema } from '@google/generative-ai';
import type { z } from 'zod';

/**
 * Kontrak provider LLM (M2.2).
 *
 * Tujuan abstraksi ini bukan "biar keren", tapi supaya kode domain
 * (`lib/ai/persona.ts`, route chat/date) tidak tahu-menahu soal SDK Google.
 * Kalau nanti mau pindah ke OpenAI/Anthropic/Ollama, yang ditambah cuma satu
 * file adapter di `lib/ai/providers/`, bukan menyentuh 3 route + prompt builder.
 *
 * Aturan penting: provider TIDAK boleh `throw` untuk kasus "model menolak
 * menjawab karena safety filter". Itu bukan error — itu hasil yang sah
 * (`blocked: true`). Domain yang memutuskan mau bilang apa ke user.
 */

export type AIProviderName = 'gemini';

/** Satu giliran percakapan dalam bentuk yang dipahami provider. */
export interface LlmTurn {
  role: 'user' | 'model';
  text: string;
}

export interface GenerateOptions<T> {
  /** Nama operasi untuk log, mis. `chat`, `date.dialogue`. */
  operation: string;
  /** System instruction. Provider memperlakukannya sebagai instruksi sistem. */
  systemInstruction: string;
  /** Riwayat percakapan + pesan terbaru. Harus diawali & diakhiri `user`. */
  turns: LlmTurn[];
  /** Skema JSON yang dipaksa ke model (native structured output). */
  responseSchema: ResponseSchema;
  /**
   * Validator untuk hasil parsing. Model bisa saja melanggar skema walau
   * `responseSchema` sudah dikirim, jadi output tetap divalidasi di sini.
   */
  outputSchema: z.ZodType<T>;
  temperature?: number;
  maxOutputTokens?: number;
  /** API key milik user. `undefined` = pakai key server. */
  apiKey?: string;
}

export interface GenerateResult<T> {
  /** `null` kalau model menolak (safety filter). */
  data: T | null;
  /** `true` kalau model menolak menjawab karena safety/recitation. */
  blocked: boolean;
  /** Alasan blokir dari provider, untuk log saja — jangan dikirim ke user. */
  blockReason?: string;
  /** Model yang benar-benar menjawab (bisa beda dari yang diminta kalau fallback). */
  model: string;
  /** `true` kalau jawaban datang dari model fallback. */
  usedFallback: boolean;
  latencyMs: number;
  /**
   * M7.1: pemakaian token dari `usageMetadata` provider. Diisi kalau model
   * merespons — termasuk hasil `blocked` (prompt tetap mengonsumi input token).
   * Dipakai pencatatan biaya di `lib/ai/usage.ts`; domain tidak perlu tahu
   * lebih dari ini.
   */
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

/**
 * Hasil generasi yang mengalir (M2.1).
 *
 * `deltas` memuntahkan potongan teks balasan SEBELUM respons selesai — ini
 * yang menurunkan latensi yang dirasakan user. `final` diselesaikan belakangan
 * setelah seluruh output tervalidasi; angka afeksi, ekspresi, dan memori HANYA
 * boleh diambil dari situ, bukan dari aliran mentah.
 */
export interface StreamingGenerate<T> {
  deltas: AsyncIterableIterator<string>;
  /** Resolve setelah aliran selesai. Reject kalau struktur output tidak valid. */
  final: Promise<GenerateResult<T>>;
}

export interface LLMProvider {
  readonly name: AIProviderName;
  generate<T>(options: GenerateOptions<T>): Promise<GenerateResult<T>>;
  /**
   * Variante streaming. Sengaja TIDAK async: `deltas` harus bisa didapat
   * seketika supaya route bisa membuka SSE sebelum ada byte angka dari model.
   * Getter/gagal dini (konteks kosong, breaker terbuka) dilempar sinkron di
   * titik pemanggilan — route sudah berada di dalam handler async.
   */
  stream<T>(options: GenerateOptions<T>): StreamingGenerate<T>;
}
