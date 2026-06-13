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
  imgClassName?: string;
  disableFloat?: boolean;
  mixBlendMultiply?: boolean;
  variant?: 'home' | 'wardrobe' | 'focus';
}

const glowStyles: Record<LiviaExpression, string> = {
  normal: '',
  angry: 'drop-shadow-[0_0_20px_rgba(255,100,100,0.4)]',
  blushing: 'drop-shadow-[0_0_25px_rgba(255,182,193,0.5)]',
  clingy: 'drop-shadow-[0_0_20px_rgba(180,130,250,0.4)]',
  happy: 'drop-shadow-[0_0_20px_rgba(196,149,106,0.5)]',
};

export default function LiviaSprite({ expression, outfit = 'default', className, imgClassName, disableFloat = false, mixBlendMultiply = false, variant = 'home' }: LiviaSpriteProps) {
  const [imgError, setImgError] = useState(false);
  
  let fileName = expression as string;
  if (outfit === 'home-screen' && expression === 'happy') {
    fileName = 'hapyy';
  }
  
  // Map outfit IDs to actual folder paths
  let folderPath = 'home-screen/default'; // fallback
  if (outfit === 'landing-page') {
    folderPath = 'landing-page';
  } else if (outfit === 'default') {
    folderPath = 'home-screen/default';
  } else if (outfit === 'outfit_casual' || outfit === 'casual') {
    folderPath = 'home-screen/casual';
  } else if (outfit === 'outfit_school' || outfit === 'school') {
    folderPath = 'home-screen/hightscool uniform';
  } else if (outfit === 'outfit_yukata' || outfit === 'yukata') {
    folderPath = 'home-screen/yukata';
  }

  let src = `/livia/${folderPath}/${fileName}.png`;

  if (variant === 'wardrobe') {
    let wardrobeFileName = 'default';
    if (outfit === 'outfit_casual' || outfit === 'casual') wardrobeFileName = 'casual';
    else if (outfit === 'outfit_school' || outfit === 'school') wardrobeFileName = 'uniform';
    else if (outfit === 'outfit_yukata' || outfit === 'yukata') wardrobeFileName = 'yukata';
    
    src = `/livia/wardrobe/${wardrobeFileName}.png`;
  } else if (variant === 'focus') {
    let focusFileName = 'default';
    if (outfit === 'outfit_casual' || outfit === 'casual') focusFileName = 'casual';
    else if (outfit === 'outfit_school' || outfit === 'school') focusFileName = 'uniform';
    else if (outfit === 'outfit_yukata' || outfit === 'yukata') focusFileName = 'yukata';
    
    src = `/livia/focus-page/${focusFileName}.png`;
  }

  return (
    <div className={cn(
      "relative flex items-end justify-center",
      !disableFloat && "animate-[float_3s_ease-in-out_infinite]",
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
            "w-full h-full transition-all duration-300",
            imgClassName || "object-contain object-bottom",
            glowStyles[expression],
            mixBlendMultiply && "mix-blend-multiply"
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