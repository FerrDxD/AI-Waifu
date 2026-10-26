/**
 * Pengambilan & penghapusan data user — sisi server (M4.4).
 *
 * Dipisah dari `lib/safety/data-control.ts` (fungsi murni) supaya bagian yang
 * menyentuh DB bisa diuji terpisah dan bentuk output yang dijanjikan ke user
 * tetap stabil.
 *
 * Prinsip yang mengikat:
 *   1. **Export tidak boleh gagal total karena satu bagian rusak.** Kalau
 *      tabel `memoryItems` belum ada, user tetap mendapat chat & profilnya,
 *      plus catatan jujur bahwa satu bagian gagal. Menolak seluruh export
 *      karena satu tabel bermasalah justru merugikan user.
 *   2. **Hapus akun = hard delete.** Baris `users` dihapus, dan seluruh tabel
 *      anak memakai `ON DELETE CASCADE`. Tidak ada soft-delete yang bisa
 *      dipulihkan diam-diam — itu bukan yang diminta user.
 *   3. **Audit dicatat SETELAH aksi.** Kalau penghapusan berhasil tapi audit
 *      gagal, user tetap terhapus; yang hilang hanya jejaknya. Sebaliknya
 *      (audit dulu lalu hapus gagal) menghasilkan log bohong.
 */
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  users,
  userProfiles,
  storyProgress,
  chatMessages,
  messageSummaries,
  memoryItems,
  screenTimeLogs,
  pomodoroSessions,
  gardenPots,
} from '@/lib/db/schema';
import { getApiKeyStatus } from '@/lib/ai/keys';
import { logger } from '@/lib/logger';
import {
  EXPORT_LIMITS,
  buildExportBundle,
  type ExportBundle,
  type ExportSection,
} from '@/lib/safety/data-control';

type SectionResult = {
  section: ExportSection;
  value?: unknown;
  failure?: { section: ExportSection; reason: string };
  truncated?: { section: ExportSection; kept: number; dropped: number };
};

/**
 * Ambil satu bagian data; kegagalan dikembalikan sebagai nilai, bukan dilempar.
 *
 * `limit + 1` dipakai untuk mendeteksi pemotongan tanpa COUNT terpisah: kalau
 * baris yang kembali lebih banyak dari limit, berarti ada yang dibuang.
 */
async function takeSection(
  section: ExportSection,
  loader: () => Promise<unknown[]>,
  limit: number
): Promise<SectionResult> {
  try {
    const rows = await loader();
    if (rows.length > limit) {
      return {
        section,
        value: rows.slice(0, limit),
        truncated: { section, kept: limit, dropped: rows.length - limit },
      };
    }
    return { section, value: rows };
  } catch (error) {
    logger.warn('data_export.section_failed', {
      section,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      section,
      failure: {
        section,
        reason: 'Bagian ini tidak bisa dibaca saat export dijalankan.',
      },
    };
  }
}

/** Kumpulkan seluruh data user menjadi bundel export. */
export async function collectUserData(userId: string): Promise<ExportBundle> {
  const sections: Partial<Record<ExportSection, unknown>> = {};
  const failures: Array<{ section: ExportSection; reason: string }> = [];
  const truncated: Array<{ section: ExportSection; kept: number; dropped: number }> = [];

  const collect = (result: SectionResult) => {
    if (result.failure) {
      failures.push(result.failure);
      return;
    }
    if (result.truncated) truncated.push(result.truncated);
    if (result.value !== undefined) sections[result.section] = result.value;
  };

  // --- akun & profil -------------------------------------------------------
  // Email/username ikut diekspor: itu data user sendiri.
  try {
    const rows = await db
      .select({
        username: users.username,
        email: users.email,
        displayName: users.name,
        provider: users.provider,
        createdAt: users.createdAt,
        ageConfirmedAt: users.ageConfirmedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (rows[0]) sections.account = rows[0];
  } catch (error) {
    failures.push({ section: 'account', reason: 'Data akun tidak bisa dibaca.' });
    logger.warn('data_export.account_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const rows = await db
      .select({
        onboardingDone: userProfiles.onboardingDone,
        affection: userProfiles.affection,
        affectionLevel: userProfiles.affectionLevel,
        money: userProfiles.money,
        itemsBrought: userProfiles.itemsBrought,
        activeOutfit: userProfiles.activeOutfit,
        jobStats: userProfiles.jobStats,
        totalScreenTime: userProfiles.totalScreenTime,
        totalPomodoroSessions: userProfiles.totalPomodoroSessions,
        createdAt: userProfiles.createdAt,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (rows[0]) sections.profile = rows[0];
  } catch (error) {
    failures.push({ section: 'profile', reason: 'Data profil tidak bisa dibaca.' });
    logger.warn('data_export.profile_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // --- status API key (BUKAN key-nya) -------------------------------------
  try {
    const status = await getApiKeyStatus(userId);
    sections.apiKeyStatus = {
      hasKey: status.hasKey,
      keyHint: status.keyHint ?? null,
      note: 'API key tidak pernah diekspor. Simpan sendiri jika masih dibutuhkan.',
    };
  } catch {
    // Status key yang gagal dibaca tidak layak menggagalkan export.
    sections.apiKeyStatus = { hasKey: false, note: 'Status key tidak bisa dibaca.' };
  }

  // --- cerita --------------------------------------------------------------
  try {
    const rows = await db
      .select()
      .from(storyProgress)
      .where(eq(storyProgress.userId, userId));

    if (rows[0]) {
      sections.story = {
        unlockedChapters: rows[0].unlockedChapters,
        lastReadChapter: rows[0].lastReadChapter,
      };
    }
  } catch (error) {
    failures.push({ section: 'story', reason: 'Data cerita tidak bisa dibaca.' });
    logger.warn('data_export.story_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // --- tabel berukuran besar ----------------------------------------------
  collect(
    await takeSection(
      'chats',
      () =>
        db
          .select({
            role: chatMessages.role,
            content: chatMessages.content,
            affectionDelta: chatMessages.affectionDelta,
            createdAt: chatMessages.createdAt,
          })
          .from(chatMessages)
          .where(eq(chatMessages.userId, userId))
          .orderBy(desc(chatMessages.createdAt))
          .limit(EXPORT_LIMITS.chats + 1),
      EXPORT_LIMITS.chats
    )
  );

  collect(
    await takeSection(
      'summaries',
      () =>
        db
          .select({
            summary: messageSummaries.summary,
            coveredCount: messageSummaries.coveredCount,
            createdAt: messageSummaries.createdAt,
          })
          .from(messageSummaries)
          .where(eq(messageSummaries.userId, userId))
          .orderBy(desc(messageSummaries.createdAt))
          .limit(EXPORT_LIMITS.summaries + 1),
      EXPORT_LIMITS.summaries
    )
  );

  collect(
    await takeSection(
      'memories',
      () =>
        db
          .select({
            type: memoryItems.type,
            content: memoryItems.content,
            confidence: memoryItems.confidence,
            createdAt: memoryItems.createdAt,
            lastRecalledAt: memoryItems.lastRecalledAt,
          })
          .from(memoryItems)
          .where(eq(memoryItems.userId, userId))
          .orderBy(desc(memoryItems.createdAt))
          .limit(EXPORT_LIMITS.memories + 1),
      EXPORT_LIMITS.memories
    )
  );

  collect(
    await takeSection(
      'screentime',
      () =>
        db
          .select({
            date: screenTimeLogs.date,
            sessionStart: screenTimeLogs.sessionStart,
            sessionEnd: screenTimeLogs.sessionEnd,
            durationSeconds: screenTimeLogs.durationSeconds,
          })
          .from(screenTimeLogs)
          .where(eq(screenTimeLogs.userId, userId))
          .orderBy(desc(screenTimeLogs.date))
          .limit(EXPORT_LIMITS.screentime + 1),
      EXPORT_LIMITS.screentime
    )
  );

  collect(
    await takeSection(
      'pomodoro',
      () =>
        db
          .select({
            durationMinutes: pomodoroSessions.durationMinutes,
            completedAt: pomodoroSessions.completedAt,
            wasCompleted: pomodoroSessions.wasCompleted,
          })
          .from(pomodoroSessions)
          .where(eq(pomodoroSessions.userId, userId))
          .orderBy(desc(pomodoroSessions.completedAt))
          .limit(EXPORT_LIMITS.pomodoro + 1),
      EXPORT_LIMITS.pomodoro
    )
  );

  collect(
    await takeSection(
      'garden',
      () =>
        db
          .select({
            potIndex: gardenPots.potIndex,
            plantId: gardenPots.plantId,
            stage: gardenPots.stage,
            hydration: gardenPots.hydration,
            plantedAt: gardenPots.plantedAt,
          })
          .from(gardenPots)
          .where(eq(gardenPots.userId, userId))
          .limit(EXPORT_LIMITS.garden + 1),
      EXPORT_LIMITS.garden
    )
  );

  return buildExportBundle({ sections, failures, truncated });
}

export interface DeleteAccountResult {
  deletedChats: number;
  deletedMemories: number;
  ok: boolean;
}

/**
 * Hapus akun user dan SELURUH data terkait.
 *
 * Urutan penting:
 *   1. Hitung & hapus memori dulu (untuk laporan jujur ke user).
 *   2. Hapus baris `users` — semua tabel anak cascade dari sini.
 *   3. Audit SETELAH berhasil.
 *
 * Kalau langkah 2 gagal, user TIDAK terhapus dan error dilempar: lebih baik
 * user melihat "gagal menghapus" daripada melihat "berhasil" sementara datanya
 * masih ada.
 */
export async function deleteUserAccount(userId: string): Promise<DeleteAccountResult> {
  // Hitung dulu: setelah `users` dihapus, baris anak sudah tidak bisa dihitung.
  let deletedMemories = 0;
  let deletedChats = 0;

  try {
    const memories = await db
      .delete(memoryItems)
      .where(eq(memoryItems.userId, userId))
      .returning({ id: memoryItems.id });
    deletedMemories = memories.length;
  } catch {
    // Tabel memori mungkin belum ada; cascade akan menanganinya kalau ada.
  }

  try {
    const chats = await db
      .delete(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .returning({ id: chatMessages.id });
    deletedChats = chats.length;
  } catch {
    // Sama seperti di atas.
  }

  const deletedUsers = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (deletedUsers.length === 0) {
    logger.warn('account.delete_not_found', { userId });
    return { deletedChats: 0, deletedMemories: 0, ok: false };
  }

  logger.info('account.deleted', { userId, deletedChats, deletedMemories });

  return { deletedChats, deletedMemories, ok: true };
}

/** Hapus semua memori saja (dipakai panel memori & Privacy Center). */
export async function deleteUserMemories(userId: string): Promise<number> {
  const rows = await db
    .delete(memoryItems)
    .where(eq(memoryItems.userId, userId))
    .returning({ id: memoryItems.id });

  return rows.length;
}

/**
 * Apakah user sudah melewati age gate (M4.1).
 *
 * Mengembalikan `null` kalau statusnya TIDAK DIKETAHUI — misalnya kolom
 * `age_confirmed_at` belum ada karena `db:push` belum dijalankan, atau DB
 * sedang tidak bisa dihubungi.
 *
 * Kenapa `null` dan bukan `false`: gate ini memblokir seluruh aplikasi. Kalau
 * kegagalan baca diperlakukan sebagai "belum konfirmasi", satu migrasi yang
 * belum dijalankan akan mengunci semua user di balik modal yang tombolnya
 * selalu gagal. Tidak bisa memverifikasi ≠ terbukti belum dewasa.
 */
export async function hasConfirmedAge(userId: string): Promise<boolean | null> {
  try {
    const rows = await db
      .select({ ageConfirmedAt: users.ageConfirmedAt })
      .from(users)
      .where(eq(users.id, userId));

    if (!rows[0]) return null;
    return Boolean(rows[0].ageConfirmedAt);
  } catch {
    return null;
  }
}

/** Tandai age gate sudah dikonfirmasi. Idempoten: konfirmasi ulang tidak apa. */
export async function confirmAge(userId: string): Promise<Date> {
  const now = new Date();

  await db.update(users).set({ ageConfirmedAt: now }).where(eq(users.id, userId));

  return now;
}
