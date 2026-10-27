/**
 * Lockout login (M0/H0.4).
 *
 * Aturan: 5 kali gagal login untuk identifier yang sama → terkunci 15 menit.
 * Login sukses menghapus hitungan.
 *
 * ⚠️ Batasan: ini masih in-memory `Map` — reset saat cold start dan tidak
 * dibagi antar instance. Ini diterima untuk aplikasi ini karena: (1) bcrypt
 * cost 12 tetap memperlambat brute force di setiap instance, (2) target
 * ancaman utamanya spam/naif, bukan serangan terdistribusi. Kalau nanti
 * dibutuhkan lockout terdistribusi (mis. untuk rilis publik skala besar),
 * pindahkan ke pola `rateLimitCounters` (M5.5) dengan key per-identifier.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000;

type Attempt = { failures: number; firstFailureAt: number; lockedUntil: number | null };

const attempts = new Map<string, Attempt>();

function normalize(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function sweep(now: number) {
  if (attempts.size < 1000) return;
  for (const [key, value] of attempts) {
    const expired = value.lockedUntil ? now > value.lockedUntil : now - value.firstFailureAt > LOCKOUT_MS;
    if (expired) attempts.delete(key);
  }
}

export type LockoutState = {
  locked: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
};

export function getLockoutState(identifier: string): LockoutState {
  const key = normalize(identifier);
  const now = Date.now();
  const attempt = attempts.get(key);

  if (!attempt) {
    return { locked: false, retryAfterSeconds: 0, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  if (attempt.lockedUntil) {
    if (now < attempt.lockedUntil) {
      return {
        locked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((attempt.lockedUntil - now) / 1000)),
        remainingAttempts: 0,
      };
    }
    // Lockout sudah lewat → bersihkan dan mulai dari nol.
    attempts.delete(key);
    return { locked: false, retryAfterSeconds: 0, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  // Window hitungan gagal sudah lewat → anggap bersih.
  if (now - attempt.firstFailureAt > LOCKOUT_MS) {
    attempts.delete(key);
    return { locked: false, retryAfterSeconds: 0, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  return {
    locked: false,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attempt.failures),
  };
}

/** Catat satu kegagalan login. Mengembalikan state setelah kegagalan dihitung. */
export function recordFailedLogin(identifier: string): LockoutState {
  const key = normalize(identifier);
  const now = Date.now();
  sweep(now);

  const existing = attempts.get(key);
  const fresh: Attempt =
    !existing || now - existing.firstFailureAt > LOCKOUT_MS
      ? { failures: 0, firstFailureAt: now, lockedUntil: null }
      : existing;

  fresh.failures += 1;

  if (fresh.failures >= MAX_FAILED_ATTEMPTS) {
    fresh.lockedUntil = now + LOCKOUT_MS;
  }

  attempts.set(key, fresh);
  return getLockoutState(key);
}

/** Hapus hitungan gagal setelah login sukses. */
export function clearLoginFailures(identifier: string): void {
  attempts.delete(normalize(identifier));
}

export const LOCKOUT_POLICY = {
  maxFailedAttempts: MAX_FAILED_ATTEMPTS,
  lockoutMs: LOCKOUT_MS,
} as const;
