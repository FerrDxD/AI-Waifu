import { ArrowLeft, AlertTriangle, Cpu, Lock, MessageSquare, Mic, Users } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getUsageOverview } from '@/lib/ai/usage';
import type { UsageOverview } from '@/lib/ai/usage';
import { costUsd } from '@/lib/ai/pricing';

/**
 * Dashboard pemakaian & biaya AI (M7.1) — SATU layar untuk menjawab:
 * "Biaya tidak lepas kendali? User mana yang banyak ngobrol?"
 *
 * Server component (owner-only): data langsung dari DB, tanpa client JS.
 * Middleware memaksa login; cek owner (`OWNER_EMAIL`) di sini.
 * UI Bahasa Indonesia: ini panel internal owner, bukan fitur user.
 */

export const dynamic = 'force-dynamic';

function fmtUsd(micros: number): string {
  const usd = costUsd(micros);
  return `$${usd < 0.01 && usd > 0 ? usd.toFixed(6) : usd.toFixed(4)}`;
}

function fmtInt(n: number): string {
  return n.toLocaleString('id-ID');
}

function ownerEmail(): string | undefined {
  const raw = process.env.OWNER_EMAIL;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default async function UsagePage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const owner = ownerEmail();

  const card = 'bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-4';
  const title = 'text-sm font-bold text-[#5c4d47]';

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

  let overview: UsageOverview | null = null;
  let error: string | null = null;
  try {
    overview = await getUsageOverview({ days: 14 });
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
            {/* --- Baris atas: budget hari ini + total periode --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className={card}>
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-[#ff758c]" />
                  <h3 className={title}>Budget AI hari ini</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#5c4d47]">
                    {fmtUsd(Math.round(overview.budget.todayCostUsd * 1e6))}
                  </span>
                  <span className="text-sm text-[#5c4d47]/60">
                    / batas ${overview.budget.limitUsd.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 bg-pink-100 rounded-lg overflow-hidden">
                  <div
                    className={
                      overview.budget.todayCostUsd > overview.budget.limitUsd
                        ? 'h-full bg-red-500'
                        : 'h-full bg-gradient-to-r from-[#ff758c] to-[#ff0844]'
                    }
                    style={{
                      width: `${Math.min(
                        100,
                        (overview.budget.todayCostUsd / overview.budget.limitUsd) * 100
                      )}%`,
                    }}
                  />
                </div>
                {overview.budget.exceededAt ? (
                  <p className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    Cap hari ini sudah terlampaui (
                    {new Date(overview.budget.exceededAt).toISOString().slice(11, 16)} UTC) — alert
                    `ai.budget_alert` sudah dikirim ke log.
                  </p>
                ) : (
                  <p className="text-[11px] text-[#5c4d47]/60">
                    Masih di bawah cap — alert `ai.budget_alert` belum menyala.
                  </p>
                )}
              </div>

              <div className={card}>
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-[#ff758c]" />
                  <h3 className={title}>Total {overview.days} hari terakhir</h3>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-[#5c4d47]/60">Request AI</dt>
                  <dd className="font-bold text-[#5c4d47] text-right">
                    {fmtInt(overview.daily.reduce((a, d) => a + d.requests, 0))}
                  </dd>
                  <dt className="text-[#5c4d47]/60">Token masuk</dt>
                  <dd className="font-bold text-[#5c4d47] text-right">
                    {fmtInt(overview.daily.reduce((a, d) => a + d.inputTokens, 0))}
                  </dd>
                  <dt className="text-[#5c4d47]/60">Token keluar</dt>
                  <dd className="font-bold text-[#5c4d47] text-right">
                    {fmtInt(overview.daily.reduce((a, d) => a + d.outputTokens, 0))}
                  </dd>
                  <dt className="text-[#5c4d47]/60">Estimasi biaya</dt>
                  <dd className="font-bold text-[#5c4d47] text-right">
                    {fmtUsd(overview.daily.reduce((a, d) => a + d.costMicros, 0))}
                  </dd>
                </dl>
              </div>
            </div>

            {/* --- Tren harian --- */}
            <div className={card}>
              <h3 className={title}>Harian (terlama → terbaru)</h3>
              {overview.daily.length === 0 ? (
                <p className="text-sm text-[#5c4d47]/60">Belum ada request tercatat di periode ini.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-[#5c4d47]/50">
                        <th className="px-2 py-2 font-bold">Hari</th>
                        <th className="px-2 py-2 font-bold text-right">Request</th>
                        <th className="px-2 py-2 font-bold text-right">Token in</th>
                        <th className="px-2 py-2 font-bold text-right">Token out</th>
                        <th className="px-2 py-2 font-bold text-right">Biaya</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.daily.map((d) => (
                        <tr key={d.day} className="border-t border-orange-100/70">
                          <td className="px-2 py-2 font-mono text-xs text-[#5c4d47]">
                            {d.day}
                            {d.capExceededAt && (
                              <span className="ml-2 text-red-500 font-sans font-bold text-[10px]">
                                cap!
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-xs">{fmtInt(d.requests)}</td>
                          <td className="px-2 py-2 text-right font-mono text-xs">{fmtInt(d.inputTokens)}</td>
                          <td className="px-2 py-2 text-right font-mono text-xs">{fmtInt(d.outputTokens)}</td>
                          <td className="px-2 py-2 text-right font-mono text-xs font-bold">
                            {fmtUsd(d.costMicros)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* --- Breakdown operasi / model / user --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={card}>
                <h3 className={title}>Per operasi</h3>
                <BreakdownList
                  rows={overview.byOperation.map((r) => ({
                    label: r.operation,
                    sub: `${fmtInt(r.requests)} request · in ${fmtInt(r.inputTokens)} · out ${fmtInt(r.outputTokens)}`,
                    value: fmtUsd(r.costMicros),
                  }))}
                  empty="Belum ada data."
                />
              </div>
              <div className={card}>
                <h3 className={title}>Per model</h3>
                <BreakdownList
                  rows={overview.byModel.map((r) => ({
                    label: r.model,
                    sub: `${fmtInt(r.requests)} request · in ${fmtInt(r.inputTokens)} · out ${fmtInt(r.outputTokens)}`,
                    value: fmtUsd(r.costMicros),
                  }))}
                  empty="Belum ada data."
                />
              </div>
              <div className={card}>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#ff758c]" />
                  <h3 className={title}>Top user</h3>
                </div>
                <BreakdownList
                  rows={overview.byUser.map((r) => ({
                    label: r.email ?? r.userId.slice(0, 8),
                    sub: `${fmtInt(r.requests)} request${r.userKeyRequests > 0 ? ` · ${fmtInt(r.userKeyRequests)} pakai key sendiri` : ''}`,
                    value: fmtUsd(r.costMicros),
                  }))}
                  empty="Belum ada data."
                />
              </div>
            </div>

            {/* --- TTS --- */}
            <div className={card}>
              <div className="flex items-center gap-2">
                <Mic size={16} className="text-[#ff758c]" />
                <h3 className={title}>Suara (ElevenLabs, {overview.days} hari terakhir)</h3>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <dt className="text-[#5c4d47]/60">Request</dt>
                <dd className="font-bold text-[#5c4d47] text-right">{fmtInt(overview.tts.requests)}</dd>
                <dt className="text-[#5c4d47]/60">Cache hit</dt>
                <dd className="font-bold text-[#5c4d47] text-right">
                  {fmtInt(overview.tts.cacheHits)} ({(overview.tts.cacheHitRate * 100).toFixed(0)}%)
                </dd>
                <dt className="text-[#5c4d47]/60">Karakter di-billing</dt>
                <dd className="font-bold text-[#5c4d47] text-right">{fmtInt(overview.tts.charsBilled)}</dd>
                <dt className="text-[#5c4d47]/60">Cap karakter/user/hari</dt>
                <dd className="font-bold text-[#5c4d47] text-right">—</dd>
              </dl>
            </div>
          </div>
        )
      )}
    </Shell>
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
            <h1 className="text-2xl font-bold text-[#5c4d47]">Pemakaian & Biaya AI</h1>
            <p className="text-xs text-[#5c4d47]/60">
              Pencatatan per request + agregasi harian. Log per-request disimpan 30 hari
              (dihapus otomatis oleh <code className="font-mono">db:prune</code>).
            </p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function BreakdownList({
  rows,
  empty,
}: {
  rows: { label: string; sub: string; value: string }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-[#5c4d47]/60">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.label}
          className="flex items-center justify-between gap-3 bg-orange-50/40 border border-orange-100 rounded-2xl px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#5c4d47] truncate">{row.label}</p>
            <p className="text-[11px] text-[#5c4d47]/60 truncate">{row.sub}</p>
          </div>
          <span className="text-sm font-mono font-bold text-[#5c4d47] shrink-0">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}
