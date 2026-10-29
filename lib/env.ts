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

  // Mesin AI (M2.2, multi-provider di M8.1): semuanya opsional — default baca
  // dari lib/ai/config.ts.
  AI_PROVIDER: z.enum(['gemini', 'openai', 'anthropic', 'openai-compat']).optional(),
  AI_MODEL_CHAT: z.string().optional(),
  AI_MODEL_DIALOGUE: z.string().optional(),
  AI_MODEL_FALLBACK: z.string().optional(),
  // Daftar model yang boleh dipilih user di settings (dipisah koma).
  // Kosong = hanya model server yang ditawarkan.
  AI_ALLOWED_MODELS: z.string().optional(),
  // Kunci server per provider. Hanya provider yang dipakai yang perlu diisi.
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  // Provider pihak ketiga berprotokol OpenAI (TipRouter, OpenRouter, Ollama, ...).
  OPENAI_COMPAT_BASE_URL: z.string().url().optional(),
  OPENAI_COMPAT_API_KEY: z.string().optional(),
  AI_TIMEOUT_MS: z
    .string()
    .optional()
    .refine((v) => v === undefined || (!Number.isNaN(Number(v)) && Number(v) >= 1_000 && Number(v) <= 120_000), 'AI_TIMEOUT_MS harus angka 1000..120000'),
  AI_MAX_RETRIES: z
    .string()
    .optional()
    .refine((v) => v === undefined || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 5), 'AI_MAX_RETRIES harus angka 0..5'),
  AI_RETRY_BASE_MS: z
    .string()
    .optional()
    .refine((v) => v === undefined || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 10_000), 'AI_RETRY_BASE_MS harus angka 0..10000'),
  AI_BREAKER_FAILURE_THRESHOLD: z
    .string()
    .optional()
    .refine((v) => v === undefined || (!Number.isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 100), 'AI_BREAKER_FAILURE_THRESHOLD harus angka 1..100'),
  AI_BREAKER_COOLDOWN_MS: z
    .string()
    .optional()
    .refine((v) => v === undefined || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 600_000), 'AI_BREAKER_COOLDOWN_MS harus angka 0..600000'),

  // Penggunaan & biaya AI (M7.1).
  // Email owner: satu-satunya yang boleh membuka dashboard /usage.
  // Kosong = dashboard terkunci untuk semua orang (default aman).
  OWNER_EMAIL: z.string().optional(),
  // Cap biaya AI per hari (USD) sebelum alert `ai.budget_alert` di log.
  AI_DAILY_COST_LIMIT_USD: z
    .string()
    .optional()
    .refine((v) => v === undefined || (Number.isFinite(Number(v)) && Number(v) > 0), 'AI_DAILY_COST_LIMIT_USD harus angka > 0'),

  // Uptime & alerting (M7.5). Keduanya opsional: kosong = aplikasi jalan
  // persis seperti sebelumnya (tidak ada webhook, tidak ada yang dikirim).
  // Webhook Discord (discord.com/api/webhooks/...) atau Slack
  // (hooks.slack.com/services/...) — format payload dideteksi otomatis.
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  // Jumlah error 5xx dalam jendela 5 menit sebelum webhook menyala (default 10).
  ALERT_5XX_THRESHOLD: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1000),
      'ALERT_5XX_THRESHOLD harus integer 1..1000'
    ),
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
