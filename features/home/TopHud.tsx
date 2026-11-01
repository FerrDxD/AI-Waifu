'use client';

import Link from 'next/link';
import { Wallet, Heart, HelpCircle, Settings, Moon, Sparkles } from 'lucide-react';
import AffectionBar from '@/components/livia/AffectionBar';

export default function TopHud({
  userName,
  sessionMinutes,
  affection,
  level,
  levelName,
  money,
  moneyLabel,
  onShowMobileStats,
  onOpenGuide,
}: {
  userName: string;
  sessionMinutes: number;
  affection: number;
  level: number;
  levelName: string;
  money: number;
  moneyLabel: string;
  onShowMobileStats: () => void;
  onOpenGuide?: () => void;
}) {
  return (
    <>
      {/* ── Desktop HUD Island ──────────────────────────────────────── */}
      <header className="hidden md:flex flex-row justify-between items-start pointer-events-auto w-full gap-4 z-40">
        {/* Profil Penghuni Kos & Bar Afeksi */}
        <div className="bg-white/92 backdrop-blur-2xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_32px_rgba(255,117,140,0.08)] flex flex-col gap-3.5 min-w-[360px] max-w-md transition-all hover:shadow-[0_12px_36px_rgba(255,117,140,0.12)]">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#ff758c] to-[#ff0844] flex items-center justify-center text-white font-display font-black text-xl shadow-[0_4px_16px_rgba(255,117,140,0.35)] shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-2xl text-[#5c4d47] tracking-tight leading-tight">
                  {userName}
                </span>
                <span className="font-mono text-[9px] font-bold text-[#7a7268] uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={10} className="text-pink-500" />
                  Kamar Kos Bersama
                </span>
              </div>
            </div>

            <div className="font-mono font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 border border-pink-100 bg-pink-50/80 text-pink-700 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse shrink-0" />
              {sessionMinutes > 0 ? `${sessionMinutes}m di kos` : 'Baru tiba'}
            </div>
          </div>

          <AffectionBar affection={affection} level={level} levelName={levelName} />
        </div>

        {/* Panel Finansial (Rv) & Shortcut Cepat */}
        <div className="flex items-center gap-3">
          {/* Dompet Rv */}
          <div className="bg-white/92 backdrop-blur-2xl px-5 py-3.5 rounded-[1.75rem] border border-white/80 shadow-[0_8px_32px_rgba(255,117,140,0.06)] flex items-center gap-3.5 transition-all hover:shadow-[0_12px_36px_rgba(255,117,140,0.1)]">
            <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-100/90 shadow-xs">
              <Wallet className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] font-bold text-[#7a7268] uppercase tracking-widest">
                {moneyLabel} Rv
              </span>
              <span className="font-mono font-black text-2xl text-amber-600 leading-none tabular-nums">
                {money}
              </span>
            </div>
          </div>

          {/* Quick Actions (Guide & Settings) */}
          <div className="bg-white/92 backdrop-blur-2xl p-1.5 rounded-[1.75rem] border border-white/80 shadow-[0_8px_32px_rgba(255,117,140,0.06)] flex items-center gap-1">
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                title="Panduan API & Penggunaan"
                className="p-2.5 rounded-2xl text-[#7a7268] hover:text-[#ff758c] hover:bg-pink-50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <HelpCircle size={18} />
              </button>
            )}
            <Link
              href="/settings"
              title="Setelan Kos"
              className="p-2.5 rounded-2xl text-[#7a7268] hover:text-[#ff758c] hover:bg-pink-50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile Floating Top Bar ─────────────────────────────────── */}
      <header className="flex md:hidden pointer-events-auto w-full z-40 fixed top-3 left-0 right-0 px-3">
        <div className="w-full flex items-center justify-between gap-2 bg-white/95 backdrop-blur-2xl px-3 py-2 rounded-full border border-white/90 shadow-[0_6px_24px_rgba(255,117,140,0.12)]">
          {/* Tombol Status Afeksi & Telemetri */}
          <button
            type="button"
            onClick={onShowMobileStats}
            aria-label="Lihat Status & Afeksi Livia"
            className="flex items-center gap-2 pr-2 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-full"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#ff758c] to-[#ff0844] flex items-center justify-center text-white font-display font-black text-xs shadow-xs shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col items-start leading-none gap-0.5">
              <span className="text-[11px] font-display font-bold text-[#5c4d47] flex items-center gap-1">
                <Heart size={11} className="fill-pink-500 text-pink-500 shrink-0" />
                Lv.{level} {levelName}
              </span>
              <div className="w-16 h-1 bg-pink-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(0, Math.min(100, affection))}%` }}
                />
              </div>
            </div>
          </button>

          {/* Dompet Rv & Indikator Siklus */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-pink-100">
            <button
              type="button"
              onClick={onShowMobileStats}
              title="Status Siklus & Psikis"
              className="p-1 rounded-full text-pink-500 hover:bg-pink-50 active:scale-90 transition-transform"
            >
              <Moon size={14} className="text-pink-500" />
            </button>
            <div className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 flex items-center gap-1 shadow-2xs">
              <Wallet size={11} className="text-amber-500 shrink-0" />
              <span className="font-mono font-black text-xs text-amber-600 tabular-nums">
                {money}
              </span>
              <span className="font-mono text-[8px] font-bold text-amber-700">Rv</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
