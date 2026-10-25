import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Koneksi database.
 *
 * PENTING: jangan `throw` di top-level module. Dulu file ini melempar error
 * kalau `DATABASE_URL` kosong, yang membuat `next build` gagal total saat
 * "Collecting page data" — padahal build tidak butuh koneksi DB. Sekarang
 * kegagalan dipindah ke saat query pertama dipakai.
 */

const connectionString = process.env.DATABASE_URL;

function createDb() {
  if (!connectionString) {
    // Proxy yang melempar hanya ketika benar-benar dipakai.
    return new Proxy({} as ReturnType<typeof drizzle>, {
      get() {
        throw new Error(
          'DATABASE_URL belum diset. Tambahkan ke .env (lihat .env.example).'
        );
      },
    });
  }

  return drizzle(neon(connectionString), { schema });
}

export const db = createDb();
