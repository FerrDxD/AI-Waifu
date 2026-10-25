import { createLimiter } from '@/lib/rate-limit';

let counter = 0;

/**
 * Limiter untuk tes. Pakai nama unik supaya bucket tidak bertabrakan
 * dengan limiter produksi yang juga hidup di proses yang sama.
 */
export function createTestLimiter(options: { limit: number; windowMs?: number }) {
  return createLimiter({
    name: `test-${++counter}`,
    limit: options.limit,
    windowMs: options.windowMs ?? 60_000,
  });
}
