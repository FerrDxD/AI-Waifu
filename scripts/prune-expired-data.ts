/**
 * Job retensi data (M5.3).
 *
 * Menghapus chat mentah yang usianya >90 hari beserta ringkasannya dalam
 * SEKALI transaksi. Ini dilakukan BERSAMA — kalau hanya chatMessages yang
 * dihapus, akuntansi `messageSummaries.coveredCount` jadi melenceng dan
 * summarizer berhenti bekerja (pending = max(0, total - covered) = 0 selamanya
 * karena `covered` menghitung pesan yang sudah tidak ada).
 *
 * Fakta yang pernah disampaikan di pesan lama tetap hidup via `memoryItems`
 * (M3) — tabel itu tidak disinggung di sini.
 *
 * Penggunaan: `bun run db:prune [hari]`
 *   - `hari` default 90 hari. Contoh 365 hari berarti hanya sisa 1 tahun.
 *   - Aman dijalankan ulang (idempoten, tanpa state).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const postgres = require('@neondatabase/serverless') as typeof import('@neondatabase/serverless');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envLocal = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
    dbUrl = envLocal.match(/DATABASE_URL=(.*)/)?.[1]?.trim().replace(/^"|"$/g, '');
  } catch {}
}
if (!dbUrl) {
  console.error('DATABASE_URL tidak ditemukan.');
  process.exit(1);
}

const sql = postgres.neon(dbUrl);

async function main() {
  const days = Number(process.argv[2] ?? 90);
  if (!Number.isFinite(days) || days <= 0) {
    console.error(`Hari harus angka positif: bun run db:prune 90`);
    process.exit(1);
  }
  const cutoffDays = Math.floor(days);

  const results = await sql.transaction(
    () => [
      sql`DELETE FROM "chatMessages" WHERE "created_at" < now() - (${cutoffDays} * interval '1 day')`,
      sql`DELETE FROM "messageSummaries" WHERE "created_at" < now() - (${cutoffDays} * interval '1 day')`,
    ],
    { fullResults: true }
  );

  const chatCount = Number((results[0] as { rowCount: number | string }).rowCount ?? 0);
  const summaryCount = Number((results[1] as { rowCount: number | string }).rowCount ?? 0);
  console.log(`Retensi ${cutoffDays} hari: ${chatCount} chat, ${summaryCount} ringkasan dihapus.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
