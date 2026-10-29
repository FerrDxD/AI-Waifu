import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { errors, AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { mutationRateLimit } from '@/lib/rate-limit';
import { recordAuditEvent } from '@/lib/safety/audit';
import {
  deleteAllMemories,
  deleteMemory,
  importLegacyMemory,
  listMemories,
} from '@/lib/livia/memory';
import { getActiveCharacter } from '@/lib/characters/switch';

/**
 * Panel memori (M3.5).
 *
 * GET    → daftar fakta yang diingat Livia (terbaru dulu).
 * DELETE → hapus satu fakta (`?id=`) atau semua (`?all=1`).
 *
 * Ini bukan fitur kosmetik: user berhak tahu apa yang disimpan tentang dirinya
 * dan bisa menghapusnya. Route ini juga menjadi tempat migrasi lazy blob
 * `longTermMemory` lama, supaya user yang belum pernah chat setelah M3 tetap
 * melihat memorinya.
 */

const ROUTE = '/api/memory';
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = apiHandler({ route: `${ROUTE}.GET` }, async ({ userId }) => {
  try {
    // M8.2 Phase B: panel menampilkan memori karakter aktif saja.
    const character = await getActiveCharacter(userId);

    // Migrasi sekali jalan dari kolom lama. Kalau kosong, tidak ada kerja.
    const profiles = await db
      .select({ legacy: userProfiles.longTermMemory })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    const legacy = profiles[0]?.legacy;
    if (legacy && legacy.trim() !== '') {
      await importLegacyMemory(userId, legacy, character.id);
    }

    const memories = await listMemories(userId, character.id);
    return NextResponse.json({ memories }, { headers: NO_STORE });
  } catch (error) {
    // Tabel `memoryItems` belum ada (user belum `db:push`) atau DB sedang
    // down. Panel harus tetap bisa dibuka — tampilkan daftar kosong, bukan
    // halaman error. Detailnya masuk log, bukan ke client.
    logger.warn('memory.list_failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ memories: [], unavailable: true }, { headers: NO_STORE });
  }
});

export const DELETE = apiHandler(
  {
    route: `${ROUTE}.DELETE`,
    rateLimit: mutationRateLimit,
    rateLimitKey: ({ userId }) => `memory_${userId}`,
    rateLimitMessage: 'Terlalu banyak permintaan hapus. Tunggu sebentar ya.',
  },
  async ({ userId, req }) => {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const all = url.searchParams.get('all');

    if (!all && !id) {
      throw errors.badRequest('Sertakan ?id=<uuid> atau ?all=1 untuk menghapus memori.');
    }

    if (id && !UUID_RE.test(id)) {
      throw errors.badRequest('ID memori tidak valid.');
    }

    try {
      if (all === '1' || all === 'true') {
        // Hanya memori karakter aktif yang dihapus dari panel; penghapusan
        // total semua karakter ada di alur GDPR (lib/safety/data-control).
        const character = await getActiveCharacter(userId);
        const removed = await deleteAllMemories(userId, character.id);

        await recordAuditEvent({
          userId,
          action: 'memory.delete_all',
          metadata: { route: `${ROUTE}.DELETE`, removed, characterId: character.id },
        });

        return NextResponse.json({ removed, all: true }, { headers: NO_STORE });
      }

      const removed = await deleteMemory(userId, id as string);
      if (!removed) throw errors.notFound('Memori');

      await recordAuditEvent({
        userId,
        action: 'memory.delete',
        metadata: { route: `${ROUTE}.DELETE`, removed: 1 },
      });

      return NextResponse.json({ removed: 1, all: false }, { headers: NO_STORE });
    } catch (error) {
      // `NOT_FOUND` adalah jawaban yang sah (memang tidak ada) — jangan
      // ditelan. Sisanya berarti penyimpanan belum siap; jawab jujur.
      if (error instanceof AppError && error.statusCode < 500) throw error;

      logger.warn('memory.delete_failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw errors.badRequest(
        'Penyimpanan memori belum siap di server ini.',
        'MEMORY_UNAVAILABLE'
      );
    }
  }
);
