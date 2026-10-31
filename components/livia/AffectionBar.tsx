'use client';

import { Heart } from 'lucide-react';

interface AffectionBarProps {
  affection: number;
  level: number;
  levelName: string;
  className?: string;
}

export default function AffectionBar({
  affection,
  level,
  levelName,
  className = '',
}: AffectionBarProps) {
  const boundedAffection = Math.max(0, Math.min(100, affection));

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      <div className="flex justify-between items-center px-0.5">
        <span className="text-xs font-display font-bold text-[#5c4d47] flex items-center gap-1.5">
          <Heart size={14} className="fill-pink-500 text-pink-500 shrink-0" />
          <span>
            Lv. {level} <span className="text-[#7a7268] font-normal">— {levelName}</span>
          </span>
        </span>
        <span className="font-mono font-bold text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80 shadow-xs tabular-nums">
          {boundedAffection} / 100
        </span>
      </div>

      <div className="w-full h-3.5 bg-pink-50 rounded-full overflow-hidden border border-pink-100/90 shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-pink-300 via-pink-400 to-pink-500 rounded-full transition-all duration-1000 ease-out relative"
          style={{ width: `${boundedAffection}%` }}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
