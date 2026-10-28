/**
 * Health check (M7.5) — target monitor uptime eksternal
 * (UptimeRobot/Better Stack) di `https://livia.qzz.io/api/health`.
 *
 * `select 1` ke Neon: ini bukan sekadar "server hidup" — Vercel serverless
 * bisa 200 walau aplikasi mati, dan DB down = hampir semua route 5xx.
 * Memasukkan cek DB membuat status page mencerminkan apa yang dirasakan
 * user, bukan status container.
 *
 * Modul tipis ini terpisah dari route supaya route test bisa mem-mock-nya
 * (pola `@/lib/feedback` — tidak perlu menyentuh `@/lib/db`).
 */
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';

export interface HealthStatus {
  ok: boolean;
  db: 'ok' | 'error';
  timestamp: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  let dbOk = true;
  try {
    await db.execute(sql`select 1`);
  } catch {
    dbOk = false;
  }
  return {
    ok: dbOk,
    db: dbOk ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
  };
}
