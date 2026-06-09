'use client';

import { LiviaExpression } from '@/lib/gemini';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LiviaSpriteProps {
  expression: LiviaExpression;
  outfit?: string;
  className?: string;
}

const glowStyles: Record<LiviaExpression, string> = {
  normal: '',
  angry: 'drop-shadow-[0_0_20px_rgba(255,100,100,0.4)]',
  blushing: 'drop-shadow-[0_0_25px_rgba(255,182,193,0.5)]',
  clingy: 'drop-shadow-[0_0_20px_rgba(180,130,250,0.4)]',
  happy: 'drop-shadow-[0_0_20px_rgba(196,149,106,0.5)]',
};

export default function LiviaSprite({ expression, outfit = 'default', className }: LiviaSpriteProps) {
  const [imgError, setImgError] = useState(false);
  const src = outfit === 'default' ? `/livia/${expression}.png` : `/livia/${outfit}/${expression}.png`;

  return (
    <div className={cn(
      "relative flex items-end justify-center",
      "animate-[float_3s_ease-in-out_infinite]",
      className
    )}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {imgError ? (
        // Fallback hanya muncul kalau gambar benar-benar gagal load
        <div className="w-48 h-64 flex flex-col items-center justify-center rounded-xl border border-pink-200 bg-pink-50 shadow-inner">
          <span className="text-pink-400 text-xs font-bold uppercase tracking-widest mb-1">Livia</span>
          {outfit !== 'default' && <span className="text-pink-300 text-[10px] italic">({outfit})</span>}
        </div>
      ) : (
        <img
          src={src}
          alt={`Livia - ${expression}`}
          className={cn(
            "w-full h-full object-contain object-bottom",
            "transition-all duration-300",
            glowStyles[expression]
          )}
          style={{ 
            WebkitMaskImage: 'none',
            background: 'transparent',
          }}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}