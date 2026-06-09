'use client';

import { useState, useEffect, useRef } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';
import { Play, Pause, RotateCcw } from 'lucide-react';
import Link from 'next/link';

const MOTIVATIONS = [
  "Kalau kamu nyerah sekarang, aku yang malu.",
  "Fokus. Aku lagi perhatiin kamu.",
  "Jangan berisik... aku lagi baca ini.",
  "Sudah setengah jalan. Jangan jadi pengecut.",
  "...Kamu bisa. Tapi jangan bilang aku yang nyemangatin."
];

export default function PomodoroPage() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [dialog, setDialog] = useState(MOTIVATIONS[0]);
  const [expression, setExpression] = useState<LiviaExpression>('normal');
  const [showConfetti, setShowConfetti] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeRef = useRef<number>(0);
  const pauseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
        pauseTimeRef.current = 0;
        setExpression('normal');
        setDialog(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Track pause duration
      if (timeLeft < 25 * 60 && timeLeft > 0) {
        pauseIntervalRef.current = setInterval(() => {
          pauseTimeRef.current += 1;
          if (pauseTimeRef.current > 300) { // > 5 mins
            setExpression('angry');
            setDialog("Hei, bukunya udah nungguin tuh. Lanjutin belajarnya!");
          }
        }, 1000);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseIntervalRef.current) clearInterval(pauseIntervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleComplete = async () => {
    setIsRunning(false);
    if (!isBreak) {
      setShowConfetti(true);
      setExpression('blushing');
      setDialog("Akhirnya selesai juga... I-iya, lumayan lah usahamu.");
      
      // Update affection
      try {
        await fetch('/api/affection', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta: 5, reason: 'pomodoro' }),
        });
      } catch (e) {
        console.error(e);
      }

      setTimeout(() => {
        setShowConfetti(false);
        setIsBreak(true);
        setTimeLeft(5 * 60);
      }, 3000);
    } else {
      setIsBreak(false);
      setTimeLeft(25 * 60);
      setExpression('normal');
      setDialog("Waktu istirahat habis. Aku buka halaman selanjutnya ya.");
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(25 * 60);
    setExpression('normal');
    setDialog(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#fdfbf7] relative overflow-hidden font-sans select-none">
      
      {/* Background Decor */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 blur-[2px] pointer-events-none mix-blend-multiply"
        style={{ backgroundImage: "url('/bg/bedroom.png')" }} 
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/5 pointer-events-none z-0" />
      
      {showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="text-8xl animate-bounce drop-shadow-2xl">🎉✨🎊</div>
        </div>
      )}

      {/* Back button */}
      <div className="absolute top-6 left-6 z-30">
        <Link href="/home" className="flex items-center justify-center w-12 h-12 bg-white/80 backdrop-blur-md rounded-full text-pink-500 shadow-sm hover:bg-[#ff758c] hover:text-white transition-colors">
          <span className="text-xl font-black">←</span>
        </Link>
      </div>

      {/* Left Area: Timer */}
      <div className="w-full md:w-[45%] flex flex-col items-center justify-center relative z-20 h-full pt-16 md:pt-0 pb-10">
        
        <div className="bg-white/80 backdrop-blur-md text-[#ff758c] font-display font-black px-10 py-3 rounded-full mb-10 shadow-[0_5px_15px_rgba(255,117,140,0.1)] border-2 border-pink-100 tracking-widest text-lg">
          {isBreak ? "WAKTUNYA ISTIRAHAT" : "MODE FOKUS"}
        </div>

        {/* Circular Timer Display */}
        <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-full bg-white/90 shadow-[inset_0_4px_20px_rgba(0,0,0,0.03),_0_20px_50px_rgba(255,154,158,0.2)] flex items-center justify-center border-[12px] border-pink-50 backdrop-blur-xl">
          {/* Coral Progress Ring SVG */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#fff5f5" strokeWidth="6" />
            <circle 
              cx="50" cy="50" r="45" fill="none" stroke="#ff758c" strokeWidth="6" 
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - (timeLeft / (isBreak ? 5*60 : 25*60)))}`}
              className="transition-all duration-1000 ease-linear"
              style={{ filter: 'drop-shadow(0px 0px 6px rgba(255,117,140,0.4))' }}
            />
          </svg>

          <div className="text-6xl md:text-7xl font-display font-black tracking-widest text-[#5c4d47] z-10 drop-shadow-sm ml-2">
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-6 mt-12 items-center">
          <button 
            onClick={toggleTimer}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all shadow-xl hover:-translate-y-1 border-4 border-white ${isRunning ? 'bg-amber-400 text-white hover:bg-amber-500 hover:shadow-amber-200/50' : 'bg-gradient-to-tr from-[#ff0844] to-[#ffb199] text-white hover:shadow-pink-300/50'}`}
          >
            {isRunning ? <Pause className="w-10 h-10 md:w-12 md:h-12 fill-current" /> : <Play className="w-10 h-10 md:w-12 md:h-12 fill-current ml-2" />}
          </button>
          
          <button 
            onClick={resetTimer}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border-4 border-pink-50 text-gray-400 flex items-center justify-center hover:bg-pink-50 hover:text-pink-400 hover:border-pink-100 transition-all shadow-md hover:-translate-y-0.5"
          >
            <RotateCcw className="w-7 h-7 md:w-8 md:h-8" />
          </button>
        </div>

      </div>

      {/* Right Area: Livia */}
      <div className="flex-1 relative flex flex-col items-center justify-end h-full z-10 pb-10">
        
        {/* Reaction Bubble (Teman Kos style) */}
        <div className="absolute top-[15%] md:top-[20%] left-1/2 md:left-10 -translate-x-1/2 md:-translate-x-0 bg-white/90 backdrop-blur-xl rounded-[2rem] rounded-bl-sm p-6 shadow-2xl border-2 border-pink-100 max-w-[300px] animate-[float_4s_ease-in-out_infinite] z-20">
          <p className="text-lg font-bold text-[#5c4d47] leading-relaxed text-center md:text-left">
            "{dialog}"
          </p>
        </div>

        {/* Livia Sprite */}
        <div className="w-full h-full flex justify-center items-end absolute inset-0 z-10">
          <LiviaSprite 
            expression={expression} 
            className="h-[60vh] md:h-[75vh] w-auto max-w-[600px] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(255,117,140,0.15)] pointer-events-auto"
          />
        </div>

        {/* Status Widget */}
        <div className="absolute bottom-10 z-20 bg-white/80 backdrop-blur-md px-8 py-4 rounded-3xl shadow-lg border border-pink-50 flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <span className="font-bold text-[#5c4d47]">Livia sedang fokus belajar...</span>
        </div>

      </div>

    </div>
  );
}
