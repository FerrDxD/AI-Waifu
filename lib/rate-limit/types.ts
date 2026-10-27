/**
 * Tipe bersama untuk rate limiter (M5.5).
 *
 * Dipisah ke file sendiri supaya `store.ts` (implementasi penyimpanan) dan
 * `rate-limit.ts` (algoritma + konfigurasi limiter) tidak saling import di
 * runtime (hindari circular dependency), dan supaya tes bisa menginjek store
 * in-memory tanpa menyentuh Postgres.
 */

/** Satu batas: `limit` request per window `windowMs`. */
export type Cap = {
  limit: number;
  windowMs: number;
  /**
   * Label untuk alert biaya (cost alert). Kalau cap ini pertama kali terlampaui
   * (count == limit + 1), `logger.warn` dipicu — sinyal bahwa user menyentuh
   * batas kuota AI (pengaman biaya).
   */
  alert?: string;
};

/**
 * Penyimpanan counter rate limit. Di produksi: Postgres/Neon (`dbRateLimitStore`).
 * Di tes: in-memory (lihat tests/helpers/limiter.ts) — jadi algoritma bisa diuji
 * tanpa database.
 */
export type RateLimitStore = {
  /** Tambah 1 untuk `key`; kembalikan jumlah kumulatif bucket ini (harus atomik). */
  increment(key: string, windowStart: Date): Promise<number>;
  /** Hapus `key` (dipakai `reset()`). */
  delete(key: string): Promise<void>;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  /** Epoch ms kapan window terlama (di antara semua cap) di-reset. */
  resetAt: number;
  /** Detik sampai boleh coba lagi (0 kalau success). */
  retryAfterSeconds: number;
};

export type RateLimiter = {
  limit: (key: string) => Promise<RateLimitResult>;
  /** Mengosongkan bucket aktif untuk `key` di semua cap. Async (DB di produksi). */
  reset: (key: string) => Promise<void>;
};
