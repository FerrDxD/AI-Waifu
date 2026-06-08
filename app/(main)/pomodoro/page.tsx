'use client';

import { useState, useEffect, useRef } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import DialogBox from '@/components/livia/DialogBox';
import { LiviaExpression } from '@/lib/gemini';
import { Play, Pause, RotateCcw } from 'lucide-react';

const MOTIVATIONS = [
  "Kalau kamu nyerah sekarang, aku yang malu.",
  "Fokus. Aku lagi perhatiin kamu.",
  "Jangan ganggu aku... tapi aku di sini kok.",
  "Sudah setengah jalan. Jangan jadi pengecut.",
  "...Kamu bisa. Tapi jangan bilang aku yang bilang."
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
            setDialog("Hei, kamu pause dari tadi. Lanjutin!");
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
      setDialog("Kerja bagus... I-iya, lumayan lah.");
      
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
      setDialog("Waktu istirahat habis. Ayo mulai lagi.");
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-pink-50 relative p-6 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-50 blur-[2px] pointer-events-none"
        style={{ backgroundImage: "url('/bg/bedroom.png')" }} 
      />
      
      {showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉✨🎊</div>
        </div>
      )}

      <div className="z-10 w-full max-w-5xl flex flex-col md:flex-row items-center gap-12 bg-white/60 backdrop-blur-xl p-10 rounded-[3rem] border-4 border-white shadow-[0_20px_60px_rgba(255,154,158,0.2)]">
        
        {/* Left: Timer */}
        <div className="flex-1 flex flex-col items-center">
          <div className="bg-pink-100 text-pink-500 font-display font-bold px-6 py-2 rounded-full mb-8 shadow-sm">
            {isBreak ? "Waktu Istirahat" : "Sesi Fokus"}
          </div>
          
          <div className="text-8xl md:text-9xl font-mono font-black tracking-wider text-pink-500 mb-12 drop-shadow-md">
            {formatTime(timeLeft)}
          </div>

          <div className="flex gap-6">
            <button 
              onClick={toggleTimer}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-400 to-pink-500 text-white flex items-center justify-center hover:scale-110 transition-all shadow-lg hover:shadow-xl"
            >
              {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-2" />}
            </button>
            
            <button 
              onClick={resetTimer}
              className="w-20 h-20 rounded-full bg-white border-4 border-pink-100 text-pink-400 flex items-center justify-center hover:bg-pink-50 hover:scale-110 transition-all shadow-md"
            >
              <RotateCcw className="w-8 h-8" />
            </button>
          </div>
        </div>

        {/* Right: Livia Sidekick */}
        <div className="w-full md:w-96 flex flex-col items-center gap-6">
          <div className="h-72 w-56 relative drop-shadow-[0_10px_20px_rgba(255,154,158,0.3)]">
            <LiviaSprite expression={expression} className="h-full w-full object-contain" />
          </div>
          <div className="w-full">
            <DialogBox text={dialog} speaker="Livia" />
          </div>
        </div>

      </div>
    </div>
  );
}
