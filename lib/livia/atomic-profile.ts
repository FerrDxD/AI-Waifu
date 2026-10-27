import { sql } from 'drizzle-orm';
import { userProfiles } from '@/lib/db/schema';
import { getAffectionLevel } from './affection';

/**
 * Ekspresi SQL untuk update profil ATOMIK (M5.4).
 *
 * Driver `neon-http` tidak punya koneksi persisten, jadi `SELECT ... FOR
 * UPDATE` tidak bisa diandalkan (lock dilepas antar round-trip HTTP). Cara yang
 * benar untuk hindari race di sini: seluruh baca-tulis menjadi SATU statement
 * `UPDATE` di mana kolom baru dihitung dari kolom lama + delta oleh Postgres.
 * Statement tunggal selalu atomik per baris, apa pun drivernya.
 *
 * Fungsionalitas yang dipakai:
 *   - `SET money = money - ?`        guarded by `WHERE money >= ?`
 *   - `SET affection = GREATEST(0, LEAST(100, affection + ?))`
 *   - `SET liviaX = GREATEST(0, LEAST(100, liviaX + ?))`
 *   - `SET affectionLevel = CASE ... END` (denormalisasi dari affection baru)
 *
 * Semua ekspresi di sini merujuk ke kolom `userProfiles.X` (bukan snapshot
 * client) supaya dua request bersamaan di-queue oleh lock baris Postgres,
 * bukan saling menimpa.
 */

/** affection baru = clamp(affection + delta, 0, 100). */
export function newAffectionExpr(delta: number) {
  return sql`GREATEST(0, LEAST(100, ${userProfiles.affection} + ${delta}))`;
}

/** affectionLevel terenkripsi dari affection baru (CASE threshold 0/20/40/60/80/100). */
export function affectionLevelExpr(delta: number) {
  return sql`
    CASE
      WHEN GREATEST(0, LEAST(100, ${userProfiles.affection} + ${delta})) >= 100 THEN 5
      WHEN GREATEST(0, LEAST(100, ${userProfiles.affection} + ${delta})) >= 80  THEN 4
      WHEN GREATEST(0, LEAST(100, ${userProfiles.affection} + ${delta})) >= 60  THEN 3
      WHEN GREATEST(0, LEAST(100, ${userProfiles.affection} + ${delta})) >= 40  THEN 2
      WHEN GREATEST(0, LEAST(100, ${userProfiles.affection} + ${delta})) >= 20  THEN 1
      ELSE 0
    END
  `;
}

/** stat [0,100] = clamp(stat + delta, 0, 100). `col` = kolom stat user. */
export function clampStatExpr(col: unknown, delta: number) {
  return sql`GREATEST(0, LEAST(100, ${col} + ${delta}))`;
}

/** money setelah pengurangan biaya; hanya valid kalau `WHERE money >= cost`. */
export function moneyMinusExpr(cost: number) {
  return sql`${userProfiles.money} - ${cost}`;
}

/** guard `money >= cost` untuk dipasangkan di WHERE (anti double-spend). */
export function moneyAtLeastExpr(cost: number) {
  return sql`${userProfiles.money} >= ${cost}`;
}

/** money setelah penambahan; untuk hasil kerja / reward. */
export function moneyPlusExpr(amount: number) {
  return sql`${userProfiles.money} + ${amount}`;
}

/** Helper: level & nama dari angka affection (dipakai untuk response). */
export function levelFromAffection(affection: number) {
  return getAffectionLevel(affection);
}
