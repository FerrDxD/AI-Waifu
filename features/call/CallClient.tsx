'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PhoneOff, Mic, MicOff, Loader2, Volume2, Volume1 } from 'lucide-react';
import { LiviaExpression } from '@/lib/gemini';
import { TtsPipeline } from '@/lib/tts/pipeline';
import { CallSession, type CallStatus } from '@/lib/call/session';

// Web Speech API Types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/**
 * Halaman voice call (M6.2).
 *
 * Logika voice (continuous listening, barge-in, giliran, status) hidup di
 * `CallSession` (lib/call/session.ts) — komponen ini hanya wiring + UI.
 *
 * Turn cue realtime:
 *  - Header: dot berwarna + label status + timer durasi.
 *  - Avatar: ring hijau saat Livia bicara, pink saat suara user terdeteksi.
 *  - Tombol mic: mute/unmute (bukan PTT lagi) — recognition berjalan
 *    continuous selama mic on.
 */

const STATUS_LABEL: Record<CallStatus, string> = {
  connecting: 'Menghubungkan...',
  idle: 'Terhubung',
  listening: 'Mendengarkan...',
  thinking: 'Menunggu respon...',
  speaking: 'Livia sedang berbicara...',
  error: '', // dipakai statusDetail
};

/** Label singkat untuk pill status di header. */
const STATUS_SHORT: Record<CallStatus, string> = {
  connecting: 'TERHUBUNG',
  idle: 'SIAGA',
  listening: 'MENDENGARKAN',
  thinking: 'BERPIKIR',
  speaking: 'BERBICARA',
  error: 'MASALAH',
};

/** Warna dot status. */
const STATUS_DOT: Record<CallStatus, string> = {
  connecting: 'bg-gray-400',
  idle: 'bg-gray-400',
  listening: 'bg-pink-400',
  thinking: 'bg-amber-400',
  speaking: 'bg-green-400',
  error: 'bg-red-400',
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
    // Volume kalimat berikutnya diambil lewat getVolume() pipeline; audio
    // yang sedang diputar tidak disetel retroaktif.
  };

  useEffect(() => {
    // Fetch profile for outfit & affection
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
        setStatusDetail('Gagal menghubungkan.');
      });
  }, []);

  // Sesi call dibuat saat call siap; status dari sesi yang jadi acuan UI.
  useEffect(() => {
    if (!isReady) return;

    const session = new CallSession({
      createRecognition: () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        const rec = new SR();
        // M6.2: continuous + interim — sesi recognition diperpanjang dan
        // auto-restart oleh CallSession.
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
    let interval: any;
    if (timerStarted) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStarted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleMicClick = () => {
    // M6.2: tombol mic = mute/unmute (bukan lagi PTT).
    const next = !muted;
    setMuted(next);
    sessionRef.current?.setMuted(next);
  };

  if (!isReady) {
    return (
      <div className="h-[100dvh] w-full bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
        <Loader2 className="animate-spin text-pink-500 mb-4" size={40} />
        <p className="font-display animate-pulse">
          {status === 'error' ? statusDetail : STATUS_LABEL[status]}
        </p>
      </div>
    );
  }

  const isSpeaking = status === 'speaking';
  const shownStatus =
    status === 'error'
      ? statusDetail || 'Terjadi masalah.'
      : STATUS_LABEL[status];

  return (
    <div className="h-[100dvh] w-full bg-[#1a1a1c] relative overflow-hidden flex flex-col font-sans select-none text-white">
      {/* Blurred Background Image */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url(/livia/${outfit}/${expression}.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          filter: 'blur(40px)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1a1c] pointer-events-none" />

      {/* Top Header (LINE Style) — turn cue realtime (M6.2) */}
      <div className="w-full h-12 flex items-center px-4 z-20">
        <span className="text-xs font-semibold tracking-wide opacity-80">LINE</span>
        <div className="flex-1 flex items-center justify-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${STATUS_DOT[status]} ${
              status === 'thinking' ? 'animate-pulse' : ''
            }`}
          />
          <span className="text-[10px] font-mono tracking-widest text-gray-300">
            {STATUS_SHORT[status]}
          </span>
          {timerStarted && (
            <span className="text-[10px] font-mono text-gray-400 ml-2">
              {formatTime(callDuration)}
            </span>
          )}
        </div>
        <button className="text-gray-400 hover:text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Main Profile Area */}
      <div className="flex-1 flex flex-col items-center justify-center z-20 pb-20">
        {/* Avatar Ring Animation */}
        <div className={`relative flex items-center justify-center mb-6 transition-transform duration-500 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-30" />
              <div className="absolute inset-0 rounded-full border-4 border-green-500/30 scale-110" />
            </>
          )}
          {hearing && !muted && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-pink-400 animate-ping opacity-30" />
              <div className="absolute inset-0 rounded-full border-4 border-pink-400/30 scale-110" />
            </>
          )}

          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-slate-800 border-2 border-[#2c2c2f] shadow-2xl relative z-10">
            <img
              src={`/livia/${outfit}/${expression}.png`}
              alt="Livia Profile"
              className="w-full h-[150%] object-cover object-top -mt-4"
            />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#f5f6f6] drop-shadow-md">
          Livia Einhart
        </h1>
        <p className={`text-sm mt-2 font-mono transition-colors duration-300 ${hearing && !muted ? 'text-pink-400 font-medium' : isSpeaking ? 'text-green-400 font-medium' : 'text-[#8b8b8f]'}`}>
          {shownStatus}
        </p>

        {status === 'error' && statusDetail ? (
          <div className="mt-8 px-6 py-3 bg-emerald-900/60 backdrop-blur-md rounded-2xl border border-emerald-400/30 max-w-[85%] text-center text-sm text-emerald-100 shadow-inner whitespace-pre-line">
            {statusDetail}
          </div>
        ) : transcript ? (
          <div className="mt-8 px-6 py-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 max-w-[80%] text-center text-sm text-gray-300 shadow-inner">
            "{transcript}"
          </div>
        ) : null}
      </div>

      {/* Bottom Controls (LINE Desktop Style) */}
      <div className="h-32 w-full z-20 flex flex-col items-center justify-center border-t border-white/5 bg-[#202022]/80 backdrop-blur-xl">
        <div className="flex items-center gap-6 md:gap-10">
          {/* Speaker Button */}
          <button onClick={toggleSpeaker} className="flex flex-col items-center gap-2 group">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${speakerOn ? 'bg-[#353538] text-green-400 group-hover:bg-[#454548]' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>
               {speakerOn ? <Volume2 size={20} /> : <Volume1 size={20} />}
            </div>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide">Speaker</span>
          </button>

          {/* Camera (Disabled) */}
          <button className="flex flex-col items-center gap-2 group opacity-50 cursor-not-allowed">
            <div className="w-12 h-12 rounded-full bg-[#353538] flex items-center justify-center text-gray-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </div>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide">Kamera</span>
          </button>

          {/* Microphone (M6.2: mute/unmute — listening continuous) */}
          <button
            onClick={handleMicClick}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
              muted
                ? 'bg-white/10 text-gray-400 hover:bg-white/20'
                : 'bg-white text-black ring-4 ring-white/10'
            }`}>
              {hearing && !muted && (
                <div className="absolute inset-0 rounded-full border-2 border-pink-400 animate-ping opacity-40" />
              )}
              {muted ? <MicOff size={24} /> : <Mic size={24} />}
            </div>
            <span className={`text-[10px] font-bold tracking-wide ${muted ? 'text-gray-500' : 'text-white'}`}>
              {muted ? 'Mic off' : 'Mic'}
            </span>
          </button>

          {/* End Call */}
          <Link
            href="/chat"
            onClick={() => {
              sessionRef.current?.dispose();
            }}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-full bg-[#f3453b] hover:bg-[#ff554b] flex items-center justify-center text-white transition-colors shadow-lg active:scale-95">
              <PhoneOff size={24} />
            </div>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide">Tutup</span>
          </Link>

        </div>
      </div>
    </div>
  );
}
