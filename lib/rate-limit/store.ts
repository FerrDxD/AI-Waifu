import { db } from '@/lib/db';
import { rateLimitCounters } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
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
 */
export const dbRateLimitStore: RateLimitStore = {
  async increment(key: string, windowStart: Date): Promise<number> {
    const rows = await db
      .insert(rateLimitCounters)
      .values({ key, count: 1, windowStart })
      .onConflictDoUpdate({
        target: rateLimitCounters.key,
        set: { count: sql`${rateLimitCounters.count} + 1` },
      })
      .returning({ count: rateLimitCounters.count });

    return rows[0]?.count ?? 1;
  },

  async delete(key: string): Promise<void> {
    await db.delete(rateLimitCounters).where(eq(rateLimitCounters.key, key));
  },
};
