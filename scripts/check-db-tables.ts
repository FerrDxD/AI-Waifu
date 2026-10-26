/**
 * Probe baca-saja: cek tabel yang benar-benar ada di database.
 *      bunx tsx scripts/check-db-tables.ts
 * Memuat DATABASE_URL dari `.env.local` dengan cara yang sama seperti
 * drizzle.config.ts. Sengaja tanpa top-level await: dijalankan lewat tsx
 * yang mentranspile ke CJS.
 */
import fs from 'fs';
import path from 'path';
// Bun gagal meng-import default export karena interop modul; require CJS
// langsung dipakai supaya probe ini berdiri sendiri.
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
  // Tag template `neon()` mengembalikan array baris langsung, bukan { rows }.
  const names = (await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `) as unknown as { table_name: string }[];

  console.log('Tabel di public:');
  const tableNames = names.map((row) => row.table_name);
  for (const name of tableNames) console.log(' -', name);

  for (const expected of ['userApiKeys', 'userProfiles', 'chatMessages', 'messageSummaries']) {
    const exists = tableNames.includes(expected);
    console.log(`${exists ? 'ADA' : 'BELUM ADA'}: ${expected}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
