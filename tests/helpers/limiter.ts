import { createLimiter, type RateLimiter, type RateLimitStore } from '@/lib/rate-limit';

let counter = 0;

/**
 * Store in-memory HANYA untuk tes (M5.5): menguji algoritma limiter tanpa
 * database. Produksi memakai `dbRateLimitStore` (Postgres/Neon) — in-memory
 * Map versi M0 sudah dihapus dari jalur produksi.
 */
export function createMemoryStore(): RateLimitStore {
  const map = new Map<string, number>();
  return {
    increment: async (key: string) => {
      const count = (map.get(key) ?? 0) + 1;
      map.set(key, count);
      return count;
    },
    delete: async (key: string) => {
      map.delete(key);
    },
  };
}

/**
 * Limiter untuk tes. Pakai nama unik supaya bucket tidak bertabrakan
 * dengan limiter produksi yang juga hidup di proses yang sama.
 */
export function createTestLimiter(options: { limit: number; windowMs?: number }): RateLimiter {
  return createLimiter({
    name: `test-${++counter}`,
    caps: [{ limit: options.limit, windowMs: options.windowMs ?? 60_000 }],
    store: createMemoryStore(),
  });
}
