import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import { getAffectionLevel } from '@/lib/livia/affection';
import {
  BACKUP_LIMITS,
  clampInt,
  sanitizeChapters,
  sanitizeCycleAnchor,
  sanitizeItemList,
  sanitizeJobStats,
  sanitizeOutfit,
} from '@/lib/backup';
import { logger } from '@/lib/logger';

/**
 * POST /api/restore
 *
 * Dipanggil dari halaman Pengaturan setelah user memilih file backup JSON.
 *
 * Sebelumnya endpoint ini TIDAK ADA, jadi `fetch('/api/restore')` selalu 404 —
 * tapi UI tetap menampilkan "Data berhasil dipulihkan". Fitur restore dengan
 * demikian tidak pernah bekerja. Route ini mengisi lubang tersebut.
 *
 * Prinsip:
 * - Backup berasal dari client, jadi diperlakukan sebagai input TIDAK TERPERCAYA.
 *   Semua angka di-clamp, semua array dibatasi panjangnya, dan `affectionLevel`
 *   dihitung ulang di server (tidak dipercaya dari file).
 * - Ini game single-player, jadi "curang" menaikkan uang bukan masalah keamanan.
 *   Yang dicegah adalah nilai rusak/absurd yang bisa merusak UI atau database.
 * - Yang TIDAK dipulihkan: API key (sudah dibuang saat backup), data auth,
 *   dan chat history (bukan bagian backup).
 */

const MAX_MONEY = BACKUP_LIMITS.maxMoney;

type RestoreBody = Record<string, unknown>;

export const POST = jsonApiHandler<RestoreBody>(
  {
    route: '/api/restore',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak permintaan. Coba lagi sebentar.',
  },
  async ({ userId, body }) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw errors.badRequest('Data backup tidak valid.', 'INVALID_BACKUP');
    }

    const profilePatch: Partial<typeof userProfiles.$inferInsert> = {};
    const storyPatch: Partial<typeof storyProgress.$inferInsert> = {};

    if ('affection' in body) {
      const affection = clampInt(body.affection, 0, 100, 0);
      profilePatch.affection = affection;
      // Level SELALU diturunkan dari affection, bukan dari file backup.
      profilePatch.affectionLevel = getAffectionLevel(affection).level;
    }

    if ('money' in body) {
      profilePatch.money = clampInt(body.money, 0, MAX_MONEY, 0);
    }

    const items = sanitizeItemList(body.itemsBrought);
    if (items) profilePatch.itemsBrought = items;

    const outfit = sanitizeOutfit(body.activeOutfit);
    if (outfit) profilePatch.activeOutfit = outfit;

    const jobStats = sanitizeJobStats(body.jobStats);
    if (jobStats) profilePatch.jobStats = jobStats;

    if (body.liviaStats && typeof body.liviaStats === 'object' && !Array.isArray(body.liviaStats)) {
      const stats = body.liviaStats as Record<string, unknown>;
      if ('hunger' in stats) profilePatch.liviaHunger = clampInt(stats.hunger, 0, 100, 100);
      if ('energy' in stats) profilePatch.liviaEnergy = clampInt(stats.energy, 0, 100, 100);
      if ('hydration' in stats)
        profilePatch.liviaHydration = clampInt(stats.hydration, 0, 100, 100);

      const anchor = sanitizeCycleAnchor(stats.cycleAnchor);
      if (anchor) profilePatch.liviaCycleAnchor = anchor;
    }

    const chapters = sanitizeChapters(body.unlockedChapters);
    if (chapters) storyPatch.unlockedChapters = chapters;

    if (Object.keys(profilePatch).length === 0 && Object.keys(storyPatch).length === 0) {
      throw errors.badRequest('Tidak ada data yang bisa dipulihkan dari file ini.', 'EMPTY_BACKUP');
    }

    // Jangan pernah membuat profil baru dari backup: restore hanya untuk akun
    // yang profilnya sudah ada (kalau tidak, user bisa "melompati" onboarding).
    if (Object.keys(profilePatch).length > 0) {
      const updated = await db
        .update(userProfiles)
        .set(profilePatch)
        .where(eq(userProfiles.userId, userId))
        .returning({ id: userProfiles.id });

      if (updated.length === 0) {
        throw errors.notFound('Profil');
      }
    }

    if (Object.keys(storyPatch).length > 0) {
      const updated = await db
        .update(storyProgress)
        .set(storyPatch)
        .where(eq(storyProgress.userId, userId))
        .returning({ id: storyProgress.id });

      if (updated.length === 0) {
        // Profil ada tapi baris story belum dibuat — buat sekarang.
        await db.insert(storyProgress).values({ userId, ...storyPatch });
      }
    }

    logger.info('Data backup dipulihkan', {
      route: '/api/restore',
      userId,
      fields: [...Object.keys(profilePatch), ...Object.keys(storyPatch)],
    });

    return NextResponse.json({
      ok: true,
      restored: [...Object.keys(profilePatch), ...Object.keys(storyPatch)],
    });
  }
);

/** GET sengaja tidak disediakan: restore hanya lewat POST. */
export const GET = apiHandler({ route: '/api/restore' }, async () => {
  throw errors.notFound('Endpoint');
});
