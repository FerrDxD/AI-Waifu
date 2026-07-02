'use client';

import React, { useState, useEffect } from 'react';
import { checkDailyStatus, claimDailyReward, DAILY_REWARDS } from '@/lib/daily';
import { playSfx } from '@/lib/sfx';
import { Calendar, CheckCircle2, Gift, Sparkles, X, Lock, Flame } from 'lucide-react';

export default function DailyStampModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<{ nextDay: number; streak: number; claimedDays: number[] }>({
    nextDay: 1,
    streak: 0,
    claimedDays: []
  });
  const [claiming, setClaiming] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);

  useEffect(() => {
    // Delay sedikit agar tidak bertabrakan dengan animasi awal masuk
    const timer = setTimeout(() => {
      const res = checkDailyStatus();
      if (res.shouldShow) {
        setStatus(res);
        setIsOpen(true);
        playSfx('pop');
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleClaim = async () => {
    if (claiming || claimedToday) return;
    setClaiming(true);
    playSfx('coin');

    const newData = await claimDailyReward(status.nextDay);
    setStatus({
      nextDay: status.nextDay,
      streak: newData.streak,
      claimedDays: newData.claimedDays
    });
    setClaimedToday(true);
    setClaiming(false);

    // Otomatis tutup setelah 2.5 detik
    setTimeout(() => {
      setIsOpen(false);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-[#fdfbf7] max-w-2xl w-full rounded-[2.5rem] border-4 border-pink-200 shadow-[0_25px_60px_rgba(255,117,140,0.3)] overflow-hidden relative flex flex-col">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#ff758c] to-[#ff8fa3] p-6 md:p-8 text-white relative flex items-center justify-between">
          <div className="absolute top-0 right-0 w-64 h-full bg-white/10 transform skew-x-12 pointer-events-none" />
          
          <div className="flex items-center gap-4 z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/40 shadow-sm shrink-0">
              <Calendar className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase mb-1">
                <Flame size={14} className="text-amber-300 animate-bounce" /> Streak Login: {status.streak} Hari
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-black tracking-wide drop-shadow-sm">
                Hadiah Login Harian
              </h2>
            </div>
          </div>

          <button 
            onClick={() => { playSfx('click'); setIsOpen(false); }}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chibi Livia Greeting */}
        <div className="px-6 md:px-8 pt-6 pb-2 flex items-center gap-4 border-b border-pink-100/60 bg-pink-50/50">
          <div className="w-16 h-16 relative shrink-0">
            <img src="/livia/chibi-livia.webp" alt="Chibi Livia" className="w-full h-full object-contain animate-bounce" style={{ animationDuration: '2s' }} />
          </div>
          <p className="text-sm md:text-base text-[#5c4d47] font-medium italic">
            "Wah, kamu rajin banget mampir ke kos tiap hari! Sini, aku punya sedikit hadiah dan uang saku buatmu hari ini~"
          </p>
        </div>

        {/* 7-Day Grid */}
        <div className="p-6 md:p-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {DAILY_REWARDS.map((item) => {
            const isClaimed = status.claimedDays.includes(item.day) || (claimedToday && item.day === status.nextDay);
            const isCurrent = !isClaimed && item.day === status.nextDay;
            const isLocked = !isClaimed && item.day > status.nextDay;

            return (
              <div 
                key={item.day}
                className={`relative rounded-2xl p-4 flex flex-col items-center justify-between text-center border-2 transition-all duration-300 ${
                  isClaimed 
                    ? 'bg-pink-100/50 border-pink-200 text-gray-400 scale-95 opacity-70' 
                    : isCurrent 
                      ? 'bg-white border-[#ff758c] shadow-[0_8px_25px_rgba(255,117,140,0.25)] scale-105 z-10 ring-4 ring-pink-300/30 animate-[pulse_3s_infinite]' 
                      : 'bg-gray-50/80 border-gray-200 text-gray-400 opacity-60'
                } ${item.day === 7 ? 'col-span-2 sm:col-span-2 bg-gradient-to-br from-amber-50 to-pink-50 border-amber-300' : ''}`}
              >
                {/* Day Number Badge */}
                <div className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2 ${
                  isCurrent ? 'bg-[#ff758c] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {item.title}
                </div>

                {/* Reward Icon */}
                <div className="text-3xl md:text-4xl my-1 drop-shadow-sm">
                  {isLocked ? '🔒' : item.icon}
                </div>

                {/* Reward Description */}
                <span className={`text-xs md:text-sm font-bold leading-tight mt-1 ${
                  isCurrent ? 'text-[#5c4d47]' : ''
                }`}>
                  {item.rewardText}
                </span>

                {/* Stamp Overlay if Claimed */}
                {isClaimed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl">
                    <div className="border-4 border-red-500 text-red-500 font-black text-xs uppercase px-2 py-0.5 rounded-lg -rotate-12 tracking-widest shadow-sm animate-[stamp_0.3s_ease-out]">
                      SUDAH KLAIM
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Action Button */}
        <div className="p-6 bg-white border-t border-pink-100 flex items-center justify-between gap-4">
          <div className="text-xs text-gray-400 font-medium hidden sm:block">
            *Kalender akan direset ke Hari ke-1 setelah mencapai Hari ke-7.
          </div>

          <button
            onClick={handleClaim}
            disabled={claimedToday || claiming}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-display font-black text-base uppercase tracking-wider shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 ${
              claimedToday 
                ? 'bg-green-500 text-white cursor-default' 
                : 'bg-gradient-to-r from-[#ff758c] to-[#ff8fa3] text-white hover:shadow-pink-300 hover:scale-105 animate-bounce'
            }`}
          >
            {claimedToday ? (
              <>
                <CheckCircle2 className="w-6 h-6" /> Hadiah Hari Ini Sudah Diklaim!
              </>
            ) : (
              <>
                <Gift className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} /> KLAIM HADIAH HARI KE-{status.nextDay}!
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
