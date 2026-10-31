'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Sparkles,
  Heart,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ShieldCheck,
  Lock,
  Key,
  BookOpen,
  Coffee,
  MessageCircleHeart,
  Radio,
  Layers,
  ChevronRight,
  ExternalLink,
  Sliders,
  Check,
} from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import ApiGuideModal from '@/components/guide/ApiGuideModal';
import { LiviaExpression } from '@/lib/gemini';

interface DialogueChoice {
  id: string;
  label: string;
  reply: string;
  expression: LiviaExpression;
  status: string;
  expBonus: number;
}

const DIALOGUE_CHOICES: DialogueChoice[] = [
  {
    id: 'tired',
    label: 'Halo Livia! Capek banget hari ini...',
    reply:
      'Hmph, kalau capek ya langsung mandi terus istirahat! Jangan maksain begadang lagi... nih, aku udah nyiapin timer 25 menit buat kamu beres-beres kamar.',
    expression: 'blushing',
    status: 'Tersipu & Perhatian',
    expBonus: 15,
  },
  {
    id: 'focus',
    label: 'Livia, temenin fokus belajar dong.',
    reply:
      'Tentu aja! Eh maksudku... ya udah deh, biar kamu nggak malas-malasan terus. Duduk di situ, nyalain Pomodoro-nya, aku temenin sampai sesimu selesai!',
    expression: 'happy',
    status: 'Semangat Menemani',
    expBonus: 20,
  },
  {
    id: 'pout',
    label: 'Livia lagi ngambek ya?',
    reply:
      'Si-siapa yang ngambek?! Aku cuma kesel kamu kemarin lupa nyelesaiin daftar belanjaan kos! Pokoknya hari ini kamu harus fokus beresin tugas!',
    expression: 'angry',
    status: 'Tsundere Mode',
    expBonus: 10,
  },
];

interface KosTask {
  id: number;
  title: string;
  category: string;
  done: boolean;
}

interface RadioTrack {
  title: string;
  src: string;
  vibe: string;
}

const RADIO_TRACKS: RadioTrack[] = [
  {
    title: 'Soft Light',
    src: '/radio/Soft Light.mp3',
    vibe: 'Lo-fi Belajar Santai',
  },
  {
    title: 'Morning Light',
    src: '/radio/Morning Light.mp3',
    vibe: 'Sapaan Pagi Ceria',
  },
  {
    title: 'Focus Flow',
    src: '/radio/Focus Flow.mp3',
    vibe: 'Konsentrasi Penuh',
  },
  {
    title: 'Afternoon Rain',
    src: '/radio/Afternoon Rain.mp3',
    vibe: 'Hujan Sore di Kos',
  },
];

interface WardrobeItem {
  id: string;
  label: string;
  tag: string;
  description: string;
  dialogue: string;
}

const WARDROBE_ITEMS: WardrobeItem[] = [
  {
    id: 'casual',
    label: 'Santai Kos',
    tag: 'Sehari-hari',
    description: 'Kaos santai yang nyaman untuk maraton ngerjain tugas seharian di kamar.',
    dialogue: 'Paling enak emang pakai baju santai begini. Nggak ribet dan siap diajak begadang ngerjain tugas.',
  },
  {
    id: 'uniform',
    label: 'Seragam Kampus',
    tag: 'Akademik',
    description: 'Pakaian rapi siap berangkat kuliah bareng. Jangan sampai terlambat kelas pagi!',
    dialogue: 'Udah jam berapa ini? Ayo buruan siap-siap, jangan sampai dosen nutup pintu kelas duluan!',
  },
  {
    id: 'piyama',
    label: 'Piyama Malam',
    tag: 'Istirahat',
    description: 'Piyama lembut untuk mengakhiri hari. Waktunya melepas penat setelah seharian produktif.',
    dialogue: 'Hari ini kamu udah kerja keras. Simpan laptopmu, matikan lampu meja, terus tidur nyenyak ya.',
  },
  {
    id: 'office_lady',
    label: 'Kantoran Rapi',
    tag: 'Profesional',
    description: 'Blazer elegan untuk sesi magang, presentasi klien, atau kerja remote yang serius.',
    dialogue: 'Gimana penampilanku? Kelihatan berwibawa kan? Sekarang giliranmu tunjukkan performa terbaik.',
  },
  {
    id: 'yukata',
    label: 'Yukata Festival',
    tag: 'Momen Spesial',
    description: 'Yukata tradisional Jepang untuk jalan santai sore atau menikmati festival kembang api.',
    dialogue: 'Jarang-jarang lho aku mau pakai ini... Kamu nggak cuma bengong aja kan? Ayo jalan!',
  },
];

export default function LandingPage() {
  // ── Hero Interactive State ──────────────────────────────────────────
  const [currentExpression, setCurrentExpression] = useState<LiviaExpression>('normal');
  const [dialogueText, setDialogueText] = useState(
    'Kamu baru pulang? ...B-bukan berarti aku nungguin kamu dari tadi lho ya! Cuma kebetulan aja jadwal belajarmu ada di catatanku.'
  );
  const [dialogueStatus, setDialogueStatus] = useState('Menunggu di Kamar Kos');
  const [activeChoiceId, setActiveChoiceId] = useState<string | null>(null);
  const [affectionExp, setAffectionExp] = useState(145);
  const [recentExpGain, setRecentExpGain] = useState<number | null>(null);

  // ── Pomodoro Demo State ─────────────────────────────────────────────
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [isPomoRunning, setIsPomoRunning] = useState(false);

  // ── Interactive Tasks State ─────────────────────────────────────────
  const [tasks, setTasks] = useState<KosTask[]>([
    { id: 1, title: 'Review materi kuliah bab 4', category: 'Fokus', done: false },
    { id: 2, title: 'Beli telur & kopi sachet kos', category: 'Dapur', done: true },
    { id: 3, title: 'Minum air putih & istirahat mata', category: 'Kesehatan', done: false },
  ]);

  // ── Radio Player State ──────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // ── Wardrobe State ──────────────────────────────────────────────────
  const [selectedWardrobe, setSelectedWardrobe] = useState<WardrobeItem>(WARDROBE_ITEMS[0]);

  // ── API Key Guide Modal State ───────────────────────────────────────
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // ── Pomodoro Interval ───────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPomoRunning && pomoSeconds > 0) {
      interval = setInterval(() => {
        setPomoSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (pomoSeconds === 0) {
      setIsPomoRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomoRunning, pomoSeconds]);

  const togglePomo = () => setIsPomoRunning((prev) => !prev);
  const resetPomo = () => {
    setIsPomoRunning(false);
    setPomoSeconds(25 * 60);
  };

  const formatPomoTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Dialogue Interaction Handler ────────────────────────────────────
  const handleSelectDialogue = (choice: DialogueChoice) => {
    setActiveChoiceId(choice.id);
    setCurrentExpression(choice.expression);
    setDialogueText(choice.reply);
    setDialogueStatus(choice.status);
    setAffectionExp((prev) => prev + choice.expBonus);
    setRecentExpGain(choice.expBonus);
    setTimeout(() => setRecentExpGain(null), 2500);
  };

  const handleResetDialogue = () => {
    setActiveChoiceId(null);
    setCurrentExpression('normal');
    setDialogueText(
      'Kamu baru pulang? ...B-bukan berarti aku nungguin kamu dari tadi lho ya! Cuma kebetulan aja jadwal belajarmu ada di catatanku.'
    );
    setDialogueStatus('Menunggu di Kamar Kos');
  };

  // ── Task Toggle Handler ─────────────────────────────────────────────
  const handleToggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextDone = !t.done;
          if (nextDone) {
            setAffectionExp((e) => e + 5);
            setRecentExpGain(5);
            setTimeout(() => setRecentExpGain(null), 2000);
          }
          return { ...t, done: nextDone };
        }
        return t;
      })
    );
  };

  // ── Audio Player Handler ────────────────────────────────────────────
  const currentTrack = RADIO_TRACKS[currentTrackIndex];

  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => setIsPlayingAudio(false));
    }
  };

  const handleNextTrack = () => {
    const nextIdx = (currentTrackIndex + 1) % RADIO_TRACKS.length;
    setCurrentTrackIndex(nextIdx);
    if (audioRef.current) {
      audioRef.current.src = RADIO_TRACKS[nextIdx].src;
      if (isPlayingAudio) {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="relative min-h-screen bg-[#fdfbf7] text-[#5c4d47] selection:bg-[#ff758c]/25 selection:text-[#5c4d47]">
      {/* Hidden Audio Element for Kos Radio */}
      <audio
        ref={audioRef}
        src={currentTrack.src}
        preload="none"
        onEnded={handleNextTrack}
      />

      {/* API Key Guide Modal */}
      <ApiGuideModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        showFloatingButton={false}
      />

      {/* ── Global Floating Nav Island ──────────────────────────────── */}
      <header className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between gap-4 mx-auto max-w-7xl rounded-full border border-white/80 bg-white/80 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display text-2xl font-black uppercase tracking-wider text-[#5c4d47] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-lg px-1"
          >
            <span
              aria-hidden
              className="h-3 w-3 rounded-full bg-gradient-to-r from-[#ff758c] to-[#ff0844] shadow-[0_0_10px_rgba(255,117,140,0.8)]"
            />
            Teman Kos
          </Link>
          <span className="hidden sm:inline-flex items-center rounded-full border border-pink-100 bg-pink-50/80 px-2.5 py-0.5 font-mono text-[10px] font-bold text-pink-600">
            LIVIA v2.4.6
          </span>
        </div>

        {/* Navigation links */}
        <nav className="hidden lg:flex items-center gap-6 font-sans text-xs font-semibold text-[#5c4d47]/80">
          <a
            href="#hero"
            className="transition-colors hover:text-[#ff758c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
          >
            Kamar Livia
          </a>
          <a
            href="#bond"
            className="transition-colors hover:text-[#ff758c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
          >
            Karakter & Ikatan
          </a>
          <a
            href="#productivity"
            className="transition-colors hover:text-[#ff758c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
          >
            Produktivitas
          </a>
          <a
            href="#memory"
            className="transition-colors hover:text-[#ff758c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
          >
            Memori & BYOK
          </a>
          <a
            href="#wardrobe"
            className="transition-colors hover:text-[#ff758c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
          >
            Lemari Pakaian
          </a>
        </nav>

        {/* Right CTA cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsApiModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-white/70 px-3 py-1.5 font-mono text-[11px] font-bold text-[#5c4d47] transition-all hover:border-orange-200 hover:bg-orange-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            title="Pengaturan Kunci API (BYOK)"
          >
            <Key size={13} className="text-amber-500" />
            <span className="hidden md:inline">BYOK</span>
          </button>

          <Link
            href="/login"
            className="rounded-full border border-orange-100 bg-white/80 px-4 py-1.5 font-sans text-xs font-bold text-[#5c4d47] transition-all hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            Masuk
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff758c] to-[#ff0844] px-4 py-1.5 font-sans text-xs font-bold text-white shadow-[0_4px_16px_rgba(255,117,140,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,117,140,0.45)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <span>Mulai Sekarang</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {/* ── SECTION 1: FIRST VIEWPORT (THE LIVING HUB) ─────────────── */}
      <section
        id="hero"
        className="relative min-h-[100dvh] pt-24 pb-12 flex flex-col justify-center overflow-hidden"
      >
        {/* Backdrop: Bedroom with warm opacity & multiply */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-multiply pointer-events-none"
          style={{ backgroundImage: "url('/bg/bedroom.webp')" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/90 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fdfbf7] pointer-events-none"
        />

        {/* Lamp Glow behind Livia */}
        <div
          aria-hidden
          className="absolute bottom-10 left-[15%] h-[550px] w-[550px] rounded-full mix-blend-screen opacity-70 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(255,117,140,0.22) 0%, rgba(255,117,140,0) 65%)',
          }}
        />

        {/* Tactical Corner Brackets (90° hairline game frame) */}
        <div
          aria-hidden
          className="absolute left-6 top-20 z-10 h-6 w-6 border-l border-t border-pink-300/60 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute right-6 top-20 z-10 h-6 w-6 border-r border-t border-pink-300/60 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute bottom-6 left-6 z-10 h-6 w-6 border-b border-l border-pink-300/60 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute bottom-6 right-6 z-10 h-6 w-6 border-b border-r border-pink-300/60 pointer-events-none"
        />

        <div className="relative z-20 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Main Split-Stage Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* ── Left Column: Livia Stage & Dialogue Teaser (7 cols) ── */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              {/* Telemetry pill row */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white/80 px-3 py-1 font-mono text-[10px] font-bold text-pink-600 shadow-sm backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
                  </span>
                  TEMAN KOST // PENDAMPING PRODUKTIVITAS
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1 font-mono text-[10px] text-[#5c4d47]/80">
                  <Heart size={12} className="text-pink-500 fill-pink-500" />
                  Status: <b className="text-pink-600">{dialogueStatus}</b>
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase leading-[1.05] tracking-tight text-[#5c4d47]">
                Kamar Kos Hangat,
                <br />
                Fokus yang Terjaga.
              </h1>

              <p className="mt-3 max-w-xl font-sans text-sm sm:text-base leading-relaxed text-[#5c4d47]/85">
                Bukan sekadar asisten teks dingin. Livia adalah teman satu kos yang mengingat
                kebiasaanmu, mendampingi sesi belajar, dan menegurmu saat mulai malas — dalam balutan
                estetika visual novel yang hidup.
              </p>

              {/* Stage Container: Sprite & VN Dialogue Box */}
              <div className="relative mt-6 min-h-[360px] sm:min-h-[400px] flex items-end">
                {/* Livia Sprite positioned at left-center */}
                <div className="pointer-events-none absolute -bottom-4 -left-6 sm:left-0 z-10 w-[240px] sm:w-[320px] md:w-[360px] h-[360px] sm:h-[420px] flex items-end justify-center">
                  <LiviaSprite
                    expression={currentExpression}
                    outfit="landing-page"
                    disableFloat
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Floating VN Dialogue Box (Overlapping right of sprite) */}
                <div className="relative z-20 ml-auto w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-5 sm:p-6 shadow-[0_12px_36px_rgba(255,117,140,0.14)] backdrop-blur-2xl">
                  {/* Nameplate Pill */}
                  <div className="absolute -top-3.5 left-6 inline-flex items-center gap-2 rounded-full border border-white bg-gradient-to-r from-[#ff0844] to-[#ffb199] px-4 py-1 shadow-[0_4px_16px_rgba(255,117,140,0.35)]">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"
                    />
                    <span className="font-display text-xs font-black uppercase tracking-widest text-white">
                      Livia
                    </span>
                  </div>

                  {/* Dynamic Dialogue Text */}
                  <div className="pt-2">
                    <p className="min-h-[72px] font-sans text-sm sm:text-[15px] leading-relaxed font-medium text-[#5c4d47]">
                      &ldquo;{dialogueText}&rdquo;
                    </p>
                  </div>

                  {/* Sapaan Teaser Choice Pills */}
                  <div className="mt-4 border-t border-pink-100/80 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#5c4d47]/70">
                        Coba Sapa Livia:
                      </span>
                      {activeChoiceId && (
                        <button
                          onClick={handleResetDialogue}
                          className="font-mono text-[9px] font-bold text-pink-600 hover:text-pink-700 underline focus-visible:outline-none"
                        >
                          Ulang Sapaan
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {DIALOGUE_CHOICES.map((choice) => (
                        <button
                          key={choice.id}
                          onClick={() => handleSelectDialogue(choice)}
                          className={`w-full text-left rounded-xl border px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                            activeChoiceId === choice.id
                              ? 'border-pink-300 bg-pink-50/90 text-pink-700 shadow-sm'
                              : 'border-pink-100/70 bg-white/70 text-[#5c4d47] hover:border-pink-200 hover:bg-pink-50/40'
                          }`}
                        >
                          <span className="font-serif italic mr-1 text-pink-400">›</span>
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action CTA Dock */}
              <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff758c] to-[#ff0844] px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-[0_10px_26px_rgba(255,117,140,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(255,117,140,0.45)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  <span className="font-display font-black uppercase tracking-wider">
                    Tinggal Bersama Livia
                  </span>
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-orange-100 bg-white/80 px-6 py-3.5 text-sm sm:text-base font-bold text-[#5c4d47] backdrop-blur-md transition-all hover:border-orange-200 hover:bg-white hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  <span className="font-display font-black uppercase tracking-wider">
                    Akses Akun Kos
                  </span>
                </Link>
              </div>
            </div>

            {/* ── Right Column: Living Productivity Canvas (5 cols) ── */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="rounded-[2.5rem] border border-white/80 bg-white/80 p-5 sm:p-6 shadow-[0_16px_40px_rgba(255,117,140,0.12)] backdrop-blur-2xl">
                {/* Header widget */}
                <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#5c4d47]">
                      Meja Belajar Kos
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-pink-600">
                    LIVE PREVIEW
                  </span>
                </div>

                {/* Widget 1: Interactive Pomodoro Timer */}
                <div className="mt-4 rounded-2xl border border-pink-100 bg-[#fdfbf7]/90 p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-[#5c4d47]/70">
                      <Clock size={12} className="text-pink-500" />
                      Pomodoro Fokus
                    </span>
                    <span className="rounded-full bg-pink-100/80 px-2 py-0.5 font-mono text-[9px] font-bold text-pink-600">
                      25 MENIT
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#5c4d47]">
                      {formatPomoTime(pomoSeconds)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePomo}
                        className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#ff758c] to-[#ff0844] px-3 py-1.5 font-mono text-xs font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-95 focus-visible:outline-none"
                      >
                        {isPomoRunning ? (
                          <>
                            <Pause size={12} /> Jeda
                          </>
                        ) : (
                          <>
                            <Play size={12} /> Mulai
                          </>
                        )}
                      </button>
                      <button
                        onClick={resetPomo}
                        className="rounded-xl border border-orange-100 bg-white p-1.5 text-[#5c4d47] transition-all hover:bg-orange-50 focus-visible:outline-none"
                        title="Reset Timer"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-[#5c4d47]/80 italic">
                    &ldquo;Fokus 25 menit ya. Nanti kalau sudah selesai, aku buatin kopi susu.&rdquo;
                  </p>
                </div>

                {/* Widget 2: Interactive Tasks Checklist */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#5c4d47]/70">
                      Agenda Kos Hari Ini:
                    </span>
                    <span className="font-mono text-[9px] text-pink-600 font-semibold">
                      Klik untuk ceklis (+5 EXP)
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleToggleTask(task.id)}
                        className={`group flex items-center justify-between rounded-xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pink-500 ${
                          task.done
                            ? 'border-emerald-100 bg-emerald-50/50 text-[#5c4d47]/60'
                            : 'border-pink-100/60 bg-white/70 text-[#5c4d47] hover:border-pink-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {task.done ? (
                            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Circle size={15} className="text-gray-300 group-hover:text-pink-400 shrink-0" />
                          )}
                          <span
                            className={`text-xs font-medium ${
                              task.done ? 'line-through text-gray-400' : 'text-[#5c4d47]'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                        <span className="rounded-md bg-gray-100/80 px-1.5 py-0.5 font-mono text-[9px] text-gray-500">
                          {task.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Widget 3: Memory Ticker & Affection Bar */}
                <div className="mt-4 rounded-2xl border border-pink-100/80 bg-white/90 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-pink-600">
                      <Sparkles size={11} />
                      MEMORI AKTIF
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-amber-600">
                      <span>Lv. 3 Teman Kos</span>
                      {recentExpGain && (
                        <span className="text-pink-600 animate-pulse font-extrabold">+{recentExpGain} EXP!</span>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-[#5c4d47]/85 font-medium leading-relaxed">
                    Livia mengingat kamu lebih suka kopi susu hangat saat belajar malam.
                  </p>

                  {/* Affection Progress Bar */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between font-mono text-[9px] text-[#5c4d47]/60 mb-1">
                      <span>Ikatan Kos</span>
                      <span>{affectionExp} / 250 EXP</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-pink-100/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, (affectionExp / 250) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: BUKAN SEKADAR BOT (THE BOND & VOICE) ──────────── */}
      <section id="bond" className="relative py-20 px-4 sm:px-6 lg:px-8 border-t border-pink-100/60 bg-gradient-to-b from-[#fdfbf7] via-white/50 to-[#fdfbf7]">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#5c4d47]">
              Bukan Sekadar Bot,
              <br />
              Tapi Teman Satu Kos.
            </h2>
            <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-[#5c4d47]/85">
              Livia tinggal di kos bersamamu — memiliki suasana hati, preferensi, dan ingatan yang terus
              berkembang. Ketika kamu lelah, dia mengerti. Ketika kamu malas, teguran tsundere-nya
              membuatmu kembali ke meja belajar dengan senyuman.
            </p>
          </div>

          {/* Asymmetric Showcase Grid */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Card: Relationship Progression (7 cols) */}
            <div className="lg:col-span-7 rounded-[2rem] border border-white/80 bg-white/85 p-6 sm:p-8 shadow-[0_10px_32px_rgba(255,117,140,0.08)] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={16} className="text-pink-500 fill-pink-500" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-pink-600">
                    Sistem Afeksi Karakter
                  </span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-[#5c4d47]">
                  Dari Orang Asing Menjadi Teman Istimewa
                </h3>
                <p className="mt-2 text-sm text-[#5c4d47]/80 leading-relaxed">
                  Setiap sapaan harian, sesi fokus pomodoro, dan obrolan malam mempererat ikatanmu.
                  Seiring naiknya level afeksi, respon Livia bertransformasi: dari kaku dan jaga jarak,
                  menjadi tsundere penuh perhatian, hingga teman curhat yang sangat mempercayaimu.
                </p>

                {/* Progress Steps Visualizer */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-pink-100 bg-[#fdfbf7] p-3 text-center">
                    <span className="font-mono text-[9px] font-bold uppercase text-gray-400">Tahap 1</span>
                    <p className="mt-1 font-display text-base font-bold text-[#5c4d47]">Tetangga Baru</p>
                    <span className="font-mono text-[9px] text-gray-500">Formal & Waspada</span>
                  </div>
                  <div className="rounded-2xl border border-pink-100 bg-[#fdfbf7] p-3 text-center">
                    <span className="font-mono text-[9px] font-bold uppercase text-gray-400">Tahap 2</span>
                    <p className="mt-1 font-display text-base font-bold text-[#5c4d47]">Teman Satu Kos</p>
                    <span className="font-mono text-[9px] text-pink-600">Tsundere Khas</span>
                  </div>
                  <div className="rounded-2xl border border-pink-200 bg-pink-50/60 p-3 text-center shadow-sm">
                    <span className="font-mono text-[9px] font-bold uppercase text-pink-500">Tahap 3 (Kamu)</span>
                    <p className="mt-1 font-display text-base font-bold text-pink-700">Teman Belajar</p>
                    <span className="font-mono text-[9px] text-pink-600">Mulai Terbuka</span>
                  </div>
                  <div className="rounded-2xl border border-pink-100 bg-[#fdfbf7] p-3 text-center">
                    <span className="font-mono text-[9px] font-bold uppercase text-gray-400">Tahap 4</span>
                    <p className="mt-1 font-display text-base font-bold text-[#5c4d47]">Ikatan Khusus</p>
                    <span className="font-mono text-[9px] text-amber-600">Keluarga Dekat</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-pink-100 pt-4 flex items-center justify-between text-xs text-[#5c4d47]/70">
                <span>Ekspresi dinamis: Senang, Tersipu, Cemberut, Fokus, Kaget</span>
                <span className="font-mono font-bold text-pink-600">12+ Cerita VN</span>
              </div>
            </div>

            {/* Right Card: Ambient Lo-Fi Radio kos (5 cols) */}
            <div className="lg:col-span-5 rounded-[2rem] border border-white/80 bg-white/85 p-6 sm:p-8 shadow-[0_10px_32px_rgba(255,117,140,0.08)] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio size={16} className="text-amber-500" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#5c4d47]">
                      Radio Kamar Kos
                    </span>
                  </div>
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-600">
                    LO-FI AMBIENT
                  </span>
                </div>

                <h3 className="font-display text-2xl font-black text-[#5c4d47]">
                  Musik Pengiring Meja Belajar
                </h3>
                <p className="mt-2 text-sm text-[#5c4d47]/80 leading-relaxed">
                  Putar musik lo-fi langsung di kamar kos untuk membantumu fokus. Dilengkapi efek suara
                  hujan dan obrolan suara alami Livia via ElevenLabs.
                </p>

                {/* Interactive Radio Player Component */}
                <div className="mt-6 rounded-2xl border border-orange-100 bg-[#fdfbf7] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#5c4d47]">
                        {currentTrack.title}
                      </p>
                      <p className="font-mono text-[10px] text-pink-600">{currentTrack.vibe}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleAudio}
                        className="rounded-full bg-gradient-to-r from-[#ff758c] to-[#ff0844] p-3 text-white shadow-md transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none"
                        title={isPlayingAudio ? 'Jeda Radio' : 'Putar Radio'}
                      >
                        {isPlayingAudio ? <Pause size={15} /> : <Play size={15} className="translate-x-0.5" />}
                      </button>

                      <button
                        onClick={handleNextTrack}
                        className="rounded-full border border-orange-100 bg-white p-2 text-[#5c4d47] hover:bg-orange-50 transition-colors focus-visible:outline-none"
                        title="Lagu Berikutnya"
                      >
                        <ChevronRight size={15} />
                      </button>

                      <button
                        onClick={handleToggleMute}
                        className="rounded-full border border-orange-100 bg-white p-2 text-[#5c4d47] hover:bg-orange-50 transition-colors focus-visible:outline-none"
                        title={isMuted ? 'Suarakan' : 'Bisukan'}
                      >
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Equalizer animation bar */}
                  <div className="mt-4 flex items-end justify-between gap-1 h-6 px-1">
                    {[40, 75, 25, 90, 60, 85, 30, 95, 50, 70, 45, 80].map((h, i) => (
                      <div
                        key={i}
                        className={`w-full rounded-full transition-all duration-300 ${
                          isPlayingAudio ? 'bg-gradient-to-t from-pink-400 to-pink-500 animate-pulse' : 'bg-gray-200'
                        }`}
                        style={{ height: isPlayingAudio ? `${h}%` : '20%' }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-gray-500 font-mono">
                Didukung oleh ElevenLabs Streaming TTS untuk suara ekspresif & responsif.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: PRODUKTIVITAS KOS (TOOLS SUITE) ────────────────── */}
      <section id="productivity" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#fdfbf7]">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#5c4d47]">
              Ritme Produktivitas
              <br />
              Yang Diurus Berdua.
            </h2>
            <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-[#5c4d47]/85">
              Alat to-do dan pomodoro biasa cepat ditinggalkan karena terasa membosankan. Di Teman Kos,
              setiap tugas diselipkan dalam percakapan sehari-hari bersama Livia.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tool 1: Pomodoro dengan Pengawasan */}
            <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 mb-4">
                  <Clock size={20} />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-[#5c4d47]">
                  Pomodoro Bersama Livia
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#5c4d47]/80 leading-relaxed">
                  Livia akan ikut duduk di meja belajarmu. Jika kamu berpindah tab atau meninggalkan
                  sesi belajar terlalu lama, dia akan menegurmu dan mengajak kembali fokus.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-pink-100 bg-[#fdfbf7] p-3 text-xs font-mono text-pink-700">
                &ldquo;Jangan buka media sosial dulu. Selesaikan sesi ini, baru kita ngobrol santai.&rdquo;
              </div>
            </div>

            {/* Tool 2: Belanja Dapur Kos & Checklist */}
            <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
                  <Coffee size={20} />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-[#5c4d47]">
                  Daftar Belanja & Dapur Kos
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#5c4d47]/80 leading-relaxed">
                  Catat stok mie instan, telur, sabun, atau kopi cukup lewat obrolan biasa. Livia
                  mengelompokkan barang belanjaan secara otomatis lewat pemanggilan alat terstruktur.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-orange-100 bg-[#fdfbf7] p-3 text-xs font-mono text-[#5c4d47]">
                &ldquo;Aku udah tambahin kopi sachet dan roti ke daftar belanjaan kos ya!&rdquo;
              </div>
            </div>

            {/* Tool 3: Jadwal & Pengingat Rutin */}
            <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-[#5c4d47]">
                  Sapaan Pagi & Evaluasi Malam
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#5c4d47]/80 leading-relaxed">
                  Memulai hari dengan review jadwal harian dan menyelesaikannya dengan refleksi malam.
                  Livia merangkum apa saja yang sudah berhasil kamu capai hari ini.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-emerald-100 bg-[#fdfbf7] p-3 text-xs font-mono text-emerald-800">
                &ldquo;Kerja bagus hari ini! 3 dari 4 tugasmu selesai. Istirahat yang cukup ya.&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: MEMORI BERLAPIS & PRIVASI (BYOK) ─────────────── */}
      <section id="memory" className="relative py-20 px-4 sm:px-6 lg:px-8 border-t border-pink-100/60 bg-gradient-to-b from-[#fdfbf7] via-white/60 to-[#fdfbf7]">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#5c4d47]">
              Ingatan yang Setia,
              <br />
              Privasi yang Tanpa Kompromi.
            </h2>
            <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-[#5c4d47]/85">
              Livia bukan bot sekali pakai yang lupa ceritamu besok pagi. Arsitektur memori tiga lapis
              kami menyimpan kenangan hidup bersamamu, sementara data dan API Key tetap aman di bawah
              kendali penuhmu.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Memory Layers (7 cols) */}
            <div className="lg:col-span-7 rounded-[2rem] border border-white/80 bg-white/85 p-6 sm:p-8 shadow-[0_10px_32px_rgba(255,117,140,0.08)] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={16} className="text-pink-500" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-pink-600">
                    Arsitektur Memori 3 Lapis
                  </span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-[#5c4d47]">
                  Bagaimana Livia Mengingat Dirimu
                </h3>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-pink-100 bg-[#fdfbf7] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-pink-600">01. INTI (CORE MEMORY)</span>
                      <span className="rounded-full bg-pink-100 px-2 py-0.5 font-mono text-[9px] font-bold text-pink-700">Abadi</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#5c4d47]">
                      Nama, cita-cita, jurusan kuliah, tanggal penting, dan prinsip hidupmu yang tidak
                      akan pernah luntur dari ingatan Livia.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-[#fdfbf7] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-600">02. EPISODIK (EPISODIC)</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-700">Kilas Balik</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#5c4d47]">
                      Momen obrolan kemarin sore, keluhanmu soal tugas sulit, atau lelucon yang sempat
                      kalian tertawakan bersama di kos.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-[#fdfbf7] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-600">03. SEMANTIK (SEMANTIC)</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 font-mono text-[9px] font-bold text-blue-700">Preferensi</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#5c4d47]">
                      Koleksi preferensi kecil: merek kopi favorit, jenis musik pengantar belajar, hingga
                      jadwal tidur rutinmu.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-pink-100 pt-4 flex items-center justify-between text-xs text-[#5c4d47]/70">
                <span>Transparansi penuh: User bisa mengekspor atau menghapus memori kapan saja.</span>
              </div>
            </div>

            {/* BYOK & Security Guarantee (5 cols) */}
            <div className="lg:col-span-5 rounded-[2rem] border border-white/80 bg-white/85 p-6 sm:p-8 shadow-[0_10px_32px_rgba(255,117,140,0.08)] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Keamanan & Privasi Mutlak
                  </span>
                </div>
                <h3 className="font-display text-2xl font-black text-[#5c4d47]">
                  Bring Your Own Key (BYOK)
                </h3>
                <p className="mt-2 text-sm text-[#5c4d47]/80 leading-relaxed">
                  Gunakan kuota AI milikmu sendiri tanpa perantara komersial yang mengintip. Kami
                  mendukung Google Gemini, OpenAI, dan model pilihan lainnya.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                    <Lock size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-[#5c4d47]">
                      <b>Enkripsi AES-256-GCM:</b> Kunci API dienkripsi di server dan tidak pernah
                      tersimpan di browser localStorage atau cookie.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-pink-100 bg-pink-50/40 p-3">
                    <ShieldCheck size={16} className="text-pink-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-[#5c4d47]">
                      <b>Bebas Pelacakan PII:</b> Tidak ada data pribadi atau rekaman audio yang dijual
                      ke pengiklan pihak ketiga.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-pink-100">
                <button
                  onClick={() => setIsApiModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-orange-100 bg-white px-4 py-3 font-mono text-xs font-bold text-[#5c4d47] transition-all hover:bg-orange-50/60 hover:border-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  <Key size={14} className="text-amber-500" />
                  <span>Buka Panduan & Pengaturan Kunci API</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: LEMARI PAKAIAN & PERSONALISASI ───────────────── */}
      <section id="wardrobe" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#fdfbf7]">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#5c4d47]">
              Lemari Pakaian Livia.
            </h2>
            <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-[#5c4d47]/85">
              Sesuaikan penampilan Livia sesuai suasana hatimu atau agenda hari ini. Buka pakaian baru
              melalui pencapaian tugas harian dan peningkatan level hubungan.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Outfit Selector Tabs (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {WARDROBE_ITEMS.map((item) => {
                const isSelected = selectedWardrobe.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedWardrobe(item)}
                    className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                      isSelected
                        ? 'border-pink-300 bg-white shadow-[0_8px_24px_rgba(255,117,140,0.15)] ring-1 ring-pink-200'
                        : 'border-pink-100/70 bg-white/60 hover:bg-white hover:border-pink-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-black text-[#5c4d47]">
                        {item.label}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold ${
                          isSelected
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-pink-50 group-hover:text-pink-600'
                        }`}
                      >
                        {item.tag}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#5c4d47]/80 line-clamp-2">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Wardrobe Preview Stage (7 cols) */}
            <div className="lg:col-span-7 rounded-[2.5rem] border border-white/80 bg-white/80 p-6 sm:p-8 shadow-[0_16px_40px_rgba(255,117,140,0.12)] backdrop-blur-2xl flex flex-col items-center">
              <div className="relative w-full h-[420px] sm:h-[480px] flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#fdfbf7] to-pink-50/30 border border-pink-100/60">
                {/* Background wardrobe illustration hint */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-multiply pointer-events-none"
                  style={{ backgroundImage: "url('/bg/wardrobe-bg.webp')" }}
                />

                {/* Real Wardrobe Sprite Image */}
                <div className="relative z-10 h-full w-full max-w-[340px] flex items-end justify-center">
                  <Image
                    key={selectedWardrobe.id}
                    src={`/livia/wardrobe/${selectedWardrobe.id}.webp`}
                    alt={`Livia - ${selectedWardrobe.label}`}
                    width={400}
                    height={600}
                    className="h-full w-auto object-contain drop-shadow-[0_10px_25px_rgba(255,117,140,0.25)] transition-all duration-300 animate-[rise_400ms_ease-out]"
                    priority
                  />
                </div>

                {/* Floating Quote from Livia */}
                <div className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-white/90 bg-white/90 p-4 shadow-lg backdrop-blur-md">
                  <span className="font-mono text-[9px] font-bold text-pink-600 uppercase tracking-widest">
                    Livia Berkata:
                  </span>
                  <p className="mt-0.5 text-xs sm:text-sm font-medium text-[#5c4d47] italic">
                    &ldquo;{selectedWardrobe.dialogue}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: FAREWELL ROOM & CONVERSION CTA ─────────────────── */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-pink-100/60 bg-gradient-to-b from-[#fdfbf7] to-white">
        <div className="mx-auto max-w-5xl rounded-[3rem] border border-white/80 bg-white/90 p-8 sm:p-14 text-center shadow-[0_20px_50px_rgba(255,117,140,0.15)] backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle Ambient Lamp */}
          <div
            aria-hidden
            className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-pink-400/15 blur-3xl pointer-events-none"
          />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-100 bg-pink-50/80 px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-pink-600 mb-4">
              <Sparkles size={12} />
              PINTU KOST TERBUKA UNTUKMU
            </span>

            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[#5c4d47]">
              Mulai Hari Ini Tanpa Rasa Sepi.
            </h2>

            <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-[#5c4d47]/85">
              Meja belajar sudah siap, playlist kamar sudah menyala, dan Livia sedang menunggumu untuk
              memulai sesi fokus pertama. Daftar gratis dan rasakan perbedaannya.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff758c] to-[#ff0844] px-8 py-4 text-base font-bold text-white shadow-[0_12px_30px_rgba(255,117,140,0.38)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(255,117,140,0.48)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <span className="font-display font-black uppercase tracking-wider text-lg">
                  Tinggal Bersama Livia
                </span>
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-orange-100 bg-white px-8 py-4 text-base font-bold text-[#5c4d47] transition-all hover:bg-orange-50/50 hover:border-orange-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <span className="font-display font-black uppercase tracking-wider text-lg">
                  Sudah Ada Akun? Masuk
                </span>
              </Link>
            </div>

            <p className="mt-6 font-mono text-[10px] text-gray-500">
              Mendukung API Key Gemini & OpenAI pribadi · Tidak ada komitmen langganan paksa
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="border-t border-pink-100/60 bg-[#fdfbf7] py-8 px-4 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-[#5c4d47]/70">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold text-[#5c4d47]">Teman Kos</span>
            <span>&copy; {new Date().getFullYear()} AI-Waifu Project. Lisensi MIT.</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="#hero"
              className="hover:text-pink-600 transition-colors focus-visible:outline-none"
            >
              Kembali ke Atas ↑
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-pink-600 transition-colors focus-visible:outline-none"
            >
              GitHub <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
