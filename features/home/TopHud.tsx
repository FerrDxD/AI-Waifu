'use client';

import { Wallet, Heart } from 'lucide-react';
import AffectionBar from '@/components/livia/AffectionBar';

/**
 * HUD baris atas home (M5.1): panel pemain (desktop) + pill afeksi/dompet
 * (mobile). JSX dipindah verbatim dari HomeClient.
 */

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
      {/* Desktop */}
      <div className="hidden md:flex flex-row justify-between items-start pointer-events-auto w-full gap-4">
        <div className="bg-white/85 backdrop-blur-2xl p-5 rounded-3xl border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.07)] flex flex-col gap-4 min-w-[340px]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center text-white font-display font-black text-lg shadow-sm flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="font-display font-black text-2xl text-[#5c4d47] tracking-tight leading-none">{userName}</span>
            </div>
            <div className={`font-mono font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${sessionMinutes > 0 ? 'bg-pink-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sessionMinutes > 0 ? 'bg-white/70 animate-pulse' : 'bg-gray-400'}`} />
              {sessionMinutes > 0 ? `${sessionMinutes}m online` : 'Baru tiba'}
            </div>
          </div>
          <AffectionBar affection={affection} level={level} levelName={levelName} />
        </div>

        <div className="bg-white/85 backdrop-blur-2xl px-5 py-3.5 rounded-2xl border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.07)] flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-xl border border-amber-100/80">
            <Wallet className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{moneyLabel} Rv</span>
            <span className="font-mono font-black text-2xl text-amber-600 leading-none tabular-nums">{money}</span>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="flex md:hidden pointer-events-auto">
        <div className="absolute top-4 left-4 flex gap-2 z-50">
          <button
            onClick={onShowMobileStats}
            className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-full border border-pink-100/80 shadow-md flex items-center gap-2 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <Heart size={13} className="fill-pink-500 text-pink-500 flex-shrink-0" />
            <span className="text-xs font-display font-bold text-[#5c4d47]">Lv.{level} {levelName}</span>
            <div className="w-14 h-1.5 bg-pink-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all duration-700 rounded-full" style={{ width: `${Math.max(0, Math.min(100, affection))}%` }} />
            </div>
          </button>
          <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-full border border-amber-100/80 shadow-md flex items-center gap-1.5">
            <Wallet size={13} className="text-amber-500 flex-shrink-0" />
            <span className="font-mono font-black text-sm text-amber-600 tabular-nums">{money}</span>
            <span className="text-[9px] font-bold text-amber-400/90">Rv</span>
          </div>
        </div>
      </div>
    </>
  );
}
