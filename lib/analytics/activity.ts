/**
 * Pencatatan hari-aktif user (M7.2).
 *
 * Sumber data metrik retensi/DAU di dashboard `/analytics`. Satu upsert
 * ringan (`ON CONFLICT DO NOTHING`) per interaksi yang selesai tersimpan —
 * tabel `userActivityDaily` (1 baris per user per hari UTC) tidak pernah
 * di-prune, jadi retensi kohort lama tetap akurat setelah `chatMessages`
 * sendiri dipangkas 90 hari oleh `db:prune`.
 *
 * Definisi "aktif" disengaja sempit: minimal satu interaksi chat atau kencan
 * yang **selesai tersimpan**. Kunjungan halaman tidak dihitung (signal terlalu
 * bising), dan interaksi yang gagal (mis. AI overload) tidak tercatat —
 * konsekuensinya undercount kecil saat outage, yang wajar untuk analitik.
 */
import { db } from '@/lib/db';
import { userActivityDaily } from '@/lib/db/schema';
import { dayBucketUtc } from '@/lib/ai/usage';
import { logger } from '@/lib/logger';

/**
 * Catat satu hari-aktif untuk `userId` (idempotent per hari UTC).
 *
 * Dipanggil dengan `await` (bukan fire-and-forget): di Next serverless,
 * promise yang tidak ditunggu bisa dibekukan begitu response dikirim, dan
 * baris aktivitas yang hilang = undercount retensi permanen untuk hari itu.
 * Biayanya satu upsert indeks-PK per interaksi — diabaikan.
 *
 * Fail-open: kegagalan DB tidak boleh merusak interaksi user; barisnya saja
 * yang hilang (undercount, bukan data rusak).
 */
export async function recordUserActivity(userId: string, now: Date = new Date()): Promise<void> {
  const day = dayBucketUtc(now);
  try {
    await db
      .insert(userActivityDaily)
      .values({ userId, day })
      .onConflictDoNothing({ target: [userActivityDaily.userId, userActivityDaily.day] });
  } catch (error) {
    logger.error('analytics.activity_failed (fail-open)', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
