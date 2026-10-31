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
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
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
  defaultMinutes: number;
  icon: typeof Zap;
  color: string;
  ringColor: string;
  badgeBg: string;
}

const MODES: Record<TimerMode, ModeConfig> = {
  focus: {
    label: 'Fokus Utama',
    defaultMinutes: 25,
    icon: Zap,
    color: 'from-[#ff758c] to-[#ff0844]',
    ringColor: '#ff758c',
    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  shortBreak: {
    label: 'Istirahat Singkat',
    defaultMinutes: 5,
    icon: Coffee,
    color: 'from-emerald-400 to-teal-500',
    ringColor: '#10b981',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  longBreak: {
    label: 'Istirahat Panjang',
    defaultMinutes: 15,
    icon: Moon,
    color: 'from-slate-700 to-stone-800',
    ringColor: '#475569',
    badgeBg: 'bg-stone-100 text-stone-700 border-stone-200',
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
        'Luar biasa! Satu sesi fokus berhasil dituntaskan dengan sempurna. Istirahat sebentar ya!'
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
    const randomQuote =
      MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
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
    <div className="min-h-[100dvh] w-full bg-[#fdfbf7] text-[#5c4d47] relative overflow-hidden font-sans select-none flex flex-col justify-between p-4 md:p-8 selection:bg-[#ff758c]/25 selection:text-[#5c4d47]">
      {/* Background Decor */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-pink-100/50 blur-[90px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-amber-100/40 blur-[90px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-rose-100/40 blur-[90px]" />
      </div>

      {/* Completion Modal / Overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/30 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="relative text-center p-8 rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-pink-200 max-w-sm mx-4 transform scale-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[#ff758c] to-[#ff0844] flex items-center justify-center text-white mx-auto mb-4 shadow-[0_8px_20px_rgba(255,117,140,0.35)] animate-pulse">
              <Award size={32} />
            </div>
            <h2 className="text-xl font-display font-black text-[#5c4d47] tracking-wider uppercase">
              Sesi Fokus Selesai!
            </h2>
            <p className="text-pink-600 font-bold mt-1.5 text-xs">
              +5 Poin Afeksi Livia & Produktivitas Meningkat
            </p>
          </div>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="relative z-20 flex items-center justify-between shrink-0 mb-4 max-w-6xl w-full mx-auto">
        <Link
          href="/home"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 hover:bg-white border border-pink-100 shadow-xs hover:shadow-md transition-all text-[#5c4d47] hover:text-pink-600 font-bold text-xs group active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
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

      {/* Main Study Desk Layout (2-Column Grid) */}
      <main className="relative z-20 flex-1 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-14 min-h-0 my-auto w-full max-w-6xl mx-auto px-2">
        {/* LEFT COLUMN: THE CONCENTRIC FOCUS CLOCK */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center min-h-0 shrink-0">
          {/* Mode Pill Above Timer */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-pink-100 shadow-xs mb-5">
            <currentConfig.icon className="w-4 h-4 text-pink-600" />
            <span className="text-xs font-display font-black uppercase tracking-widest text-[#5c4d47]">
              {getModeLabel(mode)}
            </span>
          </div>

          {/* Concentric Circular Timer */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 flex items-center justify-center shrink-0">
            {/* Soft Ambient Shadow Card */}
            <div className="absolute inset-0 rounded-full bg-white/95 backdrop-blur-xl border border-pink-100 shadow-[0_16px_40px_rgba(255,117,140,0.12)]" />

            <svg
              className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] -rotate-90 transform"
              viewBox="0 0 100 100"
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
                  filter: `drop-shadow(0px 0px 6px ${currentConfig.ringColor}35)`,
                }}
              />
            </svg>

            <div className="relative z-10 flex flex-col items-center">
              <span
                className={`px-3 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border mb-1.5 shadow-2xs ${currentConfig.badgeBg}`}
              >
                {isRunning ? 'SEDANG BERJALAN' : 'JEDA WAKTU'}
              </span>

              <div className="text-5xl sm:text-6xl lg:text-7xl font-mono tabular-nums font-black tracking-tight text-[#5c4d47]">
                {formatTime(timeLeft)}
              </div>

              <span className="text-[11px] font-mono text-[#8c7a70] mt-1.5 tabular-nums">
                Target: {customMinutes[mode]} Menit
              </span>
            </div>
          </div>

          {/* Control Buttons Row */}
          <div className="flex items-center gap-3.5 mt-8 shrink-0">
            <button
              onClick={resetTimer}
              title="Reset Timer"
              className="w-12 h-12 rounded-2xl bg-white/90 hover:bg-white border border-pink-100 text-[#8c7a70] hover:text-pink-600 flex items-center justify-center transition-all shadow-xs hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={toggleTimer}
              className={`px-8 py-3.5 rounded-2xl font-display font-black text-xs md:text-sm tracking-wider flex items-center gap-2 transition-all duration-300 shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                isRunning
                  ? 'bg-amber-400 hover:bg-amber-500 text-[#5c4d47]'
                  : `bg-gradient-to-r ${currentConfig.color} text-white shadow-[0_6px_20px_rgba(255,117,140,0.35)]`
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
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow-xs hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                showSettingsDrawer
                  ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white border-transparent'
                  : 'bg-white/90 hover:bg-white border-pink-100 text-[#8c7a70] hover:text-pink-600'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: STUDY DESK DRAWERS */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4 min-h-0 justify-center">
          {/* DRAWER 1: MODE SELECTOR */}
          <div className="p-4 md:p-5 rounded-3xl bg-white/90 backdrop-blur-xl border border-pink-100/90 shadow-[0_8px_24px_rgba(255,117,140,0.06)] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-pink-100/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-pink-600" />
                <span className="text-xs font-display font-black uppercase tracking-wider text-[#5c4d47]">
                  {language === 'en' ? 'Session Mode' : 'Mode Belajar'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#8c7a70]">
                {language === 'en' ? 'Select sprint' : 'Pilih interval'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-0.5">
              {(Object.keys(MODES) as TimerMode[]).map((tabMode) => {
                const tab = MODES[tabMode];
                const Icon = tab.icon;
                const isActive = mode === tabMode;
                return (
                  <button
                    key={tabMode}
                    onClick={() => switchMode(tabMode)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl font-bold text-xs transition-all duration-300 border focus-visible:outline-none ${
                      isActive
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-md border-transparent scale-[1.02]`
                        : 'bg-white hover:bg-pink-50/60 text-[#8c7a70] hover:text-[#5c4d47] border-pink-100/70'
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

          {/* DRAWER 2: CUSTOM DURATION CONTROLS */}
          <div className="p-4 md:p-5 rounded-3xl bg-white/90 backdrop-blur-xl border border-pink-100/90 shadow-[0_8px_24px_rgba(255,117,140,0.06)] flex flex-col gap-3">
            <div
              onClick={() => {
                playSfx('click');
                setShowSettingsDrawer(!showSettingsDrawer);
              }}
              className="flex items-center justify-between border-b border-pink-100/60 pb-2.5 cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-600" />
                <span className="text-xs font-display font-black uppercase tracking-wider text-[#5c4d47]">
                  {language === 'en'
                    ? 'Duration Settings'
                    : 'Pengaturan Waktu (Custom)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600 group-hover:translate-x-0.5 transition-transform">
                <span>
                  {showSettingsDrawer
                    ? language === 'en'
                      ? 'Tutup'
                      : 'Tutup'
                    : language === 'en'
                    ? 'Atur'
                    : 'Atur'}
                </span>
                {showSettingsDrawer ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </div>

            {showSettingsDrawer ? (
              <div className="flex flex-col gap-2.5 pt-1">
                {(Object.keys(MODES) as TimerMode[]).map((mKey) => {
                  const m = MODES[mKey];
                  const Icon = m.icon;
                  return (
                    <div
                      key={mKey}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-pink-50/60 border border-pink-100 text-xs font-bold text-[#5c4d47]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 text-pink-600 shrink-0" />
                        <span className="truncate">{getModeLabel(mKey)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => adjustMinutes(mKey, -1)}
                          className="w-7 h-7 rounded-xl bg-white border border-pink-200 text-pink-600 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-colors shadow-2xs active:scale-95"
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
                          onClick={() => adjustMinutes(mKey, 1)}
                          className="w-7 h-7 rounded-xl bg-white border border-pink-200 text-pink-600 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-colors shadow-2xs active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-between px-2 py-1 text-xs font-mono text-[#8c7a70]">
                <span>
                  {language === 'en' ? 'Focus:' : 'Fokus:'}{' '}
                  <strong className="text-[#5c4d47] font-black">
                    {customMinutes.focus}m
                  </strong>
                </span>
                <span>•</span>
                <span>
                  {language === 'en' ? 'Short:' : 'Singkat:'}{' '}
                  <strong className="text-[#5c4d47] font-black">
                    {customMinutes.shortBreak}m
                  </strong>
                </span>
                <span>•</span>
                <span>
                  {language === 'en' ? 'Long:' : 'Panjang:'}{' '}
                  <strong className="text-[#5c4d47] font-black">
                    {customMinutes.longBreak}m
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* DRAWER 3: LIVIA COMPANION DIALOGUE */}
          <div className="relative pt-3.5">
            {/* Raised Nameplate Pill */}
            <div className="absolute top-0 left-6 inline-flex items-center gap-2 rounded-full border border-white bg-gradient-to-r from-[#ff0844] to-[#ffb199] px-4 py-1 shadow-[0_4px_16px_rgba(255,117,140,0.35)] z-20">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"
              />
              <span className="font-display text-xs font-black uppercase tracking-widest text-white">
                Livia Einhart
              </span>
            </div>

            {/* Bubble Card with Chibi Avatar */}
            <div className="p-4 md:p-5 rounded-3xl bg-white/95 backdrop-blur-2xl border border-pink-100/90 shadow-[0_10px_30px_rgba(255,117,140,0.1)] flex items-start gap-3.5">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-pink-100 shrink-0 border border-pink-200 shadow-2xs mt-1">
                <Image
                  src="/livia/chibi-livia.webp"
                  alt="Livia"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-[#5c4d47] leading-relaxed italic">
                  &ldquo;{dialog}&rdquo;
                </p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-pink-100/60">
                  <span className="text-pink-400 text-xs animate-pulse select-none font-serif">
                    ✧
                  </span>

                  <button
                    onClick={getRandomMotivation}
                    className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200/80 text-xs font-bold tracking-wide text-pink-600 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    <span>Minta Semangat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
