/**
 * Gamifikasi quest harian server-validated (M8.4).
 *
 * Migrasi dari `lib/livia/quests.ts` (localStorage) ke otoritas server.
 * Katalog quest & konstanta dibagikan dengan versi lama lewat
 * `lib/livia/quests.pool.ts` supaya ada satu sumber definisi.
 *
 * Aturan server:
 * - Progress = jumlah aksi yang BENAR-BENAR tercatat di DB hari itu.
 * - Klaim quest = idempoten (unique index userId+date+questId), reward Rv
 *   diberikan sekali. Klaim tanpa progress cukup → ditolak (anti-cheat).
 * - Milestone 3/6/9 = idempoten, reward Rv (dan afeksi di 9) sekali.
 * - `date` = tanggal lokal user (dihitung dari offset browser).
 */
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { dailyQuests, userProfiles } from '@/lib/db/schema';
import { moneyPlusExpr } from '@/lib/livia/atomic-profile';
import { getDailyQuests, type DailyQuest } from '@/lib/livia/quests.pool';

export const QUEST_COUNT_PER_DAY = 9;
export const MILESTONES = [
  { points: 3, rv: 100, affection: 0 },
  { points: 6, rv: 300, affection: 0 },
  { points: 9, rv: 500, affection: 3 },
] as const;

/** Kunci aksi yang bisa direkam server. */
export const ALLOWED_ACTIONS = new Set<string>([
  // visit route dari QuestTracker
  'visit_home',
  'visit_radio',
  'visit_bedroom',
  'visit_wardrobe',
  'visit_shop',
  'visit_inventory',
  'visit_story',
  'visit_lounge',
  'visit_call',
  'visit_album',
  'visit_pomodoro',
  'visit_settings',
  'visit_date',
  'visit_work',
  'visit_kitchen',
  'visit_garden',
  // aksi interaksi
  'touch_livia',
  // tool chat M8.3
  'tool_create_reminder',
  'tool_add_shopping_item',
  'tool_list_shopping_items',
]);

export interface QuestDayState {
  date: string;
  quests: DailyQuest[];
  progress: Record<string, number>;
  claimedQuestIds: string[];
  claimedMilestones: number[];
  /** Skor = jumlah quest unik yang sudah diklaim hari ini. */
  completedCount: number;
}

/** Ambil quest (katalog acak per tanggal — deterministik). */
export function questsForDate(date: string): DailyQuest[] {
  return getDailyQuests(date).slice(0, QUEST_COUNT_PER_DAY);
}

/** Tanggal server (UTC). Default untuk aksi yang tidak membawa tanggal. */
export function utcToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Catat satu aksi (idempoten per hari; count di-increment atomik). */
export async function recordQuestActionServer(
  userId: string,
  date: string,
  action: string
): Promise<void> {
  if (!ALLOWED_ACTIONS.has(action)) return;

  await db
    .insert(dailyQuests)
    .values({ userId, date, action, count: 1 })
    .onConflictDoUpdate({
      target: [dailyQuests.userId, dailyQuests.date, dailyQuests.action],
      set: {
        count: sql`${dailyQuests.count} + 1`,
        updatedAt: new Date(),
      },
    });
}

/** Baca state quest satu hari dari server. */
export async function getQuestDayState(userId: string, date: string): Promise<QuestDayState> {
  const rows = await db
    .select()
    .from(dailyQuests)
    .where(and(eq(dailyQuests.userId, userId), eq(dailyQuests.date, date)));

  const quests = questsForDate(date);
  const progress: Record<string, number> = {};
  const claimedQuestIds: string[] = [];
  const claimedMilestones: number[] = [];

  for (const row of rows) {
    if (row.questId) {
      claimedQuestIds.push(row.questId);
    }
    if (row.milestone !== null && row.milestone !== undefined) {
      claimedMilestones.push(row.milestone);
    }
    if (row.action && !row.questId && row.milestone === null) {
      progress[row.action] = row.count;
    }
  }

  return {
    date,
    quests,
    progress,
    claimedQuestIds,
    claimedMilestones,
    completedCount: claimedQuestIds.length,
  };
}

/**
 * Klaim reward quest. Idempoten & anti-cheat: butuh count >= required & belum
 * diklaim. Mengembalikan `null` kalau ditolak (progress cukup/ sudah klaim).
 */
export async function claimQuestRewardServer(
  userId: string,
  date: string,
  questId: string
): Promise<{ ok: boolean; reason?: 'already_claimed' | 'insufficient' | 'unknown_quest'; rv?: number }> {
  const quest = questsForDate(date).find((q) => q.id === questId);
  if (!quest) return { ok: false, reason: 'unknown_quest' };

  const rows = await db
    .select()
    .from(dailyQuests)
    .where(and(eq(dailyQuests.userId, userId), eq(dailyQuests.date, date), eq(dailyQuests.action, quest.targetAction)));

  const count = rows[0]?.count ?? 0;
  if (count < quest.required) return { ok: false, reason: 'insufficient' };

  // Idempoten: cek baris klaim sudah ada.
  const existing = await db
    .select({ id: dailyQuests.id })
    .from(dailyQuests)
    .where(and(eq(dailyQuests.userId, userId), eq(dailyQuests.date, date), eq(dailyQuests.questId, questId)));

  if (existing.length > 0) return { ok: false, reason: 'already_claimed' };

  // Reward +15 Rv.
  await db
    .update(userProfiles)
    .set({ money: moneyPlusExpr(15), lastSeen: new Date() })
    .where(eq(userProfiles.userId, userId));

  await db.insert(dailyQuests).values({ userId, date, action: quest.targetAction, questId, count: rows[0]?.count ?? 0 });

  return { ok: true, rv: 15 };
}

/**
 * Klaim milestone (3/6/9). Idempoten. Reward Rv + afeksi (di 9).
 */
export async function claimQuestMilestoneServer(
  userId: string,
  date: string,
  milestonesPoints: number
): Promise<{
  ok: boolean;
  reason?: 'unknown_milestone' | 'insufficient' | 'already_claimed';
  rv?: number;
  affection?: number;
}> {
  const milestone = MILESTONES.find((m) => m.points === milestonesPoints);
  if (!milestone) return { ok: false, reason: 'unknown_milestone' };

  const state = await getQuestDayState(userId, date);
  if (state.completedCount < milestone.points) return { ok: false, reason: 'insufficient' };

  if (state.claimedMilestones.includes(milestone.points)) {
    return { ok: false, reason: 'already_claimed' };
  }

  // Reward Rv.
  await db
    .update(userProfiles)
    .set({ money: moneyPlusExpr(milestone.rv), lastSeen: new Date() })
    .where(eq(userProfiles.userId, userId));

  if (milestone.affection > 0) {
    // Afeksi +3 atomik.
    await db
      .update(userProfiles)
      .set({
        affection: sql`GREATEST(0, LEAST(100, ${userProfiles.affection} + ${milestone.affection}))`,
      })
      .where(eq(userProfiles.userId, userId));
  }

  await db.insert(dailyQuests).values({
    userId,
    date,
    action: `milestone_${milestone.points}`,
    milestone: milestone.points,
    count: state.completedCount,
  });

  return { ok: true, rv: milestone.rv, affection: milestone.affection };
}
