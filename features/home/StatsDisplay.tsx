'use client';

import { X, Heart, Moon, Utensils, Battery, Droplet, Smile, Zap, Shield } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CycleInfo } from './cycle';

/**
 * Pitar statistik Livia (M5.1) — island desktop + modal mobile.
 *
 * Ikon & warna per-statistik pernah hidup sebagai array JSX di HomeClient;
 * sekarang dicari dari label lewat STAT_STYLE sehingga komponen ini hanya
 * menerima angka. Rumus perhitungannya sendiri ada di cycle.ts.
 */

export type StatItem = { value: number; label: string };

const STAT_STYLE: Record<string, { icon: ReactNode; strokeColor: string; iconColor: string }> = {
  Makan: { icon: <Utensils size={12} />, strokeColor: 'stroke-orange-400', iconColor: 'text-orange-500' },
  Energi: { icon: <Battery size={12} />, strokeColor: 'stroke-yellow-400', iconColor: 'text-yellow-500' },
  Minum: { icon: <Droplet size={12} />, strokeColor: 'stroke-blue-400', iconColor: 'text-blue-500' },
  Mood: { icon: <Smile size={12} />, strokeColor: 'stroke-rose-400', iconColor: 'text-rose-500' },
  Stres: { icon: <Zap size={12} />, strokeColor: 'stroke-purple-400', iconColor: 'text-purple-500' },
  Sabar: { icon: <Shield size={12} />, strokeColor: 'stroke-emerald-400', iconColor: 'text-emerald-500' },
};

const CIRC = 100.53;

/**
 * Cincin SVG satu statistik.
 * `containerClass` menentukan ukuran kotak (desktop w-10 h-10, mobile w-11 h-11
 * di luar); `trackClass` membedakan warna lintah antar tampilan seperti aslinya.
 */
function Ring({
  value,
  label,
  containerClass,
  trackClass = 'stroke-gray-100',
}: {
  value: number;
  label: string;
  containerClass: string;
  trackClass?: string;
}) {
  const style = STAT_STYLE[label];
  return (
    <div className={`relative flex items-center justify-center ${containerClass}`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" className={`fill-transparent ${trackClass}`} strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r="16"
          className={`fill-transparent ${style.strokeColor} transition-all duration-1000`}
          strokeWidth="4"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC - (value / 100) * CIRC}
          strokeLinecap="round"
        />
      </svg>
      <div className={`absolute flex items-center justify-center ${style.iconColor}`}>{style.icon}</div>
    </div>
  );
}

/** Island statistik desktop (verbatim dari HomeClient). */
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
    <div className="hidden md:flex bg-white/90 backdrop-blur-2xl rounded-[2rem] p-4 border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.08)] items-center gap-2 self-start w-auto origin-bottom-left">
      {/* Label baris */}
      <div className="flex flex-col justify-around gap-4 pr-3 border-r border-gray-100/80">
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Fisik</span>
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Psikis</span>
      </div>

      <div className="flex flex-col gap-2.5 pl-3">
        {/* Fisik */}
        <div className="flex items-center gap-3">
          {physical.map(({ value, label }) => (
            <div key={label} title={`${label}: ${value}%`} className="flex flex-col items-center gap-0.5">
              <Ring value={value} label={label} containerClass="w-10 h-10" />
              <span className="text-[7px] font-bold text-gray-400 tabular-nums">{value}%</span>
            </div>
          ))}
        </div>
        {/* Psikis */}
        <div className="flex items-center gap-3">
          {psych.map(({ value, label }) => (
            <div key={label} title={`${label}: ${value}%`} className="flex flex-col items-center gap-0.5">
              <Ring value={value} label={label} containerClass="w-10 h-10" />
              <span className="text-[7px] font-bold text-gray-400 tabular-nums">{value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider + Siklus */}
      <div className="w-px h-16 bg-gray-100 mx-2" />
      <div className="flex flex-col items-center text-center min-w-[68px] gap-1 px-1">
        <Moon size={15} className={`${cycle.color.split(' ')[0]} drop-shadow-sm`} />
        <span className={`text-[10px] font-black leading-tight ${cycle.color.split(' ')[0]}`}>{cycle.phase}</span>
        <span className="text-[8px] text-gray-400 font-bold">H-{cycle.day}</span>
      </div>
    </div>
  );
}

/** Modal statistik mobile (verbatim dari HomeClient). */
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
      <div className="bg-white w-full max-w-[340px] rounded-[2rem] p-6 shadow-2xl border border-gray-50 flex flex-col gap-5 animate-[slideUp_0.25s_ease-out]">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-pink-200 to-pink-400 rounded-full flex items-center justify-center text-white font-black font-display text-xl shadow-sm border-2 border-white flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-[#5c4d47] text-lg leading-tight">{userName}</span>
              <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full w-fit border border-pink-100 mt-0.5">
                {levelName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-gray-50 text-gray-400 rounded-full active:scale-95 transition-transform border border-gray-100 hover:bg-gray-100 focus-visible:outline-none"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Bar afeksi */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Heart size={14} className="fill-pink-500 text-pink-500" />
              <span className="font-bold text-[#5c4d47] text-sm">Afeksi</span>
            </div>
            <span className="font-mono font-black text-sm text-[#5c4d47] tabular-nums">{affection}/100</span>
          </div>
          <div className="relative w-full h-5 bg-pink-50 rounded-full border border-pink-100/80 overflow-hidden shadow-inner">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-400 to-pink-500 transition-all duration-700 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, affection))}%` }}
            />
          </div>
        </div>

        {/* Statistik */}
        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Kondisi Livia</span>
            <div className={`text-[9px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${cycle.color}`}>
              <Moon size={9} /> {cycle.phase}
            </div>
          </div>

          {/* Fisik */}
          <div className="flex justify-around items-start">
            {physical.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Ring value={value} label={label} containerClass="w-11 h-11" trackClass="stroke-gray-200" />
                <span className="text-[8px] font-bold text-gray-500">{label}</span>
                <span className="text-[9px] font-black text-gray-700 tabular-nums">{value}%</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200/60" />

          {/* Psikis */}
          <div className="flex justify-around items-start">
            {psych.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Ring value={value} label={label} containerClass="w-11 h-11" trackClass="stroke-gray-200" />
                <span className="text-[8px] font-bold text-gray-500">{label}</span>
                <span className="text-[9px] font-black text-gray-700 tabular-nums">{value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
