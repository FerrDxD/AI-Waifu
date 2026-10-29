/**
 * Harga LLM per model (M7.1).
 *
 * Fungsinya satu: menerjemahkan "token masuk/keluar" menjadi estimasi biaya
 * dalam **micro-USD** (1e-6 USD). Integer, bukan float, supaya akumulasi
 * di database tidak menumpuk error pembulatan (pola `costMicros` yang sama
 * dengan hitungan uang di `userProfiles.money`).
 *
 * Sumber angka: halaman pricing Google AI Studio (periksa ulang saat ganti
 * model — tabel ini sengaja eksplisit, bukan dihitung). Model yang BELUM
 * ada di tabel dihargai 0, bukan ditebak: dashboard menampilkan nama model
 * itu tanpa biaya, jadi owner langsung tahu harus menambahkan harganya di
 * sini. Menebak harga salah lebih berbahaya daripada 0.
 *
 * Modul ini MURNI & isomorfik: tanpa env, tanpa db, tanpa import SDK —
 * bisa diuji unit tanpa mock apa pun.
 */

export interface ModelPricing {
  /** USD per 1 juta token input. */
  inputPerM: number;
  /** USD per 1 juta token output. */
  outputPerM: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Default app (AI_MODEL_CHAT / AI_MODEL_DIALOGUE).
  'gemini-3.6-flash': { inputPerM: 0.3, outputPerM: 2.5 },
  'gemini-2.5-flash': { inputPerM: 0.3, outputPerM: 2.5 },
  'gemini-2.5-flash-lite': { inputPerM: 0.1, outputPerM: 0.4 },
  'gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 10.0 },
  'gemini-2.0-flash': { inputPerM: 0.1, outputPerM: 0.4 },
  'gemini-1.5-flash': { inputPerM: 0.075, outputPerM: 0.3 },
  'gemini-1.5-pro': { inputPerM: 1.25, outputPerM: 5.0 },

  // OpenAI (M8.1) — harga publik per 1M token.
  'gpt-4o': { inputPerM: 2.5, outputPerM: 10.0 },
  'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6 },
  'gpt-4.1': { inputPerM: 2.0, outputPerM: 8.0 },
  'gpt-4.1-mini': { inputPerM: 0.4, outputPerM: 1.6 },

  // Anthropic (M8.1) — harga publik per 1M token.
  'claude-3-5-haiku-latest': { inputPerM: 0.8, outputPerM: 4.0 },
  'claude-3-5-sonnet-latest': { inputPerM: 3.0, outputPerM: 15.0 },
  'claude-sonnet-4': { inputPerM: 3.0, outputPerM: 15.0 },
  'claude-opus-4': { inputPerM: 15.0, outputPerM: 75.0 },

  // Provider pihak ketiga (openai-compat): modelnya bermacam-macam dan
  // harganya tergantung paket yang dibeli. Sengaja TIDAK ditebak — isi di sini
  // kalau provider menagih per token, atau biarkan 0 kalau langganan flat.
};

/** Harga untuk satu nama model; model tak dikenal → 0 (lihat komentar atas). */
export function pricingFor(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? { inputPerM: 0, outputPerM: 0 };
}

/**
 * Estimasi biaya SATU request dalam micro-USD.
 *
 * Pembulatan ke micro terdekat: satu request chat rata-rata ~2.000 token
 * input + 300 output ≈ $0.001 — akurasi 6 digit desimal sudah jauh di bawah
 * resolusi yang bermakna, dan tetap integer untuk DB.
 *
 * Token negatif tidak mungkin dari SDK, tapi defensive: diklamp 0.
 */
export function costMicrosFor(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = pricingFor(model);
  const costUsd =
    (Math.max(0, inputTokens) * pricing.inputPerM +
      Math.max(0, outputTokens) * pricing.outputPerM) /
    1_000_000;
  return Math.round(costUsd * 1_000_000);
}

/** Konversi untuk tampilan: micro-USD → USD (float boleh di lapisan presentasi). */
export function costUsd(costMicros: number): number {
  return costMicros / 1_000_000;
}
