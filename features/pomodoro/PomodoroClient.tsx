'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Coffee,
  Zap,
  Moon,
  Flame,
  ArrowLeft,
  Settings,
  Plus,
  Minus,
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
  X,
} from 'lucide-react';
import { unlockAchievement } from '@/lib/achievements';
import { playSfx } from '@/lib/sfx';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { updateAffection } from '@/lib/actions';
import { notifyServerPomodoroDone } from '@/lib/push/push-client';

const MOTIVATIONS = [
  'Kalau kamu nyerah sekarang, aku yang malu. Fokus ya!',
  'Aku lagi perhatiin kamu dari jauh. Jangan buka sosmed!',
  'Satu sesi lagi selesai, nanti aku buatin teh hangat.',
  'Sudah setengah jalan. Jangan jadi pengecut, selesaikan apa yang kamu mulai!',
  '...Kamu hebat. Tapi jangan bilang aku yang memujimu barusan.',
  'Orang sukses itu dibentuk dari konsistensi kecil setiap hari.',
  'Bukunya jangan cuma dipandang, dibaca dan dipahami dong!',
];

const EN_MOTIVATIONS = [
  "If you give up now, I'll be embarrassed. Stay focused!",
  "I'm watching you from afar. Don't open social media!",
  'Finish one more session and I will make you warm tea.',
  'You are halfway there. Finish what you started!',
  "...You are amazing. But don't say I just praised you.",
  'Successful people are made from small daily consistencies.',
  "Don't just stare at your screen or books—actually study!",
];

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface ModeConfig {
  label: string;
  shortLabel: string;
  defaultMinutes: number;
  icon: typeof Zap;
  color: string;
  buttonShadow: string;
  ringColor: string;
  ringGlow: string;
  badgeBg: string;
  pillInactive: string;
  clockBorder: string;
  clockShadow: string;
  drawerRowBg: string;
  drawerIconColor: string;
  drawerBtn: string;
}

const MODES: Record<TimerMode, ModeConfig> = {
  focus: {
    label: 'Fokus Utama',
    shortLabel: 'Fokus',
    defaultMinutes: 25,
    icon: Zap,
    color: 'from-[#ff758c] to-[#ff0844]',
    buttonShadow: 'shadow-[0_6px_20px_rgba(255,117,140,0.35)]',
    ringColor: '#ff758c',
    ringGlow: 'rgba(255,117,140,0.35)',
    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
    pillInactive:
      'bg-pink-50/80 text-pink-700 hover:bg-pink-100 border border-pink-200/70',
    clockBorder: 'border-pink-100',
    clockShadow: 'shadow-[0_16px_40px_rgba(255,117,140,0.12)]',
    drawerRowBg: 'bg-pink-50/60 border-pink-100',
    drawerIconColor: 'text-pink-600',
    drawerBtn:
      'border-pink-200 text-pink-600 hover:bg-pink-600 hover:text-white',
  },
  shortBreak: {
    label: 'Istirahat Singkat',
    shortLabel: 'Istirahat',
    defaultMinutes: 5,
    icon: Coffee,
    color: 'from-emerald-500 to-teal-600',
    buttonShadow: 'shadow-[0_6px_20px_rgba(16,185,129,0.35)]',
    ringColor: '#10b981',
    ringGlow: 'rgba(16,185,129,0.35)',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pillInactive:
      'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70',
    clockBorder: 'border-emerald-100',
    clockShadow: 'shadow-[0_16px_40px_rgba(16,185,129,0.12)]',
    drawerRowBg: 'bg-emerald-50/60 border-emerald-100',
    drawerIconColor: 'text-emerald-600',
    drawerBtn:
      'border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white',
  },
  longBreak: {
    label: 'Istirahat Panjang',
    shortLabel: 'Panjang',
    defaultMinutes: 15,
    icon: Moon,
    color: 'from-blue-500 to-indigo-600',
    buttonShadow: 'shadow-[0_6px_20px_rgba(59,130,246,0.35)]',
    ringColor: '#3b82f6',
    ringGlow: 'rgba(59,130,246,0.35)',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    pillInactive:
      'bg-blue-50/80 text-blue-700 hover:bg-blue-100 border border-blue-200/70',
    clockBorder: 'border-blue-100',
    clockShadow: 'shadow-[0_16px_40px_rgba(59,130,246,0.12)]',
    drawerRowBg: 'bg-blue-50/60 border-blue-100',
    drawerIconColor: 'text-blue-600',
    drawerBtn:
      'border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white',
  },
};

export default function PomodoroClient() {
  const { dict, language } = useLanguage();
  const [mode, setMode] = useState<TimerMode>('focus');

  // Custom durations in minutes
  const [customMinutes, setCustomMinutes] = useState<Record<TimerMode, number>>({
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
  });

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [dialog, setDialog] = useState(
    language === 'en' ? EN_MOTIVATIONS[0] : MOTIVATIONS[0]
  );
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

  const getModeShortLabel = (m: TimerMode) => {
    if (language === 'en') {
      if (m === 'focus') return 'Focus';
      if (m === 'shortBreak') return 'Short';
      if (m === 'longBreak') return 'Long';
    }
    return MODES[m].shortLabel;
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
        setTimeLeft((prev) => {
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
            setDialog('Hei, tugasmu belum selesai lho! Ayo fokus lagi!');
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
      setCompletedSessions((prev) => prev + 1);
      setDialog(
        language === 'en'
          ? 'Incredible! One focus sprint completed perfectly. Take a quick rest now!'
          : 'Luar biasa! Satu sesi fokus berhasil dituntaskan dengan sempurna. Istirahat sebentar ya!'
      );

      try {
        await updateAffection(5, 'pomodoro');
      } catch (e) {
        console.error(e);
      }

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        notifyServerPomodoroDone();
      }

      setTimeout(() => {
        setShowConfetti(false);
        switchMode('shortBreak');
      }, 4000);
    } else {
      setDialog(
        language === 'en'
          ? "Break time is over! Feeling refreshed? Let's start the next session!"
          : 'Waktu istirahat selesai! Badan sudah segar kan? Mari kita mulai sesi berikutnya!'
      );
      switchMode('focus');
    }
  };

  const switchMode = (newMode: TimerMode) => {
    playSfx('click');
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(customMinutes[newMode] * 60);
    if (newMode === 'focus') {
      const list = language === 'en' ? EN_MOTIVATIONS : MOTIVATIONS;
      setDialog(list[Math.floor(Math.random() * list.length)]);
    } else {
      setDialog(
        language === 'en'
          ? 'Relax, stretch your muscles, or drink some water to stay refreshed.'
          : 'Santai dulu, regangkan otot, atau minum air putih biar konsentrasimu terjaga.'
      );
    }
  };

  const adjustMinutes = (targetMode: TimerMode, delta: number) => {
    playSfx('click');
    setCustomMinutes((prev) => {
      const current = prev[targetMode];
      const updated = Math.max(1, Math.min(120, current + delta));
      const nextMap = { ...prev, [targetMode]: updated };

      if (targetMode === mode && !isRunning) {
        setTimeLeft(updated * 60);
      }
      return nextMap;
    });
  };

  const toggleTimer = () => {
    playSfx('click');
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    if (nextRunning) {
      if (timeLeft === customMinutes[mode] * 60) {
        setDialog('Ayo mulai! Jangan biarkan konsentrasimu terpecah ya.');
      }
    } else {
      setDialog('Lho, dijeda dulu? Jangan kelamaan ya, nanti fokusmu buyar!');
    }
  };

  const resetTimer = () => {
    playSfx('click');
    setIsRunning(false);
    setTimeLeft(customMinutes[mode] * 60);
    const list = language === 'en' ? EN_MOTIVATIONS : MOTIVATIONS;
    setDialog(list[Math.floor(Math.random() * list.length)]);
  };

  const getRandomMotivation = () => {
    playSfx('click');
    const list = language === 'en' ? EN_MOTIVATIONS : MOTIVATIONS;
    const randomQuote = list[Math.floor(Math.random() * list.length)];
    setDialog(randomQuote);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentConfig = MODES[mode];
  const totalDurationSecs = customMinutes[mode] * 60;
  const progress = 1 - timeLeft / totalDurationSecs;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="min-h-[100dvh] w-full bg-[#fdfbf7] text-[#5c4d47] relative overflow-y-auto overflow-x-hidden font-sans select-none flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-[#ff758c]/25 selection:text-[#5c4d47]">
      {/* Subtle Pastel Ambient Decor */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-pink-100/50 blur-[90px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-amber-100/40 blur-[90px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-rose-100/40 blur-[90px]" />
      </div>

      {/* Completion Modal / Celebration Overlay */}
      {showConfetti && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sesi Fokus Selesai"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out] p-4"
          onClick={() => setShowConfetti(false)}
        >
          <div
            className="relative text-center p-8 rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-pink-200 max-w-sm w-full transform scale-100 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowConfetti(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#8c7a70] hover:text-[#5c4d47] hover:bg-pink-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              aria-label="Tutup pemberitahuan"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[#ff758c] to-[#ff0844] flex items-center justify-center text-white mx-auto mb-4 shadow-[0_8px_20px_rgba(255,117,140,0.35)] animate-pulse">
              <Award size={32} />
            </div>

            <h2 className="text-xl font-display font-black text-[#5c4d47] tracking-wider uppercase">
              Sesi Fokus Selesai!
            </h2>
            <p className="text-pink-600 font-bold mt-1.5 text-xs">
              +5 Poin Afeksi Livia & Produktivitas Meningkat
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowConfetti(false);
                  switchMode('shortBreak');
                }}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-[#ff758c] to-[#ff0844] hover:opacity-95 text-white font-bold text-xs tracking-wider uppercase shadow-xs active:scale-95 transition-all"
              >
                Mulai Istirahat Singkat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="relative z-20 flex items-center justify-between shrink-0 mb-4 max-w-2xl w-full mx-auto">
        <Link
          href="/home"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 hover:bg-white border border-pink-100 shadow-xs hover:shadow-md transition-all text-[#5c4d47] hover:text-pink-600 font-bold text-xs group active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          title="Kembali ke Kamar Kos"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-pink-500" />
          <span>{dict?.common?.back || 'Kembali'}</span>
        </Link>

        {/* Daily Session Counter Badge */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 border border-pink-100 shadow-xs text-xs font-bold text-[#5c4d47]">
          <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
          <span>
            {language === 'en' ? "Today's Sessions:" : 'Sesi Hari Ini:'}
          </span>
          <span className="text-pink-600 font-mono font-black text-sm tabular-nums">
            {completedSessions}
          </span>
        </div>
      </header>

      {/* MAIN CENTERED FOCUS STAGE */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center gap-5 sm:gap-6 min-h-0 my-auto w-full max-w-2xl mx-auto px-2">
        {/* 1. Mode Segmented Control Bar */}
        <nav
          aria-label="Pilihan Mode Timer"
          className="p-1.5 rounded-full bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-xs flex items-center gap-1.5 w-full sm:w-auto"
        >
          {(Object.keys(MODES) as TimerMode[]).map((tabMode) => {
            const tab = MODES[tabMode];
            const Icon = tab.icon;
            const isActive = mode === tabMode;
            return (
              <button
                key={tabMode}
                type="button"
                onClick={() => switchMode(tabMode)}
                aria-pressed={isActive}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 active:scale-95 ${
                  isActive
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-md border-transparent scale-[1.02]`
                    : `${tab.pillInactive}`
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{getModeShortLabel(tabMode)}</span>
                <span className="font-mono text-[11px] opacity-80 tabular-nums">
                  ({customMinutes[tabMode]}m)
                </span>
              </button>
            );
          })}
        </nav>

        {/* 2. Concentric Circular Focus Clock */}
        <section
          aria-label="Penunjuk Waktu Fokus"
          className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 flex items-center justify-center shrink-0 my-1"
        >
          {/* Luminous Ambient Halo & Base Card */}
          <div
            className={`absolute inset-0 rounded-full bg-white/95 backdrop-blur-xl border transition-all duration-500 ${currentConfig.clockBorder} ${currentConfig.clockShadow}`}
          />

          <svg
            className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] -rotate-90 transform"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#fff0f3"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={currentConfig.ringColor}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${strokeDashoffset}`}
              className="transition-all duration-1000 ease-linear"
              style={{
                filter: `drop-shadow(0px 0px 6px ${currentConfig.ringGlow})`,
              }}
            />
          </svg>

          <div className="relative z-10 flex flex-col items-center">
            <span
              className={`px-3 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border mb-1.5 shadow-2xs ${currentConfig.badgeBg}`}
            >
              {isRunning ? 'SEDANG BERJALAN' : 'JEDA WAKTU'}
            </span>

            <div
              className="text-5xl sm:text-6xl lg:text-7xl font-mono tabular-nums font-black tracking-tight text-[#5c4d47]"
              aria-live="polite"
            >
              {formatTime(timeLeft)}
            </div>

            <span className="text-[11px] font-mono text-[#8c7a70] mt-1.5 tabular-nums">
              Target: {customMinutes[mode]} Menit
            </span>
          </div>
        </section>

        {/* 3. Primary Control Action Hub */}
        <div className="flex items-center gap-3.5 shrink-0">
          <button
            type="button"
            onClick={resetTimer}
            title="Reset Timer"
            aria-label="Reset Timer"
            className="w-12 h-12 rounded-2xl bg-white/90 hover:bg-white border border-pink-100 text-[#8c7a70] hover:text-pink-600 flex items-center justify-center transition-all shadow-xs hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={toggleTimer}
            aria-label={isRunning ? 'Jeda Timer' : 'Mulai Timer'}
            className={`px-8 py-3.5 rounded-2xl font-display font-black text-xs md:text-sm tracking-wider flex items-center gap-2.5 transition-all duration-300 shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
              isRunning
                ? 'bg-amber-400 hover:bg-amber-500 text-[#5c4d47] shadow-[0_6px_20px_rgba(251,191,36,0.3)]'
                : `bg-gradient-to-r ${currentConfig.color} text-white ${currentConfig.buttonShadow}`
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
            type="button"
            onClick={() => {
              playSfx('click');
              setShowSettingsDrawer(!showSettingsDrawer);
            }}
            title="Pengaturan Durasi Timer"
            aria-label="Pengaturan Durasi Timer"
            aria-expanded={showSettingsDrawer}
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow-xs hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
              showSettingsDrawer
                ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white border-transparent'
                : 'bg-white/90 hover:bg-white border-pink-100 text-[#8c7a70] hover:text-pink-600'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* 4. Collapsible Duration Fine-Tuning Drawer */}
        {showSettingsDrawer && (
          <div className="w-full max-w-md p-4 rounded-3xl bg-white/95 backdrop-blur-xl border border-pink-100/90 shadow-[0_8px_24px_rgba(255,117,140,0.08)] animate-[fadeIn_0.2s_ease-out] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-pink-100/60 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-600" />
                <span className="text-xs font-display font-black uppercase tracking-wider text-[#5c4d47]">
                  {language === 'en'
                    ? 'Duration Settings'
                    : 'Pengaturan Durasi (Menit)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsDrawer(false)}
                className="text-xs font-bold text-pink-600 hover:text-pink-700"
              >
                {language === 'en' ? 'Close' : 'Tutup'}
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-0.5">
              {(Object.keys(MODES) as TimerMode[]).map((mKey) => {
                const m = MODES[mKey];
                const Icon = m.icon;
                return (
                  <div
                    key={mKey}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs font-bold text-[#5c4d47] ${m.drawerRowBg}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${m.drawerIconColor}`} />
                      <span className="truncate">{getModeLabel(mKey)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => adjustMinutes(mKey, -1)}
                        aria-label={`Kurangi durasi ${getModeLabel(mKey)}`}
                        className={`w-7 h-7 rounded-xl bg-white border flex items-center justify-center transition-colors shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${m.drawerBtn}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-12 text-center font-mono tabular-nums font-black text-sm text-[#5c4d47]">
                        {customMinutes[mKey]}
                        <span className="text-[10px] font-normal text-[#8c7a70] ml-0.5">
                          m
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustMinutes(mKey, 1)}
                        aria-label={`Tambah durasi ${getModeLabel(mKey)}`}
                        className={`w-7 h-7 rounded-xl bg-white border flex items-center justify-center transition-colors shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${m.drawerBtn}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Livia Companion Dialogue Shelf */}
        <section
          aria-label="Catatan Teman Belajar Livia"
          className="w-full max-w-md relative pt-3 shrink-0"
        >
          {/* Raised Nameplate Pill */}
          <div className="absolute top-0 left-6 inline-flex items-center gap-2 rounded-full border border-white bg-gradient-to-r from-[#ff0844] to-[#ffb199] px-3.5 py-0.5 shadow-[0_4px_16px_rgba(255,117,140,0.3)] z-20">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"
            />
            <span className="font-display text-[11px] font-black uppercase tracking-widest text-white">
              Livia Einhart
            </span>
          </div>

          {/* Bubble Card with Chibi Avatar */}
          <div className="p-4 rounded-3xl bg-white/95 backdrop-blur-2xl border border-pink-100/90 shadow-[0_10px_30px_rgba(255,117,140,0.08)] flex items-start gap-3.5">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-pink-100 shrink-0 border border-pink-200 shadow-2xs mt-1">
              <Image
                src="/livia/chibi-livia.webp"
                alt="Livia"
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[#5c4d47] leading-relaxed italic">
                &ldquo;{dialog}&rdquo;
              </p>

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-pink-100/60">
                <span className="text-pink-400 text-xs animate-pulse select-none font-serif">
                  ✧
                </span>

                <button
                  type="button"
                  onClick={getRandomMotivation}
                  className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200/80 text-xs font-bold tracking-wide text-pink-600 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>Minta Semangat</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
