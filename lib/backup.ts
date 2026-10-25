/**
 * Validator untuk file backup (M1).
 *
 * File backup berasal dari client — bisa saja diedit tangan atau dibuat oleh
 * versi aplikasi lain. Semua nilai di sini di-clamp/di-whitelist sebelum
 * menyentuh database.
 *
 * Sengaja dipisah dari route handler supaya bisa diuji sebagai fungsi murni
 * (tanpa DB, tanpa auth).
 */

export const BACKUP_LIMITS = {
  maxMoney: 10_000_000,
  maxItems: 100,
  maxItemIdLength: 64,
  maxChapter: 5,
  maxJobStatsKeys: 20,
  maxJobStatsKeyLength: 40,
  maxJobStatValue: 1_000_000,
} as const;

/** Angka bulat dalam rentang. Nilai tidak valid → `fallback`. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Daftar ID item: hanya string, tanpa duplikat, dipotong ke batas.
 * Mengembalikan `undefined` kalau bentuknya bukan array (artinya: jangan ubah).
 */
export function sanitizeItemList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const cleaned = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= BACKUP_LIMITS.maxItemIdLength);

  return Array.from(new Set(cleaned)).slice(0, BACKUP_LIMITS.maxItems);
}

/** Chapter yang tidak dikenal atau duplikat dibuang; hasil selalu urut naik. */
export function sanitizeChapters(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const chapters = value
    .filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
    .filter((n) => n >= 0 && n <= BACKUP_LIMITS.maxChapter);

  if (chapters.length === 0) return undefined;
  return Array.from(new Set(chapters)).sort((a, b) => a - b);
}

/** Statistik pekerjaan: objek dangkal berisi angka non-negatif. */
export function sanitizeJobStats(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const out: Record<string, number> = {};
  let count = 0;

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (count >= BACKUP_LIMITS.maxJobStatsKeys) break;
    if (key.length === 0 || key.length > BACKUP_LIMITS.maxJobStatsKeyLength) continue;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;

    out[key] = Math.min(BACKUP_LIMITS.maxJobStatValue, Math.max(0, Math.trunc(raw)));
    count += 1;
  }

  return count > 0 ? out : undefined;
}

/** ID outfit: string tidak kosong dan tidak kepanjangan. */
export function sanitizeOutfit(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > BACKUP_LIMITS.maxItemIdLength) return undefined;
  return trimmed;
}

/**
 * Anchor siklus: tanggal valid, tidak sebelum 2020, dan tidak lebih dari
 * sehari di masa depan. Tanggal absurd bisa merusak perhitungan siklus.
 */
export function sanitizeCycleAnchor(value: unknown, now: number = Date.now()): Date | undefined {
  if (typeof value !== 'string') return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  const min = Date.UTC(2020, 0, 1);
  const max = now + 24 * 60 * 60 * 1000;
  if (date.getTime() < min || date.getTime() > max) return undefined;

  return date;
}
