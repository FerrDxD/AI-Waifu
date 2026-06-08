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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-texture.png')] bg-cover relative p-6">
      <div className="absolute inset-0 bg-background/90 z-0" />
      
      {showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉✨🎊</div>
        </div>
      )}

      <div className="z-10 w-full max-w-4xl flex flex-col md:flex-row items-center gap-12">
        
        {/* Left: Timer */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-2xl font-display italic text-accent mb-8">
            {isBreak ? "Waktu Istirahat" : "Sesi Fokus"}
          </h2>
          
          <div className="text-8xl md:text-9xl font-mono font-light tracking-wider text-text-primary mb-12 drop-shadow-2xl">
            {formatTime(timeLeft)}
          </div>

          <div className="flex gap-6">
            <button 
              onClick={toggleTimer}
              className="w-20 h-20 rounded-full bg-accent text-black flex items-center justify-center hover:bg-[#d6a578] hover:scale-105 transition-all shadow-lg"
            >
              {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-2" />}
            </button>
            
            <button 
              onClick={resetTimer}
              className="w-20 h-20 rounded-full border border-custom text-text-primary flex items-center justify-center hover:bg-surface hover:scale-105 transition-all shadow-lg"
            >
              <RotateCcw className="w-8 h-8" />
            </button>
          </div>
        </div>

        {/* Right: Livia Sidekick */}
        <div className="w-full md:w-80 flex flex-col items-center gap-6">
          <div className="h-64 w-48 relative">
            <LiviaSprite expression={expression} className="h-full w-full" />
          </div>
          <div className="w-full">
            <DialogBox text={dialog} speaker="Livia" />
          </div>
        </div>

      </div>
    </div>
  );
}
