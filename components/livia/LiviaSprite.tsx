'use client';

import { LiviaExpression } from '@/lib/gemini';
import { useState } from 'react';
import Image from 'next/image';
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
  variant?: 'home' | 'wardrobe' | 'focus' | 'shop' | 'story';
  chapterId?: number;
}

const glowStyles: Record<LiviaExpression, string> = {
  normal: '',
  angry: 'drop-shadow-[0_0_20px_rgba(255,100,100,0.4)]',
  blushing: 'drop-shadow-[0_0_25px_rgba(255,182,193,0.5)]',
  clingy: 'drop-shadow-[0_0_20px_rgba(180,130,250,0.4)]',
  happy: 'drop-shadow-[0_0_20px_rgba(196,149,106,0.5)]',
  confused: 'drop-shadow-[0_0_20px_rgba(200,200,200,0.3)]',
  flirty: 'drop-shadow-[0_0_25px_rgba(255,105,180,0.5)]',
  pain: 'drop-shadow-[0_0_20px_rgba(150,150,150,0.4)]',
  pleased: 'drop-shadow-[0_0_20px_rgba(255,200,100,0.4)]',
  scared: 'drop-shadow-[0_0_20px_rgba(100,100,200,0.4)]',
  serious: 'drop-shadow-[0_0_20px_rgba(100,150,200,0.4)]',
  silly: 'drop-shadow-[0_0_20px_rgba(255,150,50,0.4)]',
};

export default function LiviaSprite({ expression, outfit = 'default', className = '',
  imgClassName = '',
  disableFloat = false,
  mixBlendMultiply = false,
  variant = 'home',
  chapterId
}: LiviaSpriteProps) {
  const [imgError, setImgError] = useState(false);
  
  let fileName = expression as string;
  if (outfit === 'home-screen' && expression === 'happy') {
    fileName = 'hapyy';
  }
  
  // Normalisasi string outfit (buang prefix "outfit_")
  const normalizedOutfit = outfit.startsWith('outfit_') ? outfit.replace('outfit_', '') : outfit;

  // Mapping khusus untuk folder home-screen (yang namanya aneh/typo dari awal)
  const homeFolderMap: Record<string, string> = {
    'default': 'default',
    'school': 'hightscool uniform',
    'trench_coat': 'trench-coat',
    'office_lady': 'office-lady', // jaga-jaga kalau filenya pakai strip
    // yang lain akan otomatis menggunakan normalizedOutfit
  };

  // Mapping khusus untuk wardrobe, focus, shop (jika ada perbedaan nama)
  const generalMap: Record<string, string> = {
    'school': 'uniform',
  };

  let folderPath = `home-screen/${homeFolderMap[normalizedOutfit] || normalizedOutfit}`;
  if (outfit === 'landing-page') folderPath = 'landing-page';

  let src = `/livia/${folderPath}/${fileName}.webp`;

  const mappedName = generalMap[normalizedOutfit] || normalizedOutfit;

  if (variant === 'wardrobe') {
    src = `/livia/wardrobe/${mappedName}.webp`;
  } else if (variant === 'focus') {
    src = `/livia/focus-page/${mappedName}.webp`;
  } else if (variant === 'shop') {
    src = `/livia/shop/${mappedName}/${fileName}.webp`;
  } else if (variant === 'story') {
    src = `/livia/Story-bab/${expression}.webp`;
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
        <Image
          src={src}
          alt={`Livia - ${expression}`}
          fill
          priority
          unoptimized={true}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={cn(
            "transition-all duration-300",
            imgClassName || "object-contain object-bottom",
            variant === 'story' ? '' : (glowStyles[expression as keyof typeof glowStyles] || ''),
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