/**
 * Rate limiter terdistribusi (M5.5).
 *
 * Versi M0 memakai `Map` in-memory: reset tiap cold start serverless, tidak
 * dibagi antar instance, hilang saat redeploy, dan (dulu) bisa bocor memori.
 * Versi ini menyimpan counter di Postgres/Neon lewat `dbRateLimitStore`
 * (lihat ./store.ts) sehingga berlaku lintas instance & bertahan antar
 * redeploy. Counter lama dibuang oleh `db:prune`.
 *
 * Desain:
 * - Tiap limiter punya daftar `caps` (per-menit + harian + bulanan).
 *   `limit(key)` mengecek SEMUA cap (window terpendek dulu); kalau salah satu
 *   terlampaui, request ditolak. Ini memberi daily + monthly cap (pengaman biaya
 *   AI) di samping limit per-menit.
 * - `alert` pada cap memicu `logger.warn` saat cap pertama kali terlampaui
 *   (cost alert) — dipakai untuk kuota AI.
 * - Key scope (user vs IP) ditentukan pemanggil (api-handler: userOrIpKey/ipKey);
 *   limiter hanya menambahkan prefix `name` + window.
 *
 * Tes: injeksi store in-memory (tests/helpers/limiter.ts) atau mock
 * '@/lib/rate-limit/store' — jadi algoritma diuji tanpa database.
 */
import { logger } from '../logger';
import { dbRateLimitStore } from './store';
import type { Cap, RateLimitResult, RateLimitStore, RateLimiter } from './types';

export type { Cap, RateLimitResult, RateLimitStore, RateLimiter } from './types';

const WINDOW_MINUTE = 60_000;
const WINDOW_10_MIN = 10 * 60_000;
const WINDOW_15_MIN = 15 * 60_000;
const WINDOW_DAY = 24 * 60 * 60_000;
const WINDOW_MONTH = 30 * 24 * 60 * 60_000;

/**
 * Buat limiter. `caps` boleh berisi beberapa window (mis. per-menit + harian +
 * bulanan). `store` default ke Postgres; tes bisa menginjek store in-memory.
 */
export function createLimiter(options: {
  name: string;
  caps: Cap[];
  store?: RateLimitStore;
}): RateLimiter {
  const { name, caps } = options;
  const store = options.store ?? dbRateLimitStore;
  // Window terpendek dulu: cap ketat diperiksa lebih awal, dan kalau ia menolak
  // maka cap yang lebih panjang (harian/bulanan) tidak ikut di-increment.
  const ordered = [...caps].sort((a, b) => a.windowMs - b.windowMs);

  return {
    async limit(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      let minRemaining = Number.POSITIVE_INFINITY;
      let resetAt = now;

      for (const cap of ordered) {
        const bucketStart = Math.floor(now / cap.windowMs) * cap.windowMs;
        const scopeKey = `${name}:${key}:${cap.windowMs}:${bucketStart}`;
        const count = await store.increment(scopeKey, new Date(bucketStart));

        if (count > cap.limit) {
          if (cap.alert && count === cap.limit + 1) {
            logger.warn('Rate limit cap terlampaui (cost alert)', {
              limiter: name,
              scope: key,
              cap: cap.alert,
              count,
            });
          }
          const resetAtMs = bucketStart + cap.windowMs;
          return {
            success: false,
            remaining: 0,
            resetAt: resetAtMs,
            retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - now) / 1000)),
          };
        }

        minRemaining = Math.min(minRemaining, cap.limit - count);
        resetAt = Math.max(resetAt, bucketStart + cap.windowMs);
      }

      return { success: true, remaining: minRemaining, resetAt, retryAfterSeconds: 0 };
    },

    async reset(key: string): Promise<void> {
      const now = Date.now();
      for (const cap of ordered) {
        const bucketStart = Math.floor(now / cap.windowMs) * cap.windowMs;
        await store.delete(`${name}:${key}:${cap.windowMs}:${bucketStart}`);
      }
    },
  };
}

/** Rate limit endpoint AI (chat, date, tts): 5/menit + 200/hari + 2.000/bulan. */
export const aiRateLimit = createLimiter({
  name: 'ai',
  caps: [
    { limit: 5, windowMs: WINDOW_MINUTE },
    { limit: 200, windowMs: WINDOW_DAY, alert: 'ai-daily-200' },
    { limit: 2000, windowMs: WINDOW_MONTH, alert: 'ai-monthly-2000' },
  ],
});

/** Rate limit endpoint auth per IP: 10 request / 10 menit (spam register & oracle). */
export const authIpRateLimit = createLimiter({
  name: 'auth-ip',
  caps: [{ limit: 10, windowMs: WINDOW_10_MIN }],
});

/** Registrasi: lebih ketat, 5 akun / 10 menit / IP. */
export const registerRateLimit = createLimiter({
  name: 'register',
  caps: [{ limit: 5, windowMs: WINDOW_10_MIN }],
});

/** Reset password: 5 / 15 menit / IP (anti enumerasi akun). */
export const passwordResetRateLimit = createLimiter({
  name: 'reset-pw',
  caps: [{ limit: 5, windowMs: WINDOW_15_MIN }],
});

/** Lockout login per identifier: 5 gagal → kunci 15 menit (dipakai auth-lockout). */
export const loginAttemptLimiter = createLimiter({
  name: 'login',
  caps: [{ limit: 5, windowMs: WINDOW_15_MIN }],
});

/** Mutasi state (gift, work, story, dll): 30/menit + 1.000/hari per user. */
export const mutationRateLimit = createLimiter({
  name: 'mutation',
  caps: [
    { limit: 30, windowMs: WINDOW_MINUTE },
    { limit: 1000, windowMs: WINDOW_DAY },
  ],
});

/** Kuota harian AI (pengaman biaya): 200/hari + 2.000/bulan per user. */
export const aiDailyQuota = createLimiter({
  name: 'ai-daily',
  caps: [
    { limit: 200, windowMs: WINDOW_DAY, alert: 'ai-daily-quota-200' },
    { limit: 2000, windowMs: WINDOW_MONTH, alert: 'ai-monthly-quota-2000' },
  ],
});

/**
 * Ambil IP client dari header proxy. Di Vercel `x-forwarded-for` diisi platform;
 * kalau kosong (dev lokal) pakai fallback konstan supaya limiter tetap jalan.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Helper: bangun response 429 standar dengan header `Retry-After`. */
export function rateLimitResponse(result: RateLimitResult, message: string): Response {
  return new Response(JSON.stringify({ error: message, code: 'RATE_LIMITED' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfterSeconds),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
    },
  });
}
