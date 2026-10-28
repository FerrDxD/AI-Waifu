/**
 * Kueri analitik product (M7.2) — dashboard `/analytics`.
 *
 * Fungsi DB: sengaja TIDAK di-unit-test (pola codebase — lihat
 * `tests/tts-cache.test.ts` / `tests/usage-route.test.ts`); logika hitungnya
 * semuanya di `./metrics` (murni, teruji). File ini hanya: ambil data mentah
 * dari Neon (tabel-tabel kecil — skala app kecil, fetch lalu hitung di memori
 * lebih sederhana dan cukup cepat), lalu serahkan ke fungsi murni.
 *
 * Jendela (disengaja tetap, tanpa parameter query):
 *  - Retensi: kohort 28 hari terakhir (D30 kohort terlama perlu data aktivitas
 *    30 hari setelahnya → jendela aktivitas = 28 + 31 hari).
 *  - Sesi & tren: 28 hari terakhir (chatMessages punya retensi 90 hari, cukup).
 */
import { gte } from 'drizzle-orm';

import { db } from '@/lib/db';
import { chatMessages, userActivityDaily, userProfiles, users } from '@/lib/db/schema';
import { dayBucketUtc } from '@/lib/ai/usage';
import {
  dailySeries,
  dayKey,
  onboardingDropoff,
  retentionCohorts,
  sessionize,
  sessionStats,
  weightedCohortRetention,
  type CohortRow,
  type DailyPoint,
  type OnboardingBucket,
  type SessionStats,
  type WeightedRetention,
} from './metrics';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Kohort & jendela sesi: 28 hari terakhir. */
export const ANALYTICS_WINDOW_DAYS = 28;
/** Tren harian yang ditampilkan: 14 hari terakhir. */
export const ANALYTICS_TREND_DAYS = 14;
/** Baris kohort mingguan yang ditampilkan. */
export const ANALYTICS_WEEKS = 8;

export interface AnalyticsOverview {
  /** Hari "sekarang" (UTC) — basis semua perbandingan umur. */
  asOf: string;
  retention: {
    /** Kohort mingguan (akhir minggu ISO), terlama → terbaru. */
    weekly: CohortRow[];
    /** Rata-rata tertimbang jumlah-user lintas semua user matang. */
    weighted: WeightedRetention;
  };
  sessions: SessionStats;
  onboarding: {
    buckets: OnboardingBucket[];
    totalCreated: number;
    totalDone: number;
    /** 0..1; 0 bila belum ada user. */
    completionRate: number;
    /** User yang pernah membuat akun tapi tidak pernah chat (seumur data, ≤90 hari). */
    neverChatted: number;
  };
  trend: DailyPoint[];
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const asOfDate = dayBucketUtc();
  const asOf = dayKey(asOfDate);

  const windowDays = ANALYTICS_WINDOW_DAYS;
  // Aktivitas: perlu sampai D+30 kohort terlama yang ditampilkan.
  const activitySince = new Date(asOfDate.getTime() - (windowDays + 31) * DAY_MS);
  const messageSince = new Date(asOfDate.getTime() - windowDays * DAY_MS);

  const [userRows, profileRows, activityRows, messageRows, chattedRows] = await Promise.all([
    db.select({ id: users.id, createdAt: users.createdAt }).from(users),
    db.select({ userId: userProfiles.userId, onboardingDone: userProfiles.onboardingDone }).from(userProfiles),
    db
      .select({ userId: userActivityDaily.userId, day: userActivityDaily.day })
      .from(userActivityDaily)
      .where(gte(userActivityDaily.day, activitySince)),
    db
      .select({
        userId: chatMessages.userId,
        role: chatMessages.role,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(gte(chatMessages.createdAt, messageSince)),
    // "Pernah chat" = seumur data yang masih tersimpan (chatMessages di-prune
    // 90 hari) — documented approximation, cukup untuk drop-off. drizzle 0.30
    // tidak punya `.distinct()` di select builder → dedup di memori (tabel kecil).
    db.select({ userId: chatMessages.userId }).from(chatMessages),
  ]);

  // --- Normalisasi mentah → input fungsi murni ------------------------------
  const activeByUser = new Map<string, Set<string>>();
  for (const r of activityRows) {
    let set = activeByUser.get(r.userId);
    if (!set) {
      set = new Set<string>();
      activeByUser.set(r.userId, set);
    }
    set.add(dayKey(r.day));
  }

  const profileByUser = new Map<string, boolean>();
  for (const p of profileRows) profileByUser.set(p.userId, p.onboardingDone === true);

  const chatted = new Set<string>();
  for (const r of chattedRows) chatted.add(r.userId);

  // Baris dengan `createdAt` null (tidak seharusnya ada — defaultNow) dibuang
  // defensif: tanpa tanggal asal, user/pesan itu tidak bisa masuk kohort.
  const cohortUsers = userRows
    .filter((u) => u.createdAt !== null)
    .map((u) => ({
      userId: u.id,
      createdDay: dayKey(u.createdAt as Date),
    }));

  const newUsersByDay = new Map<string, number>();
  for (const u of cohortUsers) {
    newUsersByDay.set(u.createdDay, (newUsersByDay.get(u.createdDay) ?? 0) + 1);
  }

  const dayToUserMessages = new Map<string, number>();
  for (const m of messageRows) {
    if (m.role !== 'user' || m.createdAt === null) continue;
    const day = dayKey(m.createdAt);
    dayToUserMessages.set(day, (dayToUserMessages.get(day) ?? 0) + 1);
  }

  // --- Hitung (semua di metrics.ts) ------------------------------------------
  const weeklyAll = retentionCohorts(cohortUsers, activeByUser, asOf, 'week');
  const weekly = weeklyAll.slice(-ANALYTICS_WEEKS);

  const sessions = sessionStats(
    sessionize(
      messageRows
        .filter((m) => m.createdAt !== null)
        .map((m) => ({ userId: m.userId, role: m.role as 'user' | 'livia', ts: (m.createdAt as Date).getTime() }))
    )
  );

  const onboardingUsers = userRows
    .filter((u) => u.createdAt !== null)
    .map((u) => ({
      createdDay: dayKey(u.createdAt as Date),
      done: profileByUser.get(u.id) === true,
    }));
  const totalDone = onboardingUsers.filter((u) => u.done).length;
  const neverChatted = userRows.filter((u) => !chatted.has(u.id)).length;

  const overview: AnalyticsOverview = {
    asOf,
    retention: {
      weekly,
      weighted: weightedCohortRetention(cohortUsers, activeByUser, asOf),
    },
    sessions,
    onboarding: {
      buckets: onboardingDropoff(onboardingUsers, asOf),
      totalCreated: userRows.length,
      totalDone,
      completionRate: userRows.length > 0 ? totalDone / userRows.length : 0,
      neverChatted,
    },
    trend: dailySeries(activeByUser, newUsersByDay, dayToUserMessages, ANALYTICS_TREND_DAYS, asOf),
  };
  return overview;
}
