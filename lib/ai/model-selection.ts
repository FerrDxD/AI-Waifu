import { getAIConfig, type AIEngineConfig } from './config';

/**
 * Pemilihan model AI milik user (M8.1 Phase 2).
 *
 * Prinsip yang mengikat: **server yang menentukan daftar model**, bukan client.
 * Dropdown di settings hanya menampilkan `AI_ALLOWED_MODELS`; nilai yang masuk
 * dari request tetap divalidasi ulang di sini. Tanpa aturan ini, user bisa
 * mengirim nama model sembarang — mulai dari model termahal vendor sampai nama
 * yang tidak ada (400 berulang yang membakar kuota).
 *
 * Modul ini SENGAJA murni (tanpa DB, tanpa jaringan) supaya aturannya bisa
 * diuji mahal-murah hanya dengan env.
 */

export interface ModelOption {
  /** Nilai yang dikirim ke provider, mis. `deepseek-v4.1-flash-1017`. */
  id: string;
  /** Label untuk dropdown — id yang dirapikan, bukan nama karangan. */
  label: string;
}

/**
 * Parse `AI_ALLOWED_MODELS` (dipisah koma).
 *
 * Dedupe & buang kosong: env yang ditulis "a, a,, b" adalah kesalahan umum
 * dan tidak boleh menghasilkan dua entri identik di dropdown.
 */
export function parseAllowedModels(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of raw.split(',')) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }

  return out;
}

/**
 * Daftar model yang boleh dipilih user.
 *
 * Kalau `AI_ALLOWED_MODELS` kosong, yang ditawarkan hanya model yang memang
 * dipakai server (chat + dialogue, fallback kalau beda). Ini fail-closed:
 * tanpa allowlist eksplisit, user tidak mendapat "katalog" yang lebih luas
 * dari yang sudah dibayar owner.
 */
export function getModelCatalog(cfg: AIEngineConfig = getAIConfig()): ModelOption[] {
  const allowed = parseAllowedModels(process.env.AI_ALLOWED_MODELS);

  if (allowed.length > 0) {
    return allowed.map((id) => ({ id, label: id }));
  }

  const defaults = [cfg.chatModel, cfg.dialogueModel, cfg.fallbackModel ?? '']
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  return [...new Set(defaults)].map((id) => ({ id, label: id }));
}

/** Apakah model ini boleh dipakai? Perbandingan persis (case-sensitive). */
export function isModelAllowed(model: string, cfg: AIEngineConfig = getAIConfig()): boolean {
  const candidate = model.trim();
  if (!candidate) return false;
  return getModelCatalog(cfg).some((option) => option.id === candidate);
}

/**
 * Ubah pilihan tersimpan menjadi model yang benar-benar dipakai.
 *
 * `undefined` = pakai model server. Ini yang membuat pilihan usang aman:
 * model yang sudah dihapus dari allowlist tidak menyebabkan error, hanya
 * diam-diam kembali ke default (dan dicatat pemanggilnya kalau perlu).
 */
export function sanitizePreferredModel(
  stored: string | null | undefined,
  cfg: AIEngineConfig = getAIConfig()
): string | undefined {
  if (!stored) return undefined;
  const candidate = stored.trim();
  if (!candidate) return undefined;
  return isModelAllowed(candidate, cfg) ? candidate : undefined;
}
