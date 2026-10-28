import { ArrowLeft, AlertTriangle, Lock, MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from 'next/link';

import { auth } from '@/lib/auth';
import { getFeedbackRows, scenarioSnippet, type FeedbackRow } from '@/lib/feedback';
import CopySnippetButton from '@/components/ui/CopySnippetButton';

/**
 * Review feedback chat (M7.4) — jembatan manusia antara tombol baik/buruk di
 * UI dan dataset eval (`evals/dataset.ts`).
 *
 * Alur: user merating balasan Livia → baris masuk `chatFeedback` → owner
 * membuka halaman ini → menilai konteks → menyalin sketsa skenario (tombol
 * "Salin skenario") → menempelkan & mengkurasi di `evals/dataset.ts`.
 *
 * Sengaja BUKAN otomatis ke dataset: pesan user mentah boleh berisi PII atau
 * percobaan injeksi — kurasi adalah bagian dari loop (M7.3).
 *
 * Server component (owner-only, pola `/usage`): data langsung dari DB.
 */

export const dynamic = 'force-dynamic';

const FEEDBACK_LIMIT = 200;

function ownerEmail(): string | undefined {
  const raw = process.env.OWNER_EMAIL;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

function fmtDate(d: Date): string {
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(s: string, max: number): string {
  const oneLine = s.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max).trimEnd()}…` : oneLine;
}

export default async function FeedbackPage() {
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

  let rows: FeedbackRow[] = [];
  let error: string | null = null;
  try {
    rows = await getFeedbackRows(FEEDBACK_LIMIT);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const ups = rows.filter((r) => r.rating === 'up').length;
  const downs = rows.length - ups;
  const negativeRate = rows.length > 0 ? Math.round((downs / rows.length) * 100) : 0;

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
        <div className="flex flex-col gap-6">
          {/* --- Ringkasan --- */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="Total rating" value={String(rows.length)} />
            <SummaryCard
              label="Baik"
              value={String(ups)}
              icon={<ThumbsUp size={14} className="text-emerald-500" />}
            />
            <SummaryCard
              label="Buruk"
              value={String(downs)}
              icon={<ThumbsDown size={14} className="text-rose-500" />}
            />
            <SummaryCard
              label="Rasio buruk"
              value={rows.length > 0 ? `${negativeRate}%` : '—'}
              hint={
                rows.length > 0 && negativeRate >= 50
                  ? 'tinggi — periksa skenario "buruk" di bawah'
                  : undefined
              }
            />
          </div>

          {/* --- Daftar feedback --- */}
          <div className={card}>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-[#ff758c]" />
              <h3 className={title}>Feedback terbaru ({rows.length} baris)</h3>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-[#5c4d47]/60">
                Belum ada rating. Tombol 👍/ muncul di bawah balasan Livia di halaman chat.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className={`border rounded-2xl p-4 flex flex-col gap-3 ${
                      row.rating === 'down' ? 'bg-rose-50/40 border-rose-100' : 'bg-emerald-50/30 border-emerald-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[11px] text-[#5c4d47]/60">
                      {row.rating === 'down' ? (
                        <ThumbsDown size={12} className="text-rose-500 shrink-0" />
                      ) : (
                        <ThumbsUp size={12} className="text-emerald-500 shrink-0" />
                      )}
                      <span className="font-mono">{fmtDate(row.createdAt)}</span>
                      <span className="font-semibold text-[#5c4d47] truncate">
                        {row.email ?? row.id.slice(0, 8)}
                      </span>
                    </div>

                    {row.userMessage ? (
                      <p className="text-xs text-[#5c4d47]/80">
                        <span className="font-bold text-[#5c4d47]">User:</span>{' '}
                        {truncate(row.userMessage, 300)}
                      </p>
                    ) : (
                      <p className="text-xs text-[#5c4d47]/50 italic">
                        (pesan user sudah di-prune — hanya balasan Livia yang tersisa)
                      </p>
                    )}
                    <p className="text-xs text-[#5c4d47]">
                      <span className="font-bold">Livia:</span> {truncate(row.liviaReply, 300)}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] text-[#5c4d47]/50">
                        Salin, lalu tempel & kurasi di{' '}
                        <code className="font-mono">evals/dataset.ts</code> (ganti field bertanda GANTI).
                      </p>
                      <CopySnippetButton
                        snippet={scenarioSnippet({
                          rating: row.rating,
                          userMessage: row.userMessage,
                          liviaReply: row.liviaReply,
                          createdAt: row.createdAt.toISOString(),
                        })}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* --- Penjelasan alur --- */}
          <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 text-xs text-[#5c4d47]/80 leading-relaxed">
            <p className="font-bold text-[#5c4d47] mb-1.5">Alur feedback → eval (human-in-the-loop)</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>User menekan 👍/👎 di bawah balasan Livia (halaman chat) → tersimpan 1 rating per pesan.</li>
              <li>Owner meninjau daftar ini: balasan "buruk" adalah kandidat perbaikan; "baik" adalah contoh perilaku yang dipertahankan.</li>
              <li>Salin sketsa skenario, tempel ke <code className="font-mono">evals/dataset.ts</code>, lalu kurasi: id unik, kategori, afeksi saat kejadian, dan cek yang tepat.</li>
              <li>Verifikasi: <code className="font-mono">bun run evals</code> (offline) — live eval otomatis ikut di CI (M7.3).</li>
            </ol>
            <p className="mt-2 text-[#5c4d47]/60">
              Catatan: daftar ini mengikuti retensi pesan chat ({FEEDBACK_LIMIT} baris terbaru; rating ikut
              terhapus saat pesannya di-prune 90 hari).
            </p>
          </div>
        </div>
      )}
    </Shell>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-orange-100 flex flex-col gap-1">
      <span className="text-[11px] font-bold text-[#5c4d47]/50 flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="text-2xl font-bold text-[#5c4d47]">{value}</span>
      {hint && <span className="text-[10px] text-red-500 font-semibold">{hint}</span>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#fdfbf7] relative overflow-y-auto font-sans">
      <div className="max-w-4xl mx-auto p-6 md:p-10 flex flex-col gap-6">
        <header className="flex items-center gap-4">
          <Link
            href="/home"
            className="bg-white border border-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center text-[#5c4d47] shadow-sm hover:scale-105 hover:bg-orange-50 hover:text-orange-600 transition-all shrink-0"
            aria-label="Kembali ke beranda"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#5c4d47]">Feedback Chat</h1>
            <p className="text-xs text-[#5c4d47]/60">
              Rating baik/buruk dari user → bahan kurasi dataset eval (<code className="font-mono">evals/dataset.ts</code>).
            </p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
