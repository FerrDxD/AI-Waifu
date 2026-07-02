'use client';

import React, { useState, useEffect } from 'react';
import { Achievement } from '@/lib/achievements';
import { Trophy, Sparkles, X, Gift } from 'lucide-react';

export default function AchievementToast() {
  const [activeToast, setActiveToast] = useState<Achievement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleUnlock = (e: Event) => {
      const customEvent = e as CustomEvent<Achievement>;
      if (customEvent.detail) {
        setActiveToast(customEvent.detail);
        setVisible(true);

        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(() => setActiveToast(null), 500);
        }, 5000);

        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('achievement_unlocked', handleUnlock);
    return () => window.removeEventListener('achievement_unlocked', handleUnlock);
  }, []);

  if (!activeToast && !visible) return null;

  return (
    <div className={`fixed top-20 right-4 md:right-10 z-[200] max-w-sm w-full transition-all duration-500 transform ${
      visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-12 opacity-0 scale-90 pointer-events-none'
    }`}>
      <div className="relative bg-gradient-to-r from-amber-50 via-white to-pink-50 border-2 border-amber-300 rounded-3xl p-4 md:p-5 shadow-[0_15px_35px_rgba(245,158,11,0.25)] flex items-center gap-4 overflow-hidden group">
        
        {/* Glow & Sparkles Decor */}
        <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-200/40 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform" />
        <Sparkles className="absolute top-2 right-12 text-amber-400 w-4 h-4 animate-spin pointer-events-none" style={{ animationDuration: '4s' }} />

        {/* Trophy Icon Box */}
        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 rotate-[-6deg] group-hover:rotate-0 transition-transform">
          <span className="text-2xl drop-shadow-sm">{activeToast?.icon || '🏆'}</span>
        </div>

        {/* Info Content */}
        <div className="flex-1 flex flex-col pr-6">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600">
            <Trophy size={12} className="animate-bounce" /> Achievement Unlocked!
          </div>
          <h4 className="font-display font-black text-base text-[#5c4d47] leading-tight mt-0.5">
            {activeToast?.title}
          </h4>
          <p className="text-xs text-gray-500 leading-snug mt-1 font-medium">
            {activeToast?.description}
          </p>
          {activeToast?.rewardRv && activeToast.rewardRv > 0 ? (
            <div className="mt-2 inline-flex items-center gap-1 bg-amber-100/80 border border-amber-300/60 text-amber-800 font-bold text-xs px-2.5 py-0.5 rounded-full w-max">
              <Gift size={12} className="text-amber-600" /> +{activeToast.rewardRv} Rv Hadiah!
            </div>
          ) : null}
        </div>

        {/* Close Button */}
        <button 
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>

      </div>
    </div>
  );
}
