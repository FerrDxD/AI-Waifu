import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getModelCatalog, isModelAllowed, sanitizePreferredModel } from './model-selection';

/**
 * Akses DB untuk preferensi model (M8.1 Phase 2).
 *
 * Dipisah dari `model-selection.ts` supaya aturan allowlist bisa diuji tanpa
 * database. Semua penulisan lewat satu pintu ini — route tidak pernah menulis
 * `preferredModel` langsung.
 */

/**
 * Model pilihan user, sudah divalidasi terhadap allowlist saat ini.
 * `undefined` = pakai model server.
 */
export async function getUserPreferredModel(userId: string): Promise<string | undefined> {
  const rows = await db
    .select({ preferredModel: userProfiles.preferredModel })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  const stored = rows[0]?.preferredModel ?? null;
  const resolved = sanitizePreferredModel(stored);

  // Pilihan usang (model dihapus dari allowlist) tidak boleh diam saja tanpa
  // jejak: DB tetap menyimpannya, jadi owner perlu tahu kenapa user balik ke
  // model default.
  if (stored && !resolved) {
    logger.warn('ai.preferred_model_not_allowed', { userId });
  }

  return resolved;
}

/**
 * Simpan pilihan model. `null` = kembali ke model server.
 *
 * Melempar `INVALID_MODEL` (400) kalau model tidak ada di allowlist — bukan
 * diam-diam disimpan lalu gagal saat request chat.
 */
export async function setUserPreferredModel(
  userId: string,
  model: string | null
): Promise<{ model: string | null }> {
  let next: string | null = null;

  if (model !== null) {
    const candidate = model.trim();
    if (!candidate) {
      next = null;
    } else if (!isModelAllowed(candidate)) {
      throw errors.badRequest(
        'Model itu tidak tersedia. Pilih dari daftar yang ada di pengaturan.',
        'INVALID_MODEL'
      );
    } else {
      next = candidate;
    }
  }

  await db
    .update(userProfiles)
    .set({ preferredModel: next })
    .where(eq(userProfiles.userId, userId));

  return { model: next };
}

/** Payload untuk endpoint settings: pilihan aktif + katalog yang boleh dipilih. */
export async function getModelPreference(userId: string): Promise<{
  model: string | null;
  models: { id: string; label: string }[];
}> {
  const rows = await db
    .select({ preferredModel: userProfiles.preferredModel })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  return {
    model: sanitizePreferredModel(rows[0]?.preferredModel) ?? null,
    models: getModelCatalog(),
  };
}
