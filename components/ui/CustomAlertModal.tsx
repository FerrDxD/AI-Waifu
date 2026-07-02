'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { playSfx } from '@/lib/sfx';
import { AlertDetail } from '@/lib/alert';

export default function CustomAlertModal() {
  const [currentAlert, setCurrentAlert] = useState<AlertDetail | null>(null);

  useEffect(() => {
    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent<AlertDetail>;
      if (customEvent.detail) {
        setCurrentAlert(customEvent.detail);
        playSfx('pop');
      }
    };

    window.addEventListener('temankos_alert', handleAlert);
    return () => window.removeEventListener('temankos_alert', handleAlert);
  }, []);

  if (!currentAlert) return null;

  const handleResolve = (result: boolean) => {
    playSfx(result ? 'click' : 'pop');
    const callback = currentAlert.onResolve;
    setCurrentAlert(null);
    if (callback) callback(result);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#fdfbf7] rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl border-2 border-orange-200 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-300 pt-12 mt-8">
        
        {/* Chibi Livia Header Icon */}
        <div className="absolute -top-14 w-28 h-28 drop-shadow-md animate-bounce pointer-events-none">
          <Image 
            src="/livia/chibi-livia.webp" 
            alt="Chibi Livia" 
            fill 
            className="object-contain" 
          />
        </div>

        {/* Title */}
        <h3 className="font-display font-black text-xl md:text-2xl text-[#5c4d47] mb-3">
          {currentAlert.title}
        </h3>

        {/* Message Content */}
        <div className="text-sm md:text-base font-medium text-gray-600 leading-relaxed mb-8 bg-orange-50/70 p-4.5 rounded-2xl border border-orange-100/80 w-full shadow-inner">
          {currentAlert.message}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-3 w-full">
          {currentAlert.type === 'confirm' ? (
            <>
              <button
                onClick={() => handleResolve(false)}
                className="flex-1 py-3.5 px-5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 font-bold text-sm text-gray-500 shadow-sm transition-all transform active:scale-95"
              >
                {currentAlert.cancelText || '❌ Batal'}
              </button>
              <button
                onClick={() => handleResolve(true)}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#ff758c] to-[#ff7eb3] hover:from-[#ff647e] hover:to-[#ff6da8] font-bold text-sm text-white shadow-md transition-all transform active:scale-95"
              >
                {currentAlert.confirmText || '✅ Ya, Lanjutkan'}
              </button>
            </>
          ) : (
            <button
              onClick={() => handleResolve(true)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#ff758c] to-[#ff7eb3] hover:from-[#ff647e] hover:to-[#ff6da8] font-bold text-base text-white shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              {currentAlert.confirmText || '✨ Mengerti'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
