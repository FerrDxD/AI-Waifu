/**
 * Audit log peristiwa sensitif (M4.6).
 *
 * Bedanya dengan `lib/logger.ts`:
 *   - **Logger** = observability. Untuk debugging, boleh hilang, boleh ramai,
 *     ditulis ke stdout dan dikumpulkan platform.
 *   - **Audit** = pertanggungjawaban. Ditulis ke tabel, harus tahan lama, dan
 *     dipakai untuk menjawab "siapa menghapus akun ini dan kapan".
 *
 * Aturan yang mengikat:
 *   1. **Tidak pernah melempar.** Kegagalan menulis audit tidak boleh
 *      menggagalkan aksi yang diaudit — apalagi aksi seperti hapus akun, yang
 *      justru sering terjadi saat DB sedang bermasalah.
 *   2. **Tidak menyimpan PII.** Metadata diambil dari daftar putih, bukan
 *      objek bebas. Alasannya sederhana: audit log adalah tempat PII paling
 *      sering bocor tanpa sengaja, karena orang menempelkan seluruh objek
 *      request ke sana.
 *   3. **Aksi gagal tetap dicatat.** Percobaan hapus data yang ditolak justru
 *      informasi paling berharga saat investigasi.
 */

export const AUDIT_ACTIONS = [
  'auth.login.success',
  'auth.login.failure',
  'auth.register',
  'auth.password_reset.request',
  'auth.password_reset.success',
  'apikey.save',
  'apikey.delete',
  'model.save',
  'character.switch',
  'memory.delete',
  'memory.delete_all',
  'data.export',
  'account.delete',
  'age_gate.confirm',
  'safety.crisis_triggered',
  'safety.input_blocked',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditOutcome = 'success' | 'failure' | 'denied';

/**
 * Metadata yang boleh masuk audit log.
 *
 * Daftar putih, bukan daftar hitam: kalau seseorang menambahkan field baru ke
 * objek request dan meneruskannya ke sini, field itu TIDAK ikut tercatat
 * kecuali ditambahkan di sini. Ini yang mencegah "tidak sengaja menyimpan
 * email user di audit log".
 */
const ALLOWED_METADATA_KEYS = new Set([
  'route',
  'reason',
  'count',
  'field',
  'provider',
  'model',
  'category',
  'removed',
  'exportedSections',
  'sections',
  'format',
  'durationMs',
  'userAgentFamily',
  'language',
]);

export type AuditMetadata = Record<string, string | number | boolean | string[]>;

/**
 * Saring metadata ke daftar putih, buang nilai yang tidak aman.
 *
 * Nilai string dipotong 200 karakter supaya satu field aneh tidak bisa
 * menggelembungkan tabel.
 */
export function sanitizeAuditMetadata(raw: unknown): AuditMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const out: AuditMetadata = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;

    if (typeof value === 'string') {
      out[key] = value.slice(0, 200);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = Math.trunc(value);
    } else if (typeof value === 'boolean') {
      out[key] = value;
    } else if (Array.isArray(value)) {
      const list = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.slice(0, 60))
        .slice(0, 20);
      if (list.length > 0) out[key] = list;
    }
  }

  return out;
}

/** Catat satu peristiwa audit. TIDAK PERNAH melempar. */
export async function recordAuditEvent(input: {
  userId: string | null;
  action: AuditAction;
  outcome?: AuditOutcome;
  metadata?: unknown;
}): Promise<void> {
  // Import dinamis: modul ini juga dipakai di jalur yang mungkin berjalan
  // sebelum DATABASE_URL siap (mis. test murni), dan `lib/db` memakai proxy.
  try {
    const { db } = await import('@/lib/db');
    const { auditEvents } = await import('@/lib/db/schema');
    const { logger } = await import('@/lib/logger');

    await db.insert(auditEvents).values({
      userId: input.userId,
      action: input.action,
      outcome: input.outcome ?? 'success',
      metadata: sanitizeAuditMetadata(input.metadata),
    });

    logger.info('audit.event', {
      action: input.action,
      outcome: input.outcome ?? 'success',
      userId: input.userId,
    });
  } catch (error) {
    // Jangan pernah melempar. Audit yang gagal tidak boleh membatalkan aksi
    // user, dan kegagalannya sudah tercatat di log aplikasi biasa.
    try {
      const { logger } = await import('@/lib/logger');
      logger.warn('audit.write_failed', {
        action: input.action,
        error: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // Logger pun tidak tersedia — tidak ada lagi yang bisa dilakukan.
    }
  }
}
