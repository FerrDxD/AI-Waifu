'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  PhoneOff,
  Mic,
  MicOff,
  Loader2,
  Volume2,
  Volume1,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { LiviaExpression } from '@/lib/gemini';
import { TtsPipeline } from '@/lib/tts/pipeline';
import { CallSession, type CallStatus } from '@/lib/call/session';

const STATUS_LABEL: Record<CallStatus, string> = {
  connecting: 'Menghubungkan ke kamar kos...',
  idle: 'Livia sedang siaga',
  listening: 'Mendengarkan ucapanmu...',
  thinking: 'Livia sedang berpikir...',
  speaking: 'Livia sedang berbicara...',
  error: '',
};

const STATUS_SHORT: Record<CallStatus, string> = {
  connecting: 'MENGHUBUNGKAN',
  idle: 'SIAGA',
  listening: 'MENDENGARKAN',
  thinking: 'BERPIKIR',
  speaking: 'BERBICARA',
  error: 'GANGGUAN',
};

const STATUS_DOT: Record<CallStatus, string> = {
  connecting: 'bg-amber-400',
  idle: 'bg-emerald-400',
  listening: 'bg-pink-400',
  thinking: 'bg-amber-400',
  speaking: 'bg-emerald-400',
  error: 'bg-rose-500',
};

export default function CallPage() {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [statusDetail, setStatusDetail] = useState('');
  const [transcript, setTranscript] = useState('');
  const [hearing, setHearing] = useState(false);
  const [muted, setMuted] = useState(false);

  const [outfit, setOutfit] = useState('default');
  const [expression, setExpression] = useState<LiviaExpression>('normal');
  const [affection, setAffection] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(true);

  const [callDuration, setCallDuration] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);

  const speakerRef = useRef(true);
  const sessionRef = useRef<CallSession | null>(null);

  const toggleSpeaker = () => {
    const newState = !speakerOn;
    setSpeakerOn(newState);
    speakerRef.current = newState;
  };

  useEffect(() => {
    fetch(`/api/affection`)
      .then((r) => r.ok && r.json())
      .then((d) => {
        if (d) {
          setOutfit(d.activeOutfit || 'default');
          setAffection(d.affection || 0);
          setIsReady(true);
        }
      })
      .catch(() => {
        setStatus('error');
        setStatusDetail('Gagal menghubungkan ke kamar kos.');
      });
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const session = new CallSession({
      createRecognition: () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'id-ID';
        return rec;
      },
      createPipeline: (hooks) =>
        new TtsPipeline({
          onStateChange: hooks.onState,
          getVolume: hooks.getVolume,
        }),
      getVolume: () => {
        const savedLiviaVol = localStorage.getItem('livia_volume');
        const liviaVol =
          savedLiviaVol !== null ? parseInt(savedLiviaVol, 10) / 100 : 0.8;
        return speakerRef.current ? liviaVol : liviaVol * 0.25;
      },
      events: {
        onStatus: (s, detail) => {
          setStatus(s);
          setStatusDetail(detail ?? '');
          if (s === 'speaking') setTimerStarted(true);
        },
        onTranscript: setTranscript,
        onHearing: setHearing,
        onExpression: (e) => setExpression(e as LiviaExpression),
      },
    });
    sessionRef.current = session;
    session.connect();

    return () => {
      session.dispose();
      sessionRef.current = null;
    };
  }, [isReady]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerStarted) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerStarted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleMicClick = () => {
    const next = !muted;
    setMuted(next);
    sessionRef.current?.setMuted(next);
  };

  if (!isReady) {
    return (
      <div className="h-[100dvh] w-full bg-[#141312] flex flex-col items-center justify-center text-white font-sans selection:bg-[#ff758c]/30">
        <Loader2 className="animate-spin text-pink-400 mb-4" size={38} />
        <p className="font-display font-bold text-lg text-pink-100 animate-pulse">
          {status === 'error' ? statusDetail : STATUS_LABEL[status]}
        </p>
      </div>
    );
  }

  const isSpeaking = status === 'speaking';
  const shownStatus =
    status === 'error'
      ? statusDetail || 'Terjadi gangguan koneksi.'
      : STATUS_LABEL[status];

  // Avatar chibi konsisten dengan Chat dan modul lainnya
  const avatarImageSrc = '/livia/chibi-livia.webp';

  return (
    <div className="h-[100dvh] w-full bg-[#141312] relative overflow-hidden flex flex-col justify-between font-sans select-none text-white selection:bg-[#ff758c]/30">
      {/* Blurred Ambient Background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-20 pointer-events-none bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: `url('${avatarImageSrc}')`,
          filter: 'blur(50px)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#141312]/80 via-transparent to-[#141312] pointer-events-none"
      />

      {/* Top Header Bar */}
      <header className="w-full px-5 py-4 z-20 flex items-center justify-between border-b border-white/5 bg-[#141312]/60 backdrop-blur-xl">
        <Link
          href="/chat"
          onClick={() => sessionRef.current?.dispose()}
          className="p-2 -ml-2 text-white/70 hover:text-pink-400 hover:bg-white/5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          title="Kembali ke Chat"
        >
          <ArrowLeft size={20} />
        </Link>

        {/* Telemetry pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 backdrop-blur-md shadow-xs">
          <span
            className={`w-2 h-2 rounded-full ${STATUS_DOT[status]} ${
              status === 'thinking' || status === 'speaking' ? 'animate-pulse' : ''
            }`}
          />
          <span className="font-mono text-[10px] font-bold tracking-widest text-white/80">
            {STATUS_SHORT[status]}
          </span>
          {timerStarted && (
            <span className="font-mono text-[10px] text-pink-300 ml-1 border-l border-white/15 pl-2 tabular-nums">
              {formatTime(callDuration)}
            </span>
          )}
        </div>

        <Link
          href="/chat"
          onClick={() => sessionRef.current?.dispose()}
          className="p-2 -mr-2 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-all focus-visible:outline-none"
          title="Tutup Panggilan"
        >
          <PhoneOff size={18} />
        </Link>
      </header>

      {/* Main Companion Avatar & Audio Ripple Stage */}
      <main className="flex-1 flex flex-col items-center justify-center z-20 px-6 py-4">
        {/* Avatar Sound Ripple Ring */}
        <div
          className={`relative flex items-center justify-center mb-6 transition-transform duration-500 ${
            isSpeaking ? 'scale-105' : 'scale-100'
          }`}
        >
          {/* Livia speaking ring */}
          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-pulse opacity-40 scale-110" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 scale-125" />
            </>
          )}

          {/* User hearing / speaking ring */}
          {hearing && !muted && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-pink-400 animate-pulse opacity-50 scale-110" />
              <div className="absolute inset-0 rounded-full border-4 border-pink-500/25 scale-125" />
            </>
          )}

          {/* The Avatar Circle */}
          <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-gradient-to-br from-pink-100 to-pink-50 border-2 border-white/40 shadow-[0_12px_40px_rgba(255,117,140,0.25)] z-10 flex items-center justify-center p-3">
            <Image
              src={avatarImageSrc}
              alt="Livia"
              width={200}
              height={200}
              className="w-full h-full object-contain"
              priority
            />
          </div>
        </div>

        {/* Character Title */}
        <h1 className="font-display font-black text-3xl md:text-4xl text-[#fdfbf7] tracking-tight drop-shadow-md">
          Livia Einhart
        </h1>

        <p
          className={`mt-2 font-mono text-xs tracking-wider transition-colors duration-300 ${
            hearing && !muted
              ? 'text-pink-300 font-bold'
              : isSpeaking
              ? 'text-emerald-300 font-bold'
              : 'text-white/60'
          }`}
        >
          {shownStatus}
        </p>

        {/* Live Transcript / Error Capsule */}
        {status === 'error' && statusDetail ? (
          <div className="mt-6 px-6 py-3 bg-rose-950/70 backdrop-blur-md rounded-2xl border border-rose-500/30 max-w-sm text-center text-xs text-rose-200 shadow-inner">
            {statusDetail}
          </div>
        ) : transcript ? (
          <div className="mt-6 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full border border-white/15 max-w-md text-center text-xs text-pink-100 shadow-sm animate-[fadeIn_0.2s_ease-out]">
            &ldquo;{transcript}&rdquo;
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-1.5 text-white/30 font-mono text-[11px]">
            <Sparkles size={12} />
            <span>ElevenLabs Voice · Real-Time Audio</span>
          </div>
        )}
      </main>

      {/* Bottom Controls Dock */}
      <footer className="h-32 w-full z-20 flex flex-col items-center justify-center border-t border-white/10 bg-[#1c1b1a]/90 backdrop-blur-2xl">
        <div className="flex items-center gap-8 md:gap-12">
          {/* Speaker Toggle */}
          <button
            onClick={toggleSpeaker}
            className="flex flex-col items-center gap-1.5 group focus-visible:outline-none"
            title={speakerOn ? 'Speaker Aktif' : 'Speaker Pelan'}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                speakerOn
                  ? 'bg-white/15 text-emerald-400 group-hover:bg-white/25'
                  : 'bg-white/5 text-white/50 group-hover:bg-white/15'
              }`}
            >
              {speakerOn ? <Volume2 size={20} /> : <Volume1 size={20} />}
            </div>
            <span className="font-mono text-[10px] font-bold text-white/60 group-hover:text-white">
              Speaker
            </span>
          </button>

          {/* Microphone Mute/Unmute */}
          <button
            onClick={handleMicClick}
            className="flex flex-col items-center gap-1.5 group focus-visible:outline-none"
            title={muted ? 'Aktifkan Mikrofon' : 'Bisukan Mikrofon'}
          >
            <div
              className={`relative w-15 h-15 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                muted
                  ? 'bg-white/10 text-white/50 hover:bg-white/20'
                  : 'bg-white text-[#141312] ring-4 ring-pink-500/20'
              }`}
            >
              {hearing && !muted && (
                <div className="absolute inset-0 rounded-full border-2 border-pink-400 animate-pulse opacity-60" />
              )}
              {muted ? <MicOff size={24} /> : <Mic size={24} />}
            </div>
            <span
              className={`font-mono text-[10px] font-bold ${
                muted ? 'text-white/40' : 'text-pink-300'
              }`}
            >
              {muted ? 'Mic Mati' : 'Mic Aktif'}
            </span>
          </button>

          {/* End Call Button */}
          <Link
            href="/chat"
            onClick={() => {
              sessionRef.current?.dispose();
            }}
            className="flex flex-col items-center gap-1.5 group focus-visible:outline-none"
            title="Akhiri Panggilan"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#ff0844] to-[#f3453b] hover:opacity-95 flex items-center justify-center text-white transition-all shadow-[0_4px_18px_rgba(255,8,68,0.4)] active:scale-95">
              <PhoneOff size={22} />
            </div>
            <span className="font-mono text-[10px] font-bold text-white/60 group-hover:text-rose-400">
              Tutup
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
