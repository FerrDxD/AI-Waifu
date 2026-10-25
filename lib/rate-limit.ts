/**
 * Rate limiter (M0/H0.4).
 *
 * ⚠️ Batasan yang diketahui: ini masih in-memory `Map`, jadi:
 * - reset setiap cold start di serverless,
 * - tidak dibagi antar instance,
 * - hilang saat redeploy.
 * Itu cukup untuk M0 (menahan spam klik & brute force dari satu koneksi), tapi
 * BUKAN proteksi produksi. M5.5 memindahkannya ke DB/Redis (Upstash) dengan
 * daily + monthly cap per user.
 *
 * Yang diperbaiki dibanding versi sebelumnya:
 * - eviction entri kedaluwarsa (dulu `Map` tumbuh selamanya = memory leak),
 * - window & limit bisa dikonfigurasi per kebutuhan (bukan hardcode 5/menit),
 * - tersedia helper lockout untuk gagal login (5x / 15 menit).
 */

type Bucket = { count: number; resetAt: number };

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  /** Epoch ms kapan bucket di-reset. */
  resetAt: number;
  /** Detik sampai boleh coba lagi (0 kalau success). */
  retryAfterSeconds: number;
};

export type RateLimiter = {
  limit: (key: string) => Promise<RateLimitResult>;
  reset: (key: string) => void;
};

const SWEEP_THRESHOLD = 1000;

function createLimiter(options: { limit: number; windowMs: number; name: string }): RateLimiter {
  const { limit: max, windowMs, name } = options;
  const buckets = new Map<string, Bucket>();

  /** Buang bucket kedaluwarsa supaya Map tidak tumbuh tanpa batas. */
  function sweep(now: number) {
    if (buckets.size < SWEEP_THRESHOLD) return;
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }

  return {
    async limit(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      const scopedKey = `${name}:${key}`;
      const existing = buckets.get(scopedKey);

      if (!existing || now > existing.resetAt) {
        sweep(now);
        const resetAt = now + windowMs;
        buckets.set(scopedKey, { count: 1, resetAt });
        return {
          success: true,
          remaining: Math.max(0, max - 1),
          resetAt,
          retryAfterSeconds: 0,
        };
      }

      if (existing.count >= max) {
        return {
          success: false,
          remaining: 0,
          resetAt: existing.resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
      }

      existing.count += 1;
      return {
        success: true,
        remaining: Math.max(0, max - existing.count),
        resetAt: existing.resetAt,
        retryAfterSeconds: 0,
      };
    },

    reset(key: string) {
      buckets.delete(`${name}:${key}`);
    },
  };
}

/** Rate limit untuk endpoint AI (chat, date, tts): 5 request / menit / user. */
export const aiRateLimit = createLimiter({ name: 'ai', limit: 5, windowMs: 60_000 });

/**
 * Rate limit endpoint auth per IP: 10 request / 10 menit.
 * Menahan spam registrasi & oracle reset-password dari satu IP.
 */
export const authIpRateLimit = createLimiter({ name: 'auth-ip', limit: 10, windowMs: 10 * 60_000 });

/** Registrasi: lebih ketat, 5 akun / 10 menit / IP. */
export const registerRateLimit = createLimiter({ name: 'register', limit: 5, windowMs: 10 * 60_000 });

/** Reset password: 5 percobaan / 15 menit / IP (dulu bisa di-spam untuk enumerasi akun). */
export const passwordResetRateLimit = createLimiter({ name: 'reset-pw', limit: 5, windowMs: 15 * 60_000 });

/**
 * Lockout login per identifier (email/username): 5 gagal → kunci 15 menit.
 * Dipakai di `lib/auth-lockout.ts` supaya `authorize()` bisa menolak lebih awal.
 */
export const loginAttemptLimiter = createLimiter({ name: 'login', limit: 5, windowMs: 15 * 60_000 });

/** Rate limit umum untuk endpoint yang mengubah state (gift, work, story, dll). */
export const mutationRateLimit = createLimiter({ name: 'mutation', limit: 30, windowMs: 60_000 });

/**
 * Kuota harian per user untuk panggilan AI (pengaman biaya, AUDIT 3.8).
 * 24 jam rolling window, 200 pesan AI per user per hari.
 */
export const aiDailyQuota = createLimiter({ name: 'ai-daily', limit: 200, windowMs: 24 * 60 * 60_000 });

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
