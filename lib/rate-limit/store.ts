import { db } from '@/lib/db';
import { rateLimitCounters } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../logger';
import type { RateLimitStore } from './types';

/**
 * Store counter rate limit berbasis Postgres/Neon (M5.5).
 *
 * Increment dilakukan ATOMIK dalam satu statement:
 *   INSERT ... ON CONFLICT (key) DO UPDATE SET count = count + 1
 * sehingga dua request bersamaan di-queue oleh lock baris, bukan saling
 * menimpa — dan aman di driver `neon-http` yang tidak punya koneksi persisten
 * (tidak bisa andalkan `SELECT ... FOR UPDATE`).
 *
 * `key` sudah menyandikan `${name}:${scope}:${windowMs}:${bucketStart}`, jadi
 * tiap window punya baris sendiri. Baris window lama dibuang oleh `db:prune`.
 *
 * FAIL-OPEN: kalau store tidak bisa menulis (tabel belum di-migrasi, Neon
 * free-tier tertidur, DB error), limiter TIDAK menggagalkan request — ia
 * `logger.error` dan menganggap count = 1. Rate limit adalah lapisan
 * pertahanan tambahan, bukan satu-satunya proteksi (bcrypt cost 12 + lockout
 * tetap jalan). Aplikasi game yang 500 di semua tombol karena limiter-nya
 * tidak bisa menulis lebih buruk dari limiter yang sekilas tidak aktif.
 */
export const dbRateLimitStore: RateLimitStore = {
  async increment(key: string, windowStart: Date): Promise<number> {
    try {
      const rows = await db
        .insert(rateLimitCounters)
        .values({ key, count: 1, windowStart })
        .onConflictDoUpdate({
          target: rateLimitCounters.key,
          set: { count: sql`${rateLimitCounters.count} + 1` },
        })
        .returning({ count: rateLimitCounters.count });

      return rows[0]?.count ?? 1;
    } catch (error) {
      logger.error('rate_limit.store.increment_failed (fail-open)', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return 1;
    }
  },

  async delete(key: string): Promise<void> {
    try {
      await db.delete(rateLimitCounters).where(eq(rateLimitCounters.key, key));
    } catch (error) {
      logger.error('rate_limit.store.delete_failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
