'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Sparkles, Coffee, Zap, Moon, Flame, ArrowLeft, Settings, Plus, Minus, Clock, Folder, MessageSquareHeart, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { unlockAchievement } from '@/lib/achievements';
import { playSfx } from '@/lib/sfx';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const MOTIVATIONS = [
  "Kalau kamu nyerah sekarang, aku yang malu. Fokus ya!",
  "Aku lagi perhatiin kamu dari jauh. Jangan buka sosmed!",
  "Satu sesi lagi selesai, nanti aku buatin teh hangat.",
  "Sudah setengah jalan. Jangan jadi pengecut, selesaikan apa yang kamu mulai!",
  "...Kamu hebat. Tapi jangan bilang aku yang memujimu barusan.",
  "Orang sukses itu dibentuk dari konsistensi kecil setiap hari.",
  "Bukunya jangan cuma dipandang, dibaca dan dipahami dong!"
];

const EN_MOTIVATIONS = [
  "If you give up now, I'll be embarrassed. Stay focused!",
  "I'm watching you from afar. Don't open social media!",
  "Finish one more session and I'll make you warm tea.",
  "You're halfway there. Finish what you started!",
  "...You're amazing. But don't say I just praised you.",
  "Successful people are made from small daily consistencies.",
  "Don't just stare at your screen or books—actually study!"
];

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface ModeConfig {
  label: string;
  defaultMinutes: number;
  icon: any;
  color: string;
  ringColor: string;
  badgeBg: string;
}

const MODES: Record<TimerMode, ModeConfig> = {
  focus: {
    label: 'Fokus Utama',
    defaultMinutes: 25,
    icon: Zap,
    color: 'from-[#ff758c] to-[#ff7eb3]',
    ringColor: '#ff758c',
    badgeBg: 'bg-pink-50 text-[#ff758c] border-pink-200'
  },
  shortBreak: {
    label: 'Istirahat Singkat',
    defaultMinutes: 5,
    icon: Coffee,
    color: 'from-emerald-400 to-teal-500',
    ringColor: '#10b981',
    badgeBg: 'bg-emerald-50 text-emerald-600 border-emerald-200'
  },
  longBreak: {
    label: 'Istirahat Panjang',
    defaultMinutes: 15,
    icon: Moon,
    color: 'from-indigo-400 to-purple-500',
    ringColor: '#6366f1',
    badgeBg: 'bg-indigo-50 text-indigo-600 border-indigo-200'
  }
};

export default function PomodoroPage() {
  const { dict, language } = useLanguage();
  const [mode, setMode] = useState<TimerMode>('focus');
  
  // Custom durations in minutes
  const [customMinutes, setCustomMinutes] = useState<Record<TimerMode, number>>({
    focus: 25,
    shortBreak: 5,
    longBreak: 15
  });

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [dialog, setDialog] = useState(language === 'en' ? EN_MOTIVATIONS[0] : MOTIVATIONS[0]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  const getModeLabel = (m: TimerMode) => {
    if (language === 'en') {
      if (m === 'focus') return 'Main Focus';
      if (m === 'shortBreak') return 'Short Break';
      if (m === 'longBreak') return 'Long Break';
    }
    return MODES[m].label;
  };
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeRef = useRef<number>(0);
  const pauseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
        pauseTimeRef.current = 0;
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
      
      const currentTotalSecs = customMinutes[mode] * 60;
      if (timeLeft < currentTotalSecs && timeLeft > 0 && mode === 'focus') {
        pauseIntervalRef.current = setInterval(() => {
          pauseTimeRef.current += 1;
          if (pauseTimeRef.current > 300) {
            setDialog("Hei, tugasmu belum selesai lho! Ayo fokus lagi!");
          }
        }, 1000);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseIntervalRef.current) clearInterval(pauseIntervalRef.current);
    };
  }, [isRunning, timeLeft, mode, customMinutes]);

  const handleComplete = async () => {
    setIsRunning(false);
    playSfx('chime');
    
    if (mode === 'focus') {
      unlockAchievement('pomo_first');
      setShowConfetti(true);
      setCompletedSessions(prev => prev + 1);
      setDialog("Luarr biasa! Satu sesi fokus berhasil dituntaskan dengan sempurna. Istirahat sebentar ya!");
      
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
        switchMode('shortBreak');
      }, 4000);
      setDialog(language === 'en' 
        ? "Break time is over! Feeling refreshed? Let's start the next session!" 
        : "Waktu istirahat selesai! Badan sudah segar kan? Mari kita mulai sesi berikutnya!");
      switchMode('focus');
    }
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(customMinutes[newMode] * 60);
    if (newMode === 'focus') {
      const list = language === 'en' ? EN_MOTIVATIONS : MOTIVATIONS;
      setDialog(list[Math.floor(Math.random() * list.length)]);
    } else {
      setDialog(language === 'en'
        ? "Relax, stretch your muscles, or drink some water to stay refreshed."
        : "Santai dulu, regangkan otot, atau minum air putih biar konsentrasimu terjaga.");
    }
  };

  const adjustMinutes = (targetMode: TimerMode, delta: number) => {
    playSfx('click');
    setCustomMinutes(prev => {
      const current = prev[targetMode];
      const updated = Math.max(1, Math.min(120, current + delta));
      const nextMap = { ...prev, [targetMode]: updated };
      
      // If updating currently active mode while stopped, update timer immediately
      if (targetMode === mode && !isRunning) {
        setTimeLeft(updated * 60);
      }
      return nextMap;
    });
  };

  const toggleTimer = () => {
    if (!isRunning) playSfx('click');
    setIsRunning(!isRunning);
  };
  
  const resetTimer = () => {
    playSfx('click');
    setIsRunning(false);
    setTimeLeft(customMinutes[mode] * 60);
    setDialog(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);
  };

  const getRandomMotivation = () => {
    playSfx('click');
    const randomQuote = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
    setDialog(randomQuote);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentConfig = MODES[mode];
  const totalDurationSecs = customMinutes[mode] * 60;
  const progress = 1 - (timeLeft / totalDurationSecs);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-[#fdfbf7] text-[#5c4d47] relative overflow-hidden font-sans select-none flex flex-col justify-between p-4 md:p-6">
      
      {/* Subtle Pastel Ambient Decor (Teman Kos Vibe) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-pink-100/60 blur-[90px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-amber-100/50 blur-[90px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-rose-100/50 blur-[90px]" />
      </div>
      
      {showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-white/40 backdrop-blur-sm animate-fade-in">
          <div className="text-center p-6 rounded-3xl bg-white shadow-2xl border-2 border-pink-200">
            <div className="text-7xl animate-bounce drop-shadow-md mb-3">🎉✨🍅</div>
            <h2 className="text-2xl font-display font-black text-[#5c4d47] tracking-wider">SESI FOKUS SELESAI!</h2>
            <p className="text-[#ff758c] font-bold mt-1 text-sm">+5 Poin Afeksi Livia & Produktivitas Meningkat</p>
          </div>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="relative z-20 flex items-center justify-between shrink-0 mb-2">
        <Link 
          href="/home" 
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 hover:bg-white border border-pink-100 shadow-sm hover:shadow-md transition-all text-[#ff758c] font-bold text-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>{dict.common.back}</span>
        </Link>

        {/* Daily Session Counter Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 border border-pink-100 shadow-sm text-xs md:text-sm font-extrabold text-[#5c4d47]">
          <Flame className="w-4 h-4 text-[#ff758c] animate-pulse" />
          <span>
            {language === 'en' ? "Today's Sessions:" : "Sesi Hari Ini:"} <span className="text-[#ff758c] text-base font-black ml-1">{completedSessions}</span>
          </span>
        </div>
      </header>

      {/* Main 2-Column Desk & Drawers Layout */}
      <main className="relative z-20 flex-1 flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-12 min-h-0 my-auto w-full max-w-6xl mx-auto px-2">
        
        {/* LEFT COLUMN: THE TIMER (Setengah Layar) */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center min-h-0 shrink-0">
          
          {/* Mode Badge Above Timer */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-pink-100 shadow-sm mb-4 md:mb-6">
            <currentConfig.icon className="w-4 h-4 text-[#ff758c]" />
            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-[#5c4d47]">{getModeLabel(mode)}</span>
          </div>

          {/* Circular Glowing Timer */}
          <div className="relative w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-full bg-white/90 border-4 border-pink-50 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02),0_15px_35px_rgba(255,117,140,0.12)]" />
            
            <svg className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#fff0f3" strokeWidth="5" />
              <circle 
                cx="50" cy="50" r="45" fill="none" stroke={currentConfig.ringColor} strokeWidth="5.5" 
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={`${strokeDashoffset}`}
                className="transition-all duration-1000 ease-linear"
                style={{ filter: `drop-shadow(0px 0px 6px ${currentConfig.ringColor}40)` }}
              />
            </svg>

            <div className="relative z-10 flex flex-col items-center">
              <span className={`px-3 py-0.5 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase border mb-1 md:mb-2 shadow-2xs ${currentConfig.badgeBg}`}>
                {isRunning ? 'Sedang Berjalan' : 'Jeda Waktu'}
              </span>
              <div className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tight text-[#5c4d47] font-mono">
                {formatTime(timeLeft)}
              </div>
              <span className="text-[11px] font-bold text-[#8c7a70] mt-1">
                Target: {customMinutes[mode]} Menit
              </span>
            </div>
          </div>

          {/* Control Buttons Row (Start, Repeat, Settings, Checkmark) */}
          <div className="flex items-center gap-3 md:gap-4 mt-6 md:mt-8 shrink-0">
            <button 
              onClick={resetTimer}
              title="Ulangi / Reset Timer"
              className="w-11 h-11 md:w-13 md:h-13 rounded-2xl bg-white/80 hover:bg-white border border-pink-100 text-[#8c7a70] hover:text-[#ff758c] flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button 
              onClick={toggleTimer}
              className={`px-6 py-3 md:px-8 md:py-3.5 rounded-2xl font-display font-black text-xs md:text-sm tracking-wider flex items-center gap-2 transition-all duration-300 shadow-lg hover:-translate-y-1 active:translate-y-0 border border-white/40 ${
                isRunning 
                  ? 'bg-amber-400 hover:bg-amber-500 text-[#5c4d47] shadow-amber-400/30' 
                  : `bg-gradient-to-r ${currentConfig.color} text-white shadow-pink-500/25`
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>JEDA</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>MULAI</span>
                </>
              )}
            </button>

            <button 
              onClick={() => {
                playSfx('click');
                setShowSettingsDrawer(!showSettingsDrawer);
              }}
              title="Pengaturan Durasi Timer"
              className={`w-11 h-11 md:w-13 md:h-13 rounded-2xl border flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
                showSettingsDrawer 
                  ? 'bg-[#ff758c] text-white border-[#ff758c]' 
                  : 'bg-white/80 hover:bg-white border-pink-100 text-[#8c7a70] hover:text-[#ff758c]'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: SYSTEMATIC DRAWERS ("Laci-Laci Sistematis") (Setengah Layar) */}
        <div className="w-full md:w-1/2 flex flex-col gap-3.5 lg:gap-4 min-h-0 justify-center shrink-0">
          
          {/* DRAWER 1: TIPE TIMER (Mode Selector) */}
          <div className="p-3.5 md:p-4 rounded-3xl bg-white/85 border border-pink-100 shadow-lg flex flex-col gap-2.5 transition-all">
            <div className="flex items-center justify-between border-b border-pink-100/60 pb-2">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#ff758c]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#5c4d47]">
                  {language === 'en' ? 'Drawer 1: Timer Type' : 'Laci 1: Tipe Timer'}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#8c7a70]">
                {language === 'en' ? 'Select Session' : 'Pilih Sesi'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {(Object.keys(MODES) as TimerMode[]).map((tabMode) => {
                const tab = MODES[tabMode];
                const Icon = tab.icon;
                const isActive = mode === tabMode;
                return (
                  <button
                    key={tabMode}
                    onClick={() => switchMode(tabMode)}
                    className={`flex flex-col items-center justify-center gap-1 p-2 md:p-2.5 rounded-2xl font-bold text-xs transition-all duration-300 border ${
                      isActive 
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-md shadow-pink-500/15 border-transparent scale-[1.03]` 
                        : 'bg-white/60 hover:bg-pink-50/60 text-[#8c7a70] hover:text-[#5c4d47] border-pink-100/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate w-full text-center text-[11px] md:text-xs">
                      {getModeLabel(tabMode).split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DRAWER 2: PENGATURAN DURASI / SETTINGS (Custom Timer) */}
          <div className="p-3.5 md:p-4 rounded-3xl bg-white/85 border border-pink-100 shadow-lg flex flex-col gap-2.5 transition-all">
            <div 
              onClick={() => {
                playSfx('click');
                setShowSettingsDrawer(!showSettingsDrawer);
              }}
              className="flex items-center justify-between border-b border-pink-100/60 pb-2 cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#ff758c]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#5c4d47]">
                  {language === 'en' ? 'Drawer 2: Duration Settings (Custom)' : 'Laci 2: Pengaturan Durasi (Custom)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#ff758c] group-hover:scale-105 transition-transform">
                <span>{showSettingsDrawer ? (language === 'en' ? 'Close' : 'Tutup') : (language === 'en' ? 'Set Time' : 'Atur Waktu')}</span>
                {showSettingsDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {showSettingsDrawer ? (
              <div className="flex flex-col gap-2.5 pt-1 animate-fade-in">
                {(Object.keys(MODES) as TimerMode[]).map((mKey) => {
                  const m = MODES[mKey];
                  const Icon = m.icon;
                  return (
                    <div key={mKey} className="flex items-center justify-between p-2 rounded-xl bg-pink-50/50 border border-pink-100/60 text-xs font-bold text-[#5c4d47]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-3.5 h-3.5 text-[#ff758c] shrink-0" />
                        <span className="truncate">{getModeLabel(mKey)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => adjustMinutes(mKey, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-pink-200 text-[#ff758c] hover:bg-[#ff758c] hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-12 text-center font-mono font-black text-sm text-[#5c4d47]">
                          {customMinutes[mKey]} <span className="text-[10px] font-normal text-[#8c7a70]">m</span>
                        </span>
                        <button 
                          onClick={() => adjustMinutes(mKey, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-pink-200 text-[#ff758c] hover:bg-[#ff758c] hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-[#8c7a70]">
                <span>{language === 'en' ? 'Focus:' : 'Fokus:'} <strong className="text-[#5c4d47] font-mono">{customMinutes.focus}m</strong></span>
                <span>•</span>
                <span>{language === 'en' ? 'Short:' : 'Singkat:'} <strong className="text-[#5c4d47] font-mono">{customMinutes.shortBreak}m</strong></span>
                <span>•</span>
                <span>{language === 'en' ? 'Long:' : 'Panjang:'} <strong className="text-[#5c4d47] font-mono">{customMinutes.longBreak}m</strong></span>
              </div>
            )}
          </div>

          {/* DRAWER 3: CATATAN LIVIA (Motivation Note) */}
          <div className="p-3.5 md:p-4 rounded-3xl bg-white/85 border border-pink-100 shadow-lg flex flex-col gap-2.5 transition-all">
            <div className="flex items-center justify-between border-b border-pink-100/60 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquareHeart className="w-4 h-4 text-[#ff758c]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#5c4d47]">
                  {language === 'en' ? "Drawer 3: Livia's Notes" : "Laci 3: Catatan Livia"}
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <p className="text-xs md:text-sm font-bold text-[#5c4d47] leading-relaxed italic pt-0.5">
              "{dialog}"
            </p>

            <div className="flex justify-end pt-1">
              <button
                onClick={getRandomMotivation}
                className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200/80 text-xs font-bold tracking-wide text-[#ff758c] transition-all flex items-center gap-1.5 shadow-2xs hover:scale-105"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Motivasi Baru</span>
              </button>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
