'use client';

import React, { useState, useEffect } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';

const VN_TIPS = [
  "Tip: Semakin tinggi afeksi Livia, semakin banyak fitur yang terbuka!",
  "Tip: Jangan lupa menyiram tanaman di kebun agar tidak layu.",
  "Tip: Livia sangat suka makanan manis, terutama permen dan dango.",
  "Tip: Gunakan fitur Pomodoro untuk membantumu fokus belajar atau bekerja.",
  "Tip: Baju baru yang kamu beli di toko bisa dipakai Livia di Lemari.",
  "Tip: Kalau Livia kelaparan, dia bisa marah dan menolak diajak ngobrol.",
  "Tip: Selesaikan misi harian untuk mendapatkan uang lebih banyak.",
  "Tip: Livia mungkin galak di luar, tapi sebenarnya dia sangat peduli padamu."
];

interface LoadingScreenProps {
  text?: string;
  showTip?: boolean;
}

export default function LoadingScreen({ text = "Now Loading...", showTip = true }: LoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * VN_TIPS.length));
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-[#fdfbf7] flex flex-col items-center justify-center font-sans select-none overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_#fdfbf7_100%)] opacity-80 z-0 pointer-events-none" />
      <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ff758c05 25%, transparent 25%, transparent 75%, #ff758c05 75%, #ff758c05), repeating-linear-gradient(45deg, #ff758c05 25%, #fdfbf7 25%, #fdfbf7 75%, #ff758c05 75%, #ff758c05)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }} />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
        
        {/* Animated Sprite Placeholder (Bounce) */}
        <div className="w-32 h-32 md:w-40 md:h-40 mb-6 relative animate-bounce">
          <LiviaSprite expression="happy" outfit="default" disableFloat={true} />
        </div>

        {/* Loading Text */}
        <h2 className="text-2xl md:text-3xl font-display font-black text-pink-500 tracking-widest uppercase mb-6 flex items-center gap-1">
          {text.replace('...', '')}
          <span className="animate-[ping_1.5s_infinite_0s]">.</span>
          <span className="animate-[ping_1.5s_infinite_0.2s]">.</span>
          <span className="animate-[ping_1.5s_infinite_0.4s]">.</span>
        </h2>

        {/* VN Style Tip Box */}
        {showTip && (
          <div className="w-full bg-white/80 backdrop-blur-sm border-2 border-pink-200 rounded-xl p-4 shadow-sm relative mt-4">
            <div className="absolute -top-3 left-4 bg-pink-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              System Tip
            </div>
            <p className="text-sm md:text-base text-gray-600 font-medium leading-relaxed italic">
              "{VN_TIPS[tipIndex]}"
            </p>
          </div>
        )}
      </div>
      
    </div>
  );
}
