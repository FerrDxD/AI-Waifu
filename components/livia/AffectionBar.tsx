'use client';

import { Heart } from 'lucide-react';

interface AffectionBarProps {
  affection: number;
  level: number;
  levelName: string;
}

export default function AffectionBar({ affection, level, levelName }: AffectionBarProps) {
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white/80 backdrop-blur-md border-2 border-pink-200 rounded-3xl shadow-[0_8px_20px_rgba(255,154,158,0.2)] hover:shadow-[0_12px_25px_rgba(255,154,158,0.3)] transition-all">
      <div className="flex justify-between items-center mb-3 px-2">
        <span className="text-sm font-display font-bold text-pink-500 flex items-center gap-2">
          <Heart size={16} className="fill-pink-400 text-pink-400" />
          Lv. {level} - {levelName}
        </span>
        <span className="text-sm font-mono font-bold text-pink-400 bg-pink-100 px-3 py-1 rounded-full">
          {affection} / 100
        </span>
      </div>
      
      <div className="w-full h-4 bg-pink-50 rounded-full overflow-hidden border border-pink-100 shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-pink-300 to-pink-500 transition-all duration-1000 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, affection))}%` }}
        />
      </div>
    </div>
  );
}
