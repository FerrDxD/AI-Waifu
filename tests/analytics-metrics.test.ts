import { describe, it, expect } from 'vitest';

import {
  SESSION_GAP_MS,
  addDays,
  ageDays,
  dailySeries,
  dayKey,
  onboardingDropoff,
  retentionCohorts,
  sessionStats,
  sessionize,
  weightedCohortRetention,
  weekStartDay,
  type ActivityMessage,
  type CohortUser,
} from '@/lib/analytics/metrics';

const MIN = 60_000;
const AS_OF = '2026-10-28'; // Rabu

const msg = (userId: string, role: 'user' | 'livia', ts: number): ActivityMessage => ({ userId, role, ts });

describe('helper tanggal (UTC)', () => {
  it('dayKey mengambil YYYY-MM-DD dari timestamp UTC', () => {
    expect(dayKey(new Date('2026-10-28T23:59:59Z'))).toBe('2026-10-28');
    expect(dayKey(new Date('2026-10-28T00:00:00Z'))).toBe('2026-10-28');
  });

  it('addDays melewati batas bulan & tahun', () => {
    expect(addDays('2026-10-28', 1)).toBe('2026-10-29');
    expect(addDays('2026-10-28', -1)).toBe('2026-10-27');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-01', 30)).toBe('2026-10-31');
  });

  it('weekStartDay menghasilkan Senin (ISO), Minggu termasuk minggu berjalan', () => {
    expect(weekStartDay('2026-10-28')).toBe('2026-10-26'); // Rabu → Senin
    expect(weekStartDay('2026-10-26')).toBe('2026-10-26'); // Senin → Senin
    expect(weekStartDay('2026-10-25')).toBe('2026-10-19'); // Minggu → Senin minggu ini
  });

  it('ageDays menghitung umur hari kalender', () => {
    expect(ageDays(AS_OF, AS_OF)).toBe(0);
    expect(ageDays('2026-10-27', AS_OF)).toBe(1);
    expect(ageDays('2026-10-01', AS_OF)).toBe(27);
  });
});

describe('sessionize', () => {
  it('pesan berurutan dalam gap 30 menit = satu sesi', () => {
    const sessions = sessionize([
      msg('u1', 'user', 0),
      msg('u1', 'livia', 10 * MIN),
      msg('u1', 'user', 20 * MIN),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      userId: 'u1',
      start: 0,
      end: 20 * MIN,
      userMessages: 2,
      liviaMessages: 1,
    });
  });

  it('gap > 30 menit membuka sesi baru; tepat 30 menit masih satu sesi', () => {
    const split = sessionize([
      msg('u1', 'user', 0),
      msg('u1', 'user', 20 * MIN),
      // 20 → 55 menit = gap 35 menit
      msg('u1', 'user', 55 * MIN),
    ]);
    expect(split).toHaveLength(2);
    expect(split[0]).toMatchObject({ userMessages: 2, end: 20 * MIN });
    expect(split[1]).toMatchObject({ userMessages: 1, start: 55 * MIN });

    const boundary = sessionize([
      msg('u1', 'user', 0),
      msg('u1', 'user', SESSION_GAP_MS),
    ]);
    expect(boundary).toHaveLength(1);
    expect(boundary[0].userMessages).toBe(2);
  });

  it('user berbeda tidak bercampur, walau pesan berselang waktu', () => {
    const sessions = sessionize([
      msg('u1', 'user', 0),
      msg('u2', 'user', 5 * MIN),
      msg('u1', 'user', 10 * MIN),
      msg('u2', 'user', 90 * MIN), // u2 mulai sesi ke-2
    ]);
    expect(sessions).toHaveLength(3);
    const u1 = sessions.filter((s) => s.userId === 'u1');
    const u2 = sessions.filter((s) => s.userId === 'u2');
    expect(u1).toHaveLength(1);
    expect(u1[0].userMessages).toBe(2);
    expect(u2).toHaveLength(2);
  });

  it('input tidak terurut tetap benar (di-sort internal)', () => {
    const sessions = sessionize([
      msg('u1', 'user', 20 * MIN),
      msg('u1', 'user', 0),
      msg('u1', 'livia', 10 * MIN),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ start: 0, end: 20 * MIN, userMessages: 2, liviaMessages: 1 });
  });

  it('input kosong → tidak ada sesi', () => {
    expect(sessionize([])).toEqual([]);
  });
});

describe('sessionStats', () => {
  it('input kosong → nol semua, tanpa NaN', () => {
    expect(sessionStats([])).toEqual({
      sessions: 0,
      totalUserMessages: 0,
      totalLiviaMessages: 0,
      avgUserMessagesPerSession: 0,
      medianUserMessagesPerSession: 0,
      p90UserMessagesPerSession: 0,
      singleMessageSessionRate: 0,
    });
  });

  it('avg/median/p90 & fraksi sesi pesan-1', () => {
    const sessions = sessionize([
      // 4 sesi: [1 pesan], [2], [3], [5]
      msg('a', 'user', 0),
      msg('b', 'user', 0),
      msg('b', 'user', 5 * MIN),
      msg('c', 'user', 0),
      msg('c', 'user', 5 * MIN),
      msg('c', 'user', 10 * MIN),
      msg('d', 'user', 0),
      msg('d', 'user', 5 * MIN),
      msg('d', 'user', 10 * MIN),
      msg('d', 'user', 15 * MIN),
      msg('d', 'user', 20 * MIN),
    ]);
    const stats = sessionStats(sessions);
    expect(stats.sessions).toBe(4);
    expect(stats.totalUserMessages).toBe(1 + 2 + 3 + 5);
    expect(stats.avgUserMessagesPerSession).toBe(11 / 4);
    // terurut [1,2,3,5] → median idx ceil(0.5*4)-1=1 → 2; p90 idx ceil(0.9*4)-1=3 → 5
    expect(stats.medianUserMessagesPerSession).toBe(2);
    expect(stats.p90UserMessagesPerSession).toBe(5);
    expect(stats.singleMessageSessionRate).toBeCloseTo(1 / 4);
  });

  it('menjumlahkan balasan Livia terpisah dari pesan user', () => {
    const sessions = sessionize([
      msg('a', 'user', 0),
      msg('a', 'livia', MIN),
      msg('a', 'user', 2 * MIN),
    ]);
    const stats = sessionStats(sessions);
    expect(stats.totalUserMessages).toBe(2);
    expect(stats.totalLiviaMessages).toBe(1);
  });
});

describe('retentionCohorts', () => {
  const users: CohortUser[] = [
    { userId: 'u1', createdDay: '2026-10-01' },
    { userId: 'u2', createdDay: '2026-10-01' },
    { userId: 'u3', createdDay: '2026-10-20' },
    { userId: 'u4', createdDay: AS_OF }, // baru hari ini — semua belum matang
  ];
  const active = new Map<string, Set<string>>([
    ['u1', new Set(['2026-10-02', '2026-10-08'])], // D1 & D7 aktif; D30 (10-31) belum matang
    ['u2', new Set(['2026-10-05'])], // D1/D7 tidak aktif; D30 belum matang
    ['u3', new Set(['2026-10-21', '2026-10-30'])], // D1 aktif, D7 tidak (10-30 di luar target 10-27)
  ]);

  it('grup harian: D+N = hari eksak, belum matang → null (bukan 0%)', () => {
    const rows = retentionCohorts(users, active, AS_OF, 'day');
    expect(rows.map((r) => r.cohort)).toEqual(['2026-10-01', '2026-10-20', '2026-10-28']);
    expect(rows[0]).toEqual({ cohort: '2026-10-01', users: 2, d1: 0.5, d7: 0.5, d30: null });
    expect(rows[1]).toEqual({ cohort: '2026-10-20', users: 1, d1: 1, d7: 0, d30: null });
    expect(rows[2]).toEqual({ cohort: '2026-10-28', users: 1, d1: null, d7: null, d30: null });
  });

  it('grup mingguan: digabung per awal-Senin, dihitung per-user lalu diakumulasi', () => {
    const rows = retentionCohorts(users, active, AS_OF, 'week');
    // 10-01 (Kamis) → minggu 09-28; 10-20 (Selasa) → minggu 10-19;
    // 10-28 (Rabu) → minggu 10-26
    expect(rows.map((r) => [r.cohort, r.users])).toEqual([
      ['2026-09-28', 2],
      ['2026-10-19', 1],
      ['2026-10-26', 1],
    ]);
    expect(rows[0].d1).toBeCloseTo(0.5);
    expect(rows[0].d7).toBeCloseTo(0.5);
    // u3 D1 aktif (10-21), D7 tidak (10-27)
    expect(rows[1].d1).toBeCloseTo(1);
    expect(rows[1].d7).toBeCloseTo(0);
    // u4 dibuat hari ini → belum matang semua
    expect(rows[2]).toEqual({ cohort: '2026-10-26', users: 1, d1: null, d7: null, d30: null });
  });

  it('retensi D30 terisi setelah matang', () => {
    const rows = retentionCohorts(users, active, '2026-11-01', 'day');
    const c1 = rows.find((r) => r.cohort === '2026-10-01')!;
    // D30 = 10-31: u1 tidak aktif, u2 tidak aktif
    expect(c1.d30).toBe(0);
  });

  it('tanpa user → tidak ada baris', () => {
    expect(retentionCohorts([], active, AS_OF, 'day')).toEqual([]);
  });
});

describe('weightedCohortRetention', () => {
  const users: CohortUser[] = [
    { userId: 'u1', createdDay: '2026-10-01' },
    { userId: 'u2', createdDay: '2026-10-01' },
    { userId: 'u3', createdDay: '2026-10-20' },
  ];
  const active = new Map<string, Set<string>>([
    ['u1', new Set(['2026-10-02', '2026-10-08'])],
    ['u2', new Set(['2026-10-05'])],
    ['u3', new Set(['2026-10-21'])],
  ]);

  it('pembobotan jumlah-user lintas semua kohort', () => {
    const w = weightedCohortRetention(users, active, AS_OF);
    // D1: u1 ✓, u2 ✗, u3 ✓ → 2/3. D7: u1 ✓, u2 ✗, u3 ✗ → 1/3. D30: belum ada yang matang.
    expect(w.d1).toBeCloseTo(2 / 3);
    expect(w.d7).toBeCloseTo(1 / 3);
    expect(w.d30).toBeNull();
  });

  it('tanpa user → semua null (bukan NaN)', () => {
    expect(weightedCohortRetention([], active, AS_OF)).toEqual({ d1: null, d7: null, d30: null });
  });
});

describe('onboardingDropoff', () => {
  it('membucket per umur akun + hitung selesai', () => {
    const rows = onboardingDropoff(
      [
        { createdDay: '2026-10-28', done: false }, // today
        { createdDay: '2026-10-27', done: true }, // 1
        { createdDay: '2026-10-26', done: false }, // 2
        { createdDay: '2026-10-24', done: true }, // 3-6
        { createdDay: '2026-10-22', done: true }, // 3-6
        { createdDay: '2026-10-01', done: false }, // 7+
      ],
      AS_OF
    );
    expect(rows).toEqual([
      { bucket: 'today', created: 1, done: 0 },
      { bucket: '1', created: 1, done: 1 },
      { bucket: '2', created: 1, done: 0 },
      { bucket: '3-6', created: 2, done: 2 },
      { bucket: '7+', created: 1, done: 0 },
    ]);
  });

  it('tanpa user → semua bucket nol', () => {
    expect(onboardingDropoff([], AS_OF).every((b) => b.created === 0 && b.done === 0)).toBe(true);
  });
});

describe('dailySeries', () => {
  it('mengisi N hari terakhir, kosong = 0', () => {
    const active = new Map<string, Set<string>>([
      ['u1', new Set(['2026-10-26', '2026-10-28'])],
      ['u2', new Set(['2026-10-28'])],
    ]);
    const newUsers = new Map<string, number>([['2026-10-27', 1]]);
    const userMsgs = new Map<string, number>([['2026-10-28', 5]]);

    const series = dailySeries(active, newUsers, userMsgs, 3, AS_OF);
    expect(series).toEqual([
      { day: '2026-10-26', activeUsers: 1, newUsers: 0, userMessages: 0 },
      { day: '2026-10-27', activeUsers: 0, newUsers: 1, userMessages: 0 },
      { day: '2026-10-28', activeUsers: 2, newUsers: 0, userMessages: 5 },
    ]);
  });
});
