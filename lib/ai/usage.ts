import { desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { aiUsageDaily, aiUsageLogs, ttsUsage, users } from '@/lib/db/schema';
import { logger } from '@/lib/logger';
import { sendWebhookAlert } from '@/lib/alerting';
import { costMicrosFor, costUsd } from './pricing';

/**
 * Pencatatan pemakaian AI + agregasi untuk dashboard (M7.1).
 *
 * **Model data** (dua tabel, dua peran):
 *  - `aiUsageLogs` — SATU baris per request (provider, model, operasi,
 *    user, token in/out, biaya). Sumber kebenaran detail; retensi 30 hari
 *    via `db:prune`.
 *  - `aiUsageDaily` — agregasi global per hari (1 baris). Increment atomik
 *    per request, sumber alert budget, dan tidak pernah dihapus.
 *
 * **FAIL-OPEN** (pola `ttsUsage`/`rateLimitCounters`): pencatatan TIDAK
 * boleh pernah menggagalkan percakapan. Semua kegagalan di-`logger.error`
 * dan ditelan. Kalau pencatatannya mati, chat tetap jalan — yang hilang
 * hanya angka di dashboard.
 *
 * **Siapa yang mencatat**: layer domain (`lib/gemini.ts`, `lib/livia/*`)
 * yang memegang `userId` — BUKAN provider, yang netral terhadap DB.
 * Provider hanya mengembalikan `usage` di `GenerateResult`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Awal hari UTC (epoch-aligned) — bucket harian, identik `dayBucketNow` TTS. */
export function dayBucketUtc(now: Date = new Date()): Date {
  return new Date(Math.floor(now.getTime() / DAY_MS) * DAY_MS);
}

/** Default cap biaya AI per hari (USD) sebelum alert. */
export const DEFAULT_AI_DAILY_COST_LIMIT_USD = 5;

/**
 * Cap biaya AI per hari (global, semua user). Env
 * `AI_DAILY_COST_LIMIT_USD`; nilai tidak valid → default.
 */
export function aiDailyCostLimitUsd(): number {
  const raw = process.env.AI_DAILY_COST_LIMIT_USD;
  if (raw !== undefined) {
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_AI_DAILY_COST_LIMIT_USD;
}

/**
 * Keputusan alert budget, dipisah jadi fungsi murni supaya bisa diuji
 * tanpa DB: alert menyala persis saat baris harian LEBIH dari cap dan
 * stambel `capExceededAt` belum ada (satu alert per hari, bukan per
 * request).
 */
export function shouldAlertBudget(args: {
  costMicros: number;
  limitMicros: number;
  capExceededAt: Date | null;
}): boolean {
  return args.capExceededAt === null && args.costMicros > args.limitMicros;
}

export interface AiUsageEntry {
  userId: string;
  provider: string;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  /** `true` kalau memakai API key pribadi user (biaya bukan beban server). */
  userKey?: boolean;
}

/**
 * Catat satu request AI: baris log per-request + increment agregasi
 * harian, lalu cek alert budget. Fire-and-forget dari pemanggil —
 * kegagalan tidak pernah ditolak keluar fungsi ini.
 */
export async function recordAiUsage(entry: AiUsageEntry): Promise<void> {
  const day = dayBucketUtc();
  const costMicros = costMicrosFor(entry.model, entry.inputTokens, entry.outputTokens);
  const limitMicros = Math.round(aiDailyCostLimitUsd() * 1_000_000);

  try {
    await db
      .insert(aiUsageLogs)
      .values({
        userId: entry.userId,
        provider: entry.provider,
        model: entry.model,
        operation: entry.operation,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        costMicros,
        userKey: entry.userKey ?? false,
      });

    // Agregasi harian dalam statement atomik; `.returning()` memberi total
    // hasil increment — jadi cek alert tanpa query tambahan.
    const rows = await db
      .insert(aiUsageDaily)
      .values({
        day,
        requests: 1,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        costMicros,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiUsageDaily.day,
        set: {
          requests: sql`${aiUsageDaily.requests} + 1`,
          inputTokens: sql`${aiUsageDaily.inputTokens} + ${entry.inputTokens}`,
          outputTokens: sql`${aiUsageDaily.outputTokens} + ${entry.outputTokens}`,
          costMicros: sql`${aiUsageDaily.costMicros} + ${costMicros}`,
          updatedAt: new Date(),
        },
      })
      .returning({ costMicros: aiUsageDaily.costMicros, capExceededAt: aiUsageDaily.capExceededAt });

    const row = rows[0];
    if (row && shouldAlertBudget({ costMicros: row.costMicros, limitMicros, capExceededAt: row.capExceededAt })) {
      // Stempel sekali per hari supaya warning tidak spam di log.
      await db.update(aiUsageDaily).set({ capExceededAt: new Date() }).where(eq(aiUsageDaily.day, day));
      logger.warn('ai.budget_alert', {
        day: day.toISOString().slice(0, 10),
        costUsd: costUsd(row.costMicros),
        limitUsd: limitMicros / 1_000_000,
      });

      // M7.5: alert keluar dari log (menghapus utang M7.1). `sendWebhookAlert`
      // fail-open + timeout 3 dtk; gagal kirim tidak membatalkan pencatatan.
      const delivered = await sendWebhookAlert('Cap biaya AI harian terlampaui — Livia', [
        `Hari: ${day.toISOString().slice(0, 10)}`,
        `Biaya: $${costUsd(row.costMicros)} (cap $${(limitMicros / 1_000_000).toFixed(2)})`,
        'Cek dashboard /usage.',
      ]);
      if (!delivered.sent) {
        logger.warn('ai.budget_alert_webhook_not_delivered (fail-open)', {
          reason: delivered.reason,
        });
      }
    }
  } catch (error) {
    // FAIL-OPEN: pencatatan down tidak boleh menggagalkan percakapan.
    logger.error('ai_usage.record_failed (fail-open)', {
      operation: entry.operation,
      model: entry.model,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Catat pemakaian dari hasil provider (M7.1). Fire-and-forget:
 * `void recordProviderUsage(...)` di call site.
 *
 * Skip sunyi kalau: hasil tidak membawa `usage` (SDK tidak memberi
 * metadata — bukan kesalahan) atau pemanggil tidak punya `userId`
 * (colom log notNull). Tidak pernah melempar.
 */
export function recordProviderUsage(
  result: { usage?: { inputTokens: number; outputTokens: number } | null; model: string },
  meta: { userId?: string; provider: string; operation: string; userKey?: boolean }
): void {
  if (!result.usage || !meta.userId) return;
  void recordAiUsage({
    userId: meta.userId,
    provider: meta.provider,
    model: result.model,
    operation: meta.operation,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    userKey: meta.userKey,
  });
}

// --- Kueri dashboard ---------------------------------------------------------

export interface DailyUsageRow {
  day: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
  capExceededAt: string | null;
}

export interface UsageOverview {
  /** Rentang hari yang ditampilkan. */
  days: number;
  /** Agregasi harian (tanggal terlama → terbaru). */
  daily: DailyUsageRow[];
  byOperation: Array<{
    operation: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costMicros: number;
  }>;
  byModel: Array<{
    model: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costMicros: number;
  }>;
  byUser: Array<{
    userId: string;
    email: string | null;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costMicros: number;
    /** Berapa request yang memakai API key pribadi (biaya bukan beban server). */
    userKeyRequests: number;
  }>;
  /** TTS (ElevenLabs) — dicatat terpisah per karakter di `ttsUsage` (M6.4). */
  tts: { requests: number; cacheHits: number; cacheHitRate: number; charsBilled: number };
  /** Status budget hari ini. */
  budget: { limitUsd: number; todayCostUsd: number; exceededAt: string | null };
}

/**
 * Ambil seluruh angka untuk dashboard `/usage` (rentang N hari terakhir,
 * default 14). Kuerinya tipis (tabel kecil: log di-prune 30 hari, agregasi
 * 1 baris/hari) — tidak perlu cache. Error DB dilempar ke route (ini
 * read-only untuk owner; tidak ada alasan fail-open di sini).
 */
export async function getUsageOverview(options: { days?: number } = {}): Promise<UsageOverview> {
  // Defensive: NaN/nilai tidak valid jatuh ke default 14 (bukan jendela rusak).
  const requested = options.days ?? 14;
  const days = Number.isFinite(requested) ? Math.min(90, Math.max(1, Math.trunc(requested))) : 14;
  const since = dayBucketUtc(new Date(Date.now() - (days - 1) * DAY_MS));

  const [daily, byOperation, byModel, byUser, tts] = await Promise.all([
    db
      .select()
      .from(aiUsageDaily)
      .where(gte(aiUsageDaily.day, since))
      .orderBy(sql`${aiUsageDaily.day} asc`),
    db
      .select({
        operation: aiUsageLogs.operation,
        requests: sql<number>`count(*)`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)`,
        costMicros: sql<number>`coalesce(sum(${aiUsageLogs.costMicros}), 0)`,
      })
      .from(aiUsageLogs)
      .where(gte(aiUsageLogs.createdAt, new Date(since.getTime())))
      .groupBy(aiUsageLogs.operation)
      .orderBy(desc(sql<number>`coalesce(sum(${aiUsageLogs.costMicros}), 0)`)),
    db
      .select({
        model: aiUsageLogs.model,
        requests: sql<number>`count(*)`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)`,
        costMicros: sql<number>`coalesce(sum(${aiUsageLogs.costMicros}), 0)`,
      })
      .from(aiUsageLogs)
      .where(gte(aiUsageLogs.createdAt, new Date(since.getTime())))
      .groupBy(aiUsageLogs.model)
      .orderBy(desc(sql<number>`coalesce(sum(${aiUsageLogs.costMicros}), 0)`)),
    db
      .select({
        userId: aiUsageLogs.userId,
        email: sql<string>`any_value(${users.email})`,
        requests: sql<number>`count(*)`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)`,
        costMicros: sql<number>`coalesce(sum(${aiUsageLogs.costMicros}), 0)`,
        userKeyRequests: sql<number>`coalesce(sum(case when ${aiUsageLogs.userKey} then 1 else 0 end), 0)`,
      })
      .from(aiUsageLogs)
      .leftJoin(users, eq(aiUsageLogs.userId, users.id))
      .where(gte(aiUsageLogs.createdAt, new Date(since.getTime())))
      .groupBy(aiUsageLogs.userId)
      .orderBy(desc(sql<number>`coalesce(sum(${aiUsageLogs.costMicros}), 0)`))
      .limit(20),
    db
      .select({
        requests: sql<number>`coalesce(sum(${ttsUsage.requests}), 0)`,
        cacheHits: sql<number>`coalesce(sum(${ttsUsage.cacheHits}), 0)`,
        charsBilled: sql<number>`coalesce(sum(${ttsUsage.charsBilled}), 0)`,
      })
      .from(ttsUsage)
      .where(gte(ttsUsage.day, since)),
  ]);

  const toNum = (v: unknown): number => {
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isFinite(n as number) ? (n as number) : 0;
  };

  const dailyRows: DailyUsageRow[] = daily.map((row) => ({
    day: row.day.toISOString().slice(0, 10),
    requests: row.requests,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costMicros: row.costMicros,
    capExceededAt: row.capExceededAt ? row.capExceededAt.toISOString() : null,
  }));

  const todayKey = dayBucketUtc().toISOString().slice(0, 10);
  const today = dailyRows.find((row) => row.day === todayKey);
  const ttsRow = tts[0] ?? { requests: 0, cacheHits: 0, charsBilled: 0 };

  return {
    days,
    daily: dailyRows,
    byOperation: byOperation.map((row) => ({
      operation: row.operation,
      requests: toNum(row.requests),
      inputTokens: toNum(row.inputTokens),
      outputTokens: toNum(row.outputTokens),
      costMicros: toNum(row.costMicros),
    })),
    byModel: byModel.map((row) => ({
      model: row.model,
      requests: toNum(row.requests),
      inputTokens: toNum(row.inputTokens),
      outputTokens: toNum(row.outputTokens),
      costMicros: toNum(row.costMicros),
    })),
    byUser: byUser.map((row) => ({
      userId: row.userId,
      email: row.email ?? null,
      requests: toNum(row.requests),
      inputTokens: toNum(row.inputTokens),
      outputTokens: toNum(row.outputTokens),
      costMicros: toNum(row.costMicros),
      userKeyRequests: toNum(row.userKeyRequests),
    })),
    tts: {
      requests: toNum(ttsRow.requests),
      cacheHits: toNum(ttsRow.cacheHits),
      cacheHitRate: ttsRow.requests > 0 ? ttsRow.cacheHits / ttsRow.requests : 0,
      charsBilled: toNum(ttsRow.charsBilled),
    },
    budget: {
      limitUsd: aiDailyCostLimitUsd(),
      todayCostUsd: costUsd(today?.costMicros ?? 0),
      exceededAt: today?.capExceededAt ?? null,
    },
  };
}
