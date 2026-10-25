import { z } from 'zod';

/**
 * Validasi environment (M1.5).
 *
 * Tujuan:
 *  - Gagal CEPAT dengan pesan jelas saat runtime butuh konfigurasi yang hilang,
 *    bukan `undefined` yang menjalar jadi bug aneh.
 *  - TIDAK dijalankan saat import modul, supaya `next build` tidak gagal di
 *    tahap "Collecting page data" (bug yang ditemukan di M0).
 *
 * Pola pakai:
 *   const env = requireEnv();          // semua variabel wajib
 *   const key = requireEnv('GEMINI_API_KEY');
 *
 * `optionalEnv` untuk variabel yang boleh kosong.
 */

const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL wajib diisi')
    .refine((v) => v.startsWith('postgres'), 'DATABASE_URL harus URL postgres'),

  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET minimal 32 karakter (generate: openssl rand -base64 32)'),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY wajib diisi'),

  // Wajib hanya kalau fitur "pakai API key sendiri" dipakai.
  ENCRYPTION_KEY: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || v === '' || Buffer.from(v, 'base64').length === 32,
      "ENCRYPTION_KEY harus 32 byte base64 (generate: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\")"
    ),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export class EnvError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Konfigurasi environment tidak valid:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'EnvError';
    this.issues = issues;
  }
}

let cached: ServerEnv | null = null;

/**
 * Ambil & validasi seluruh environment server.
 * Hasil di-cache supaya tidak parse berulang.
 */
export function requireEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`
    );
    throw new EnvError(issues);
  }

  cached = parsed.data;
  return cached;
}

/**
 * Ambil satu variabel wajib dengan pesan error yang menunjuk ke .env.example.
 */
export function requireEnvVar(name: keyof ServerEnv): string {
  const env = requireEnv();
  const value = env[name];

  if (typeof value !== 'string' || value.length === 0) {
    throw new EnvError([`${String(name)} wajib diisi (lihat .env.example)`]);
  }

  return value;
}

/** Ambil variabel opsional; `undefined` kalau kosong. */
export function optionalEnvVar(name: keyof ServerEnv): string | undefined {
  const env = requireEnv();
  const value = env[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Apakah fitur enkripsi API key user aktif.
 * Dipakai untuk memberi pesan yang jelas di UI, bukan crash.
 */
export function isApiKeyStorageEnabled(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  return Boolean(key && key.trim().length > 0 && Buffer.from(key, 'base64').length === 32);
}

/** Reset cache — hanya untuk test. */
export function __resetEnvCacheForTests(): void {
  cached = null;
}
