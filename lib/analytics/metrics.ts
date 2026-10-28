/**
 * Komputasi analitik murni (M7.2).
 *
 * Semua fungsi di file ini TIDAK menyentuh DB — input = data mentah, output
 * = angka siap tampil. Ini membuat retensi D1/D7/D30, sessionization, dan
 * drop-off onboarding bisa di-unit-test penuh (pola codebase: fungsi DB
 * tidak di-unit-test, fungsi murni ya).
 *
 * Konvensi waktu: semua "hari" adalah string `YYYY-MM-DD` dalam **UTC**
 * (epoch-aligned, sama dengan `dayBucketUtc()` di `lib/ai/usage`).
 * Perbandingan string YYYY-MM-DD = perbandingan kronologis yang benar.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Gap antar-pesan yang masih dianggap satu sesi chat: 30 menit. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Tambah N hari ke sebuah tanggal `YYYY-MM-DD` (aritmika UTC, aman Dst — UTC tidak punya). */
export function addDays(day: string, n: number): string {
  const t = new Date(`${day}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** Awal minggu ISO (Senin) dari sebuah tanggal `YYYY-MM-DD`. */
export function weekStartDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Senin = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Umur sebuah tanggal dalam hari kalender UTC relatif `asOf`. */
export function ageDays(createdDay: string, asOf: string): number {
  const a = new Date(`${asOf}T00:00:00Z`).getTime();
  const c = new Date(`${createdDay}T00:00:00Z`).getTime();
  return Math.round((a - c) / DAY_MS);
}

// ---------------------------------------------------------------------------
// Sessionization
// ---------------------------------------------------------------------------

export interface ActivityMessage {
  userId: string;
  role: 'user' | 'livia';
  /** Epoch millis. */
  ts: number;
}

export interface UserSession {
  userId: string;
  start: number;
  end: number;
  userMessages: number;
  liviaMessages: number;
}

/**
 * Pecah pesan per user menjadi sesi.
 *
 * Aturan: pesan berurutan dari user yang sama yang jaraknya **<= SESSION_GAP_MS**
 * termasuk satu sesi; gap lebih besar membuka sesi baru. Role `livia` ikut
 * dihitung ke sesi aktif karena balasan Livia selalu berada di dalam rentang
 * gap yang sama dengan pesan user-nya.
 *
 * Input tidak perlu terurut — di-sort internal per user.
 */
export function sessionize(messages: ActivityMessage[]): UserSession[] {
  const byUser = new Map<string, ActivityMessage[]>();
  for (const m of messages) {
    const arr = byUser.get(m.userId);
    if (arr) arr.push(m);
    else byUser.set(m.userId, [m]);
  }

  const out: UserSession[] = [];
  for (const [userId, msgs] of byUser) {
    msgs.sort((a, b) => a.ts - b.ts);
    let cur: UserSession | null = null;
    for (const m of msgs) {
      if (cur && m.ts - cur.end <= SESSION_GAP_MS) {
        cur.end = m.ts;
        if (m.role === 'user') cur.userMessages += 1;
        else cur.liviaMessages += 1;
      } else {
        if (cur) out.push(cur);
        cur = {
          userId,
          start: m.ts,
          end: m.ts,
          userMessages: m.role === 'user' ? 1 : 0,
          liviaMessages: m.role === 'livia' ? 1 : 0,
        };
      }
    }
    if (cur) out.push(cur);
  }
  return out;
}

export interface SessionStats {
  sessions: number;
  totalUserMessages: number;
  totalLiviaMessages: number;
  avgUserMessagesPerSession: number;
  medianUserMessagesPerSession: number;
  p90UserMessagesPerSession: number;
  /**
   * Fraksi sesi yang hanya memuat SATU pesan user ("datang sekali, pergi") —
   * proxy drop-off percakapan. 0 saat tidak ada sesi.
   */
  singleMessageSessionRate: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx];
}

/** Statistik agregat dari hasil `sessionize`. */
export function sessionStats(sessions: UserSession[]): SessionStats {
  if (sessions.length === 0) {
    return {
      sessions: 0,
      totalUserMessages: 0,
      totalLiviaMessages: 0,
      avgUserMessagesPerSession: 0,
      medianUserMessagesPerSession: 0,
      p90UserMessagesPerSession: 0,
      singleMessageSessionRate: 0,
    };
  }
  const counts = sessions.map((s) => s.userMessages).sort((a, b) => a - b);
  const sum = counts.reduce((a, b) => a + b, 0);
  return {
    sessions: sessions.length,
    totalUserMessages: sum,
    totalLiviaMessages: sessions.reduce((a, s) => a + s.liviaMessages, 0),
    avgUserMessagesPerSession: sum / sessions.length,
    medianUserMessagesPerSession: percentile(counts, 0.5),
    p90UserMessagesPerSession: percentile(counts, 0.9),
    singleMessageSessionRate: counts.filter((c) => c === 1).length / sessions.length,
  };
}

// ---------------------------------------------------------------------------
// Retensi kohort
// ---------------------------------------------------------------------------

export interface CohortUser {
  userId: string;
  /** Hari pembuatan akun, `YYYY-MM-DD` UTC. */
  createdDay: string;
}

export interface CohortRow {
  /** Hari kohort (group 'day') atau awal minggu ISO (group 'week'). */
  cohort: string;
  users: number;
  /** Fraksi 0..1 user kohort yang aktif tepat di D+1, atau null bila belum matang. */
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

/**
 * Retensi kohort D1/D7/D30.
 *
 * Definisi (disengaja eksplisit, bukan "dalam N hari pertama"): user dianggap
 * D+N-retained bila ada baris `userActivityDaily` pada **hari eksak** createdDay+N.
 * Metrik yang hari targetnya masih di masa depan relatif `asOf` (UTC) = belum
 * matang → `null`, dan TIDAK ikut dalam penyebut persentase (cohort hari ini
 * tidak boleh terlihat "retensi 0%").
 *
 * `groupBy: 'week'` menggabungkan kohort per awal-minggu ISO, dihitung
 * per-user dulu lalu digabung (bukan rata-rata dari rata-rata harian —
 * pembobotan jumlah user tetap benar).
 */
export function retentionCohorts(
  users: CohortUser[],
  activeByUser: Map<string, Set<string>>,
  asOf: string,
  groupBy: 'day' | 'week'
): CohortRow[] {
  interface Acc {
    users: number;
    d1n: number;
    d1t: number;
    d7n: number;
    d7t: number;
    d30n: number;
    d30t: number;
  }
  const groups = new Map<string, Acc>();

  for (const u of users) {
    const key = groupBy === 'week' ? weekStartDay(u.createdDay) : u.createdDay;
    let acc = groups.get(key);
    if (!acc) {
      acc = { users: 0, d1n: 0, d1t: 0, d7n: 0, d7t: 0, d30n: 0, d30t: 0 };
      groups.set(key, acc);
    }
    acc.users += 1;

    const activeDays = activeByUser.get(u.userId);
    const check = (offset: number) => {
      const target = addDays(u.createdDay, offset);
      if (target > asOf) return; // belum matang
      const hit = activeDays?.has(target) === true;
      if (offset === 1) {
        acc.d1t += 1;
        if (hit) acc.d1n += 1;
      } else if (offset === 7) {
        acc.d7t += 1;
        if (hit) acc.d7n += 1;
      } else {
        acc.d30t += 1;
        if (hit) acc.d30n += 1;
      }
    };
    check(1);
    check(7);
    check(30);
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([cohort, a]) => ({
      cohort,
      users: a.users,
      d1: a.d1t > 0 ? a.d1n / a.d1t : null,
      d7: a.d7t > 0 ? a.d7n / a.d7t : null,
      d30: a.d30t > 0 ? a.d30n / a.d30t : null,
    }));
}

export interface WeightedRetention {
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

/**
 * Rata-rata tertimbang jumlah-user lintas seluruh user (bukan rata-rata
 * dari baris harian) — user dari kohort besar berbobot lebih besar.
 * Metrik null bila belum ada user yang matang untuk offset itu.
 */
export function weightedCohortRetention(
  users: CohortUser[],
  activeByUser: Map<string, Set<string>>,
  asOf: string
): WeightedRetention {
  let d1n = 0,
    d1t = 0,
    d7n = 0,
    d7t = 0,
    d30n = 0,
    d30t = 0;
  for (const u of users) {
    const activeDays = activeByUser.get(u.userId);
    const check = (offset: number) => {
      const target = addDays(u.createdDay, offset);
      if (target > asOf) return;
      const hit = activeDays?.has(target) === true;
      if (offset === 1) {
        d1t += 1;
        if (hit) d1n += 1;
      } else if (offset === 7) {
        d7t += 1;
        if (hit) d7n += 1;
      } else {
        d30t += 1;
        if (hit) d30n += 1;
      }
    };
    check(1);
    check(7);
    check(30);
  }
  return {
    d1: d1t > 0 ? d1n / d1t : null,
    d7: d7t > 0 ? d7n / d7t : null,
    d30: d30t > 0 ? d30n / d30t : null,
  };
}

// ---------------------------------------------------------------------------
// Drop-off onboarding
// ---------------------------------------------------------------------------

export interface OnboardingUser {
  createdDay: string;
  done: boolean;
}

export interface OnboardingBucket {
  bucket: 'today' | '1' | '2' | '3-6' | '7+';
  created: number;
  done: number;
}

const BUCKET_ORDER: OnboardingBucket['bucket'][] = ['today', '1', '2', '3-6', '7+'];

/**
 * Drop-off onboarding per umur akun.
 *
 * Bucket umur (hari kalender UTC): `today` (baru dibuat hari ini), `1`, `2`,
 * `3-6`, `7+`. User yang `done` = onboarding-nya selesai kapan pun; bucket
 * menunjukkan umur saat dilihat, bukan umur saat seharusnya selesai.
 */
export function onboardingDropoff(users: OnboardingUser[], asOf: string): OnboardingBucket[] {
  const buckets = new Map<OnboardingBucket['bucket'], { created: number; done: number }>();
  for (const b of BUCKET_ORDER) buckets.set(b, { created: 0, done: 0 });

  for (const u of users) {
    const age = ageDays(u.createdDay, asOf);
    let bucket: OnboardingBucket['bucket'];
    if (age <= 0) bucket = 'today';
    else if (age === 1) bucket = '1';
    else if (age === 2) bucket = '2';
    else if (age <= 6) bucket = '3-6';
    else bucket = '7+';
    const acc = buckets.get(bucket)!;
    acc.created += 1;
    if (u.done) acc.done += 1;
  }

  return BUCKET_ORDER.map((bucket) => ({ bucket, ...buckets.get(bucket)! }));
}

// ---------------------------------------------------------------------------
// Tren harian
// ---------------------------------------------------------------------------

export interface DailyPoint {
  day: string;
  /** User yang punya baris aktivitas pada hari itu. */
  activeUsers: number;
  /** User yang membuat akun pada hari itu. */
  newUsers: number;
  /** Jumlah pesan `user` pada hari itu (bukan balasan Livia). */
  userMessages: number;
}

/**
 * Tren harian untuk N hari terakhir (termasuk `asOf`).
 * `dayToUserMessages`: pemetaan hari -> jumlah pesan user (di-build oleh
 * pemanggil dari data chatMessages).
 */
export function dailySeries(
  activeByUser: Map<string, Set<string>>,
  newUsersByDay: Map<string, number>,
  dayToUserMessages: Map<string, number>,
  days: number,
  asOf: string
): DailyPoint[] {
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = addDays(asOf, -i);
    let active = 0;
    for (const daysSet of activeByUser.values()) {
      if (daysSet.has(day)) active += 1;
    }
    out.push({
      day,
      activeUsers: active,
      newUsers: newUsersByDay.get(day) ?? 0,
      userMessages: dayToUserMessages.get(day) ?? 0,
    });
  }
  return out;
}
