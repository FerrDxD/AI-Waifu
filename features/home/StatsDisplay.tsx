'use client';

import { X, Heart, Moon, Utensils, Battery, Droplet, Smile, Zap, Shield } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CycleInfo } from './cycle';

export type StatItem = { value: number; label: string };

const STAT_STYLE: Record<string, { icon: ReactNode; strokeColor: string; iconColor: string }> = {
  Makan: { icon: <Utensils size={12} />, strokeColor: 'stroke-orange-400', iconColor: 'text-orange-500' },
  Energi: { icon: <Battery size={12} />, strokeColor: 'stroke-amber-400', iconColor: 'text-amber-500' },
  Minum: { icon: <Droplet size={12} />, strokeColor: 'stroke-blue-400', iconColor: 'text-blue-500' },
  Mood: { icon: <Smile size={12} />, strokeColor: 'stroke-rose-400', iconColor: 'text-rose-500' },
  Stres: { icon: <Zap size={12} />, strokeColor: 'stroke-purple-400', iconColor: 'text-purple-500' },
  Sabar: { icon: <Shield size={12} />, strokeColor: 'stroke-emerald-400', iconColor: 'text-emerald-500' },
};

const CIRC = 100.53;

function Ring({
  value,
  label,
  containerClass,
  trackClass = 'stroke-pink-50',
}: {
  value: number;
  label: string;
  containerClass: string;
  trackClass?: string;
}) {
  const style = STAT_STYLE[label] ?? {
    icon: <Smile size={12} />,
    strokeColor: 'stroke-pink-400',
    iconColor: 'text-pink-500',
  };

  return (
    <div className={`relative flex items-center justify-center ${containerClass}`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" className={`fill-transparent ${trackClass}`} strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r="16"
          className={`fill-transparent ${style.strokeColor} transition-all duration-1000 ease-out`}
          strokeWidth="3.5"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC - (Math.max(0, Math.min(100, value)) / 100) * CIRC}
          strokeLinecap="round"
        />
      </svg>
      <div className={`absolute flex items-center justify-center ${style.iconColor}`}>{style.icon}</div>
    </div>
  );
}

/** Island statistik desktop */
export function StatIsland({
  physical,
  psych,
  cycle,
}: {
  physical: StatItem[];
  psych: StatItem[];
  cycle: CycleInfo;
}) {
  return (
    <div className="hidden md:flex bg-white/92 backdrop-blur-2xl rounded-[2rem] p-3.5 sm:p-4 border border-white/80 shadow-[0_8px_32px_rgba(255,117,140,0.08)] items-center gap-2 self-start w-auto origin-bottom-left transition-all hover:shadow-[0_12px_36px_rgba(255,117,140,0.12)]">
      {/* Label baris */}
      <div className="flex flex-col justify-around gap-4 pr-3 border-r border-pink-100/80">
        <span className="font-mono text-[8px] font-bold text-[#7a7268] uppercase tracking-widest leading-none">
          Fisik
        </span>
        <span className="font-mono text-[8px] font-bold text-[#7a7268] uppercase tracking-widest leading-none">
          Psikis
        </span>
      </div>

      <div className="flex flex-col gap-2 pl-2">
        {/* Fisik */}
        <div className="flex items-center gap-3">
          {physical.map(({ value, label }) => (
            <div key={label} title={`${label}: ${value}%`} className="flex flex-col items-center gap-0.5">
              <Ring value={value} label={label} containerClass="w-9 h-9" />
              <span className="font-mono text-[8px] font-bold text-[#7a7268] tabular-nums">{value}%</span>
            </div>
          ))}
        </div>
        {/* Psikis */}
        <div className="flex items-center gap-3">
          {psych.map(({ value, label }) => (
            <div key={label} title={`${label}: ${value}%`} className="flex flex-col items-center gap-0.5">
              <Ring value={value} label={label} containerClass="w-9 h-9" />
              <span className="font-mono text-[8px] font-bold text-[#7a7268] tabular-nums">{value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider + Siklus */}
      <div className="w-px h-14 bg-pink-100/80 mx-2" />
      <div className="flex flex-col items-center text-center min-w-[64px] gap-1 px-1">
        <Moon size={15} className={`${cycle.color.split(' ')[0]} drop-shadow-xs`} />
        <span className={`text-[10px] font-display font-black leading-tight ${cycle.color.split(' ')[0]}`}>
          {cycle.phase}
        </span>
        <span className="font-mono text-[8px] text-[#7a7268] font-bold">H-{cycle.day}</span>
      </div>
    </div>
  );
}

/** Modal statistik mobile */
export function MobileStatsModal({
  onClose,
  userName,
  levelName,
  affection,
  cycle,
  physical,
  psych,
}: {
  onClose: () => void;
  userName: string;
  levelName: string;
  affection: number;
  cycle: CycleInfo;
  physical: StatItem[];
  psych: StatItem[];
}) {
  return (
    <div
      className="md:hidden fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto animate-[fadeIn_0.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-[340px] rounded-[2rem] p-6 shadow-2xl border border-pink-100 flex flex-col gap-5 animate-[slideUp_0.25s_ease-out]">
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-2 border-b border-pink-100/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff758c] to-[#ff0844] flex items-center justify-center text-white font-display font-black text-xl shadow-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-[#5c4d47] leading-tight">{userName}</h3>
              <p className="text-[10px] font-mono text-pink-600">{levelName} ({affection}/100)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-400 hover:text-[#5c4d47] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* Siklus Livia */}
        <div className="flex items-center justify-between bg-pink-50/50 border border-pink-100/80 rounded-2xl p-3">
          <div className="flex items-center gap-2.5">
            <Moon size={18} className={cycle.color.split(' ')[0]} />
            <div>
              <p className="font-mono text-[9px] font-bold text-[#7a7268] uppercase tracking-wider">Siklus Livia</p>
              <p className={`font-display font-black text-sm ${cycle.color.split(' ')[0]}`}>{cycle.phase}</p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-[#5c4d47] bg-white px-2.5 py-1 rounded-full border border-pink-100 shadow-2xs">
            H-{cycle.day}
          </span>
        </div>

        {/* Statistik Fisik */}
        <div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#7a7268] block mb-2">
            Status Fisik
          </span>
          <div className="grid grid-cols-3 gap-2">
            {physical.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center bg-[#fdfbf7] p-2.5 rounded-xl border border-pink-100/60">
                <Ring value={value} label={label} containerClass="w-10 h-10 mb-1" />
                <span className="text-xs font-medium text-[#5c4d47]">{label}</span>
                <span className="font-mono text-[10px] font-bold text-gray-500 tabular-nums">{value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Statistik Psikis */}
        <div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#7a7268] block mb-2">
            Status Psikis
          </span>
          <div className="grid grid-cols-3 gap-2">
            {psych.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center bg-[#fdfbf7] p-2.5 rounded-xl border border-pink-100/60">
                <Ring value={value} label={label} containerClass="w-10 h-10 mb-1" />
                <span className="text-xs font-medium text-[#5c4d47]">{label}</span>
                <span className="font-mono text-[10px] font-bold text-gray-500 tabular-nums">{value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
