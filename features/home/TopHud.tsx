'use client';

import { Wallet, Heart } from 'lucide-react';
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
}: {
  userName: string;
  sessionMinutes: number;
  affection: number;
  level: number;
  levelName: string;
  money: number;
  moneyLabel: string;
  onShowMobileStats: () => void;
}) {
  return (
    <>
      {/* ── Desktop HUD ────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-row justify-between items-start pointer-events-auto w-full gap-4">
        {/* Player Profile & Affection Island */}
        <div className="bg-white/90 backdrop-blur-2xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_32px_rgba(255,117,140,0.08)] flex flex-col gap-3.5 min-w-[340px] max-w-sm transition-all hover:shadow-[0_12px_36px_rgba(255,117,140,0.12)]">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#ff758c] to-[#ff0844] flex items-center justify-center text-white font-display font-black text-xl shadow-[0_4px_14px_rgba(255,117,140,0.35)] shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="font-display font-black text-2xl text-[#5c4d47] tracking-tight leading-none">
                {userName}
              </span>
            </div>

            <div className="font-mono font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 border border-pink-100 bg-pink-50 text-pink-700 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse shrink-0" />
              {sessionMinutes > 0 ? `${sessionMinutes}m di kos` : 'Baru tiba'}
            </div>
          </div>

          <AffectionBar affection={affection} level={level} levelName={levelName} />
        </div>

        {/* Currency Island */}
        <div className="bg-white/90 backdrop-blur-2xl px-5 py-3.5 rounded-[1.75rem] border border-white/80 shadow-[0_8px_32px_rgba(255,117,140,0.06)] flex items-center gap-3.5 transition-all hover:shadow-[0_12px_36px_rgba(255,117,140,0.1)]">
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
      </div>

      {/* ── Mobile HUD ─────────────────────────────────────────────── */}
      <div className="flex md:hidden pointer-events-auto">
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-50">
          <button
            onClick={onShowMobileStats}
            className="bg-white/95 backdrop-blur-xl px-3.5 py-2 rounded-full border border-pink-100/90 shadow-[0_4px_16px_rgba(255,117,140,0.12)] flex items-center gap-2 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <Heart size={13} className="fill-pink-500 text-pink-500 shrink-0" />
            <span className="text-xs font-display font-bold text-[#5c4d47]">
              Lv.{level} {levelName}
            </span>
            <div className="w-12 h-1.5 bg-pink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all duration-700 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, affection))}%` }}
              />
            </div>
          </button>

          <div className="bg-white/95 backdrop-blur-xl px-3.5 py-2 rounded-full border border-amber-100/90 shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-1.5">
            <Wallet size={13} className="text-amber-500 shrink-0" />
            <span className="font-mono font-black text-sm text-amber-600 tabular-nums">
              {money}
            </span>
            <span className="font-mono text-[9px] font-bold text-amber-500/90">Rv</span>
          </div>
        </div>
      </div>
    </>
  );
}
