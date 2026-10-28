import { ArrowLeft, AlertTriangle, BarChart3, HeartHandshake, Lock, MessagesSquare, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getAnalyticsOverview } from '@/lib/analytics/queries';
import type { AnalyticsOverview } from '@/lib/analytics/queries';
import { ANALYTICS_TREND_DAYS, ANALYTICS_WEEKS, ANALYTICS_WINDOW_DAYS } from '@/lib/analytics/queries';

/**
 * Dashboard produk (M7.2) — SATU layar untuk menjawab:
 * "User puas & betah? Apakah kualitas Livia membuat mereka kembali?"
 *
 * First-party: semua angka dihitung dari data milik sendiri di Neon (users,
 * userProfiles, userActivityDaily, chatMessages). Tidak ada SDK pihak ketiga,
 * cookie, atau tracking eksternal — privasi maksimal dan nol infra baru
 * (keputusan: tidak memakai PostHog/Plausible, lihat docs/M7-IMPLEMENTATION).
 *
 * Server component (owner-only): middleware memaksa login; cek owner
 * (`OWNER_EMAIL`) di sini. UI Bahasa Indonesia: panel internal owner.
 */

export const dynamic = 'force-dynamic';

const dayFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function fmtDate(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return dayFmt.format(d);
}

function fmtPct(x: number | null): string {
  if (x === null) return '—';
  return `${(x * 100).toFixed(1)}%`;
}

function fmtNum(x: number): string {
  return Number.isInteger(x) ? x.toLocaleString('id-ID') : x.toFixed(1).replace('.', ',');
}

function ownerEmail(): string | undefined {
  const raw = process.env.OWNER_EMAIL;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

const card = 'bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-4';
const title = 'text-sm font-bold text-[#5c4d47]';
const th = 'px-2 py-2 font-bold';
const td = 'px-2 py-2 font-mono text-xs text-[#5c4d47]';
const tdRight = 'px-2 py-2 font-mono text-xs text-[#5c4d47] text-right';

export default async function AnalyticsPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const owner = ownerEmail();

  if (!owner || email !== owner) {
    return (
      <Shell>
        <div className={card}>
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
            <Lock size={22} />
          </div>
          <h2 className="text-lg font-bold text-[#5c4d47]">Akses ditolak</h2>
          <p className="text-sm text-[#5c4d47]/70 leading-relaxed">
            Halaman ini hanya untuk owner (env <code className="font-mono text-xs">OWNER_EMAIL</code>).
            {!owner && ' Saat ini `OWNER_EMAIL` belum diset di environment, jadi tidak ada yang bisa membuka halaman ini.'}
          </p>
        </div>
      </Shell>
    );
  }

  let overview: AnalyticsOverview | null = null;
  let error: string | null = null;
  try {
    overview = await getAnalyticsOverview();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <Shell>
      {error ? (
        <div className={card}>
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-bold text-[#5c4d47]">Gagal memuat data</h2>
          <p className="text-sm text-[#5c4d47]/70 font-mono break-all">{error}</p>
        </div>
      ) : (
        overview && (
          <div className="flex flex-col gap-6">
            {/* --- KPI baris atas --- */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Kpi
                icon={<Users size={15} className="text-[#ff758c]" />}
                label="User baru"
                sub={`${ANALYTICS_WINDOW_DAYS} hari`}
                value={String(overview.onboarding.totalCreated)}
              />
              <Kpi icon={<TrendingUp size={15} className="text-[#ff758c]" />} label="Retensi D1" sub="tertimbang" value={fmtPct(overview.retention.weighted.d1)} />
              <Kpi icon={<TrendingUp size={15} className="text-[#ff758c]" />} label="Retensi D7" sub="tertimbang" value={fmtPct(overview.retention.weighted.d7)} />
              <Kpi icon={<TrendingUp size={15} className="text-[#ff758c]" />} label="Retensi D30" sub="tertimbang" value={fmtPct(overview.retention.weighted.d30)} />
              <Kpi
                icon={<HeartHandshake size={15} className="text-[#ff758c]" />}
                label="Onboarding"
                sub="selesai"
                value={fmtPct(overview.onboarding.completionRate)}
              />
              <Kpi
                icon={<MessagesSquare size={15} className="text-[#ff758c]" />}
                label="Pesan / sesi"
                sub="rata-rata"
                value={fmtNum(overview.sessions.avgUserMessagesPerSession)}
              />
            </div>

            {/* --- Retensi mingguan --- */}
            <div className={card}>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#ff758c]" />
                <h3 className={title}>Retensi kohort mingguan ({ANALYTICS_WEEKS} minggu terakhir)</h3>
              </div>
              <p className="text-[11px] text-[#5c4d47]/60 -mt-2">
                D+N = user kohort yang aktif pada hari eksak hari ke-N setelah bikin akun. «—» = belum matang.
              </p>
              {overview.retention.weekly.length === 0 ? (
                <p className="text-sm text-[#5c4d47]/60">Belum ada user terdaftar.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-[#5c4d47]/50">
                        <th className={th}>Minggu</th>
                        <th className={`${th} text-right`}>User</th>
                        <th className={`${th} text-right`}>D1</th>
                        <th className={`${th} text-right`}>D7</th>
                        <th className={`${th} text-right`}>D30</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.retention.weekly.map((row) => (
                        <tr key={row.cohort} className="border-t border-orange-100/70">
                          <td className={td}>{fmtDate(row.cohort)}</td>
                          <td className={tdRight}>{row.users}</td>
                          <td className={tdRight}>{fmtPct(row.d1)}</td>
                          <td className={tdRight}>{fmtPct(row.d7)}</td>
                          <td className={tdRight}>{fmtPct(row.d30)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* --- Sesi percakapan + onboarding --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={card}>
                <div className="flex items-center gap-2">
                  <MessagesSquare size={16} className="text-[#ff758c]" />
                  <h3 className={title}>Sesi percakapan ({ANALYTICS_WINDOW_DAYS} hari terakhir)</h3>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-[#5c4d47]/60">Jumlah sesi</dt>
                  <dd className="font-bold text-[#5c4d47] text-right">{overview.sessions.sessions.toLocaleString('id-ID')}</dd>
                  <dt className="text-[#5c4d47]/60">Pesan user / sesi</dt>
                  <dd className="font-bold text-[#5c4d47] text-right">
                    {fmtNum(overview.sessions.avgUserMessagesPerSession)}
                    <span className="font-normal text-[#5c4d47]/50 text-xs">
                      {' '}
                      (median {fmtNum(overview.sessions.medianUserMessagesPerSession)} · p90 {fmtNum(overview.sessions.p90UserMessagesPerSession)})
                    </span>
                  </dd>
                  <dt className="text-[#5c4d47]/60">Total pesan user</dt>
                  <dd className="font-bold text-[#5c4d47] text-right">{overview.sessions.totalUserMessages.toLocaleString('id-ID')}</dd>
                  <dt className="text-[#5c4d47]/60">Total balasan Livia</dt>
                  <dd className="font-bold text-[#5c4d47] text-right">{overview.sessions.totalLiviaMessages.toLocaleString('id-ID')}</dd>
                  <dt className="text-[#5c4d47]/60">Sesi pesan-1 (datang-pergi)</dt>
                  <dd className="font-bold text-[#5c4d47] text-right">{fmtPct(overview.sessions.singleMessageSessionRate)}</dd>
                </dl>
              </div>

              <div className={card}>
                <div className="flex items-center gap-2">
                  <HeartHandshake size={16} className="text-[#ff758c]" />
                  <h3 className={title}>Drop-off onboarding</h3>
                </div>
                <p className="text-[11px] text-[#5c4d47]/60 -mt-2">
                  Per umur akun. {overview.onboarding.neverChatted} user tidak pernah chat (≤90 hari).
                </p>
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-[#5c4d47]/50">
                        <th className={th}>Umur akun</th>
                        <th className={`${th} text-right`}>Akun</th>
                        <th className={`${th} text-right`}>Selesai</th>
                        <th className={`${th} text-right`}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.onboarding.buckets.map((b) => (
                        <tr key={b.bucket} className="border-t border-orange-100/70">
                          <td className={td}>
                            {b.bucket === 'today' ? 'Hari ini' : b.bucket === '7+' ? '7+ hari' : `${b.bucket} hari`}
                          </td>
                          <td className={tdRight}>{b.created}</td>
                          <td className={tdRight}>{b.done}</td>
                          <td className={tdRight}>{b.created > 0 ? fmtPct(b.done / b.created) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* --- Tren 14 hari --- */}
            <div className={card}>
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-[#ff758c]" />
                <h3 className={title}>Tren harian ({ANALYTICS_TREND_DAYS} hari terakhir)</h3>
              </div>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-[#5c4d47]/50">
                      <th className={th}>Hari</th>
                      <th className={`${th} text-right`}>Aktif</th>
                      <th className={`${th} text-right`}>User baru</th>
                      <th className={`${th} text-right`}>Pesan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.trend.map((p) => (
                      <tr key={p.day} className="border-t border-orange-100/70">
                        <td className={td}>{fmtDate(p.day)}</td>
                        <td className={tdRight}>{p.activeUsers}</td>
                        <td className={tdRight}>{p.newUsers}</td>
                        <td className={tdRight}>{p.userMessages}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- Definisi --- */}
            <div className="text-[11px] text-[#5c4d47]/50 leading-relaxed px-1">
              Definisi «hari aktif» = minimal satu interaksi chat atau kencan yang selesai tersimpan
              (dipencatat otomatis per interaksi; tidak termasuk kunjungan halaman). Semua hari dalam UTC.
              Data dihitung langsung dari tabel aplikasi di Neon — tidak ada vendor analitik pihak ketiga.
            </div>
          </div>
        )
      )}
    </Shell>
  );
}

function Kpi({ icon, label, sub, value }: { icon: React.ReactNode; label: string; sub: string; value: string }) {
  return (
    <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-orange-100 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5c4d47]/70">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold text-[#5c4d47]">{value}</div>
      <div className="text-[10px] text-[#5c4d47]/50">{sub}</div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#fdfbf7] relative overflow-y-auto font-sans">
      <div className="max-w-5xl mx-auto p-6 md:p-10 flex flex-col gap-6">
        <header className="flex items-center gap-4">
          <Link
            href="/home"
            className="bg-white border border-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center text-[#5c4d47] shadow-sm hover:scale-105 hover:bg-orange-50 hover:text-orange-600 transition-all shrink-0"
            aria-label="Kembali ke beranda"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#5c4d47]">Analitik Produk</h1>
            <p className="text-xs text-[#5c4d47]/60">
              Retensi, sesi percakapan & drop-off — first-party dari data sendiri (tanpa pihak ketiga).
            </p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
