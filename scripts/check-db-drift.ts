/**
 * Cek drift skema untuk CI (M5.3).
 *
 * Menjalankan `drizzle-kit generate` terhadap folder migrasi `./drizzle`.
 * Kalau schema di `lib/db/schema.ts` sudah sinkron dengan migrasi terakhir,
 * drizzle-kit mencetak "No schema changes, nothing to do" — dan itu yang kita
 * suruh; kalau ada perubahan yang belum dimigrasikan, proses ini gagal (exit≠0)
 * sehingga CI menolak merge sebelum migrasi digenerate.
 *
 * Jalankan manual: `bun run db:check-drift`
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function main() {
  let stdout = '';
  try {
    stdout = execSync('bunx drizzle-kit generate', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
  } catch (error) {
    const e = error as { stdout?: Buffer | string; stderr?: Buffer | string };
    stdout = Buffer.isBuffer(e.stdout) ? e.stdout.toString() : (e.stdout ?? '');
    const stderr = Buffer.isBuffer(e.stderr) ? e.stderr.toString() : (e.stderr ?? '');
    // exit≠0 bisa berarti "ada diff" ATAU kegagalan kredensial; laporkan keduanya.
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    process.exit(2);
  }

  const clean = /no schema changes/i.test(stdout);
  if (clean) {
    console.log('Skema sinkron: tidak ada perubahan yang belum dimigrasikan.');
    process.exit(0);
  }

  // drizzle-kit kadang berhasil namun mencetak sesuatu yang lain; kalau ada
  // file migrasi baru tertulis, itu juga drift yang harus di-commit.
  const px = path.resolve('drizzle');
  const files = fs.existsSync(px) ? fs.readdirSync(px) : [];
  if (files.length > 2) {
    console.error('Ada migrasi baru yang belum dikomit. Jalankan bun run db:generate dan commit hasilnya.');
    process.exit(3);
  }
  console.log(stdout);
  process.exit(0);
}

main();
