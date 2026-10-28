'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PhoneOff, Mic, MicOff, Loader2, Volume2, Volume1 } from 'lucide-react';
import { LiviaExpression } from '@/lib/gemini';
import { TtsPipeline } from '@/lib/tts/pipeline';
import { takeCompleteSentences } from '@/lib/tts/sentences';

// Web Speech API Types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/**
 * Status call (M6.1/M6.2) — satu sumber kebenaran untuk turn cue UI.
 * Ganti status string ad-hoc lama supaya indikator realtime konsisten.
 */
type CallStatus = 'connecting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

const STATUS_LABEL: Record<CallStatus, string> = {
  connecting: 'Menghubungkan...',
  idle: 'Terhubung',
  listening: 'Mendengarkan...',
  thinking: 'Menunggu respon...',
  speaking: 'Livia sedang berbicara...',
  error: '', // dipakai statusDetail
};

/** Bentuk event `done` dari /api/chat/stream yang dibutuhkan call. */
type StreamDoneEvent = {
  type: 'done';
  reply?: string;
  expression?: LiviaExpression;
  crisis?: { message?: string; escalate?: boolean };
};

type StreamEvent =
  | { type: 'delta'; text?: string }
  | StreamDoneEvent
  | { type: 'error'; message?: string };

export default function CallPage() {
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [statusDetail, setStatusDetail] = useState('');

  const [outfit, setOutfit] = useState('default');
  const [expression, setExpression] = useState<LiviaExpression>('normal');
  const [affection, setAffection] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(true);

  const [callDuration, setCallDuration] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const speakerRef = useRef(true);
  const transcriptRef = useRef('');
  const pipelineRef = useRef<TtsPipeline | null>(null);

  const toggleSpeaker = () => {
    const newState = !speakerOn;
    setSpeakerOn(newState);
    speakerRef.current = newState;
    // Volume kalimat berikutnya diambil lewat getVolume() pipeline; audio
    // yang sedang diputar tidak disetel retroaktif (perubahan di kalimat
    // berikutnya terasa lebih alami daripada lompatan volume di tengah).
  };

  useEffect(() => {
    // Fetch profile for outfit & affection
    fetch(`/api/affection`)
      .then((r) => r.ok && r.json())
      .then((d) => {
        if (d) {
          setOutfit(d.activeOutfit || 'default');
          setAffection(d.affection || 0);
          setStatus('idle');
          setIsReady(true);
        }
      })
      .catch(() => {
        setStatus('error');
        setStatusDetail('Gagal menghubungkan.');
      });

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setIsRecording(true);
        // Barge-in dasar (M6.2): user mulai bicara → Livia jeda.
        if (pipelineRef.current?.isSpeaking) pipelineRef.current.stop();
        setStatus('listening');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        transcriptRef.current = currentTranscript;
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        const finalMsg = transcriptRef.current;
        if (finalMsg.trim().length > 0) {
          sendMessage(finalMsg.trim());
          transcriptRef.current = '';
          // Jangan setTranscript('') di sini agar teksnya masih terbaca selama Livia mikir.
        } else {
          // User berhenti bicara tanpa pesan — kembali ke kondisi terakhir.
          setStatus((prev) =>
            prev === 'listening' ? (pipelineRef.current?.isSpeaking ? 'speaking' : 'idle') : prev
          );
        }
      };

      recognitionRef.current = recognition;
    } else {
      setStatus('error');
      setStatusDetail('Browser tidak mendukung fitur suara.');
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      pipelineRef.current?.stop();
    };
    // sendMessage memakai state awal saja (status via functional update) —
    // effect hanya perlu jalan sekali saat mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop(); // This will trigger onend
    } else {
      setTranscript('');
      transcriptRef.current = '';
      recognitionRef.current.start();
    }
  };

  /**
   * M6.1: giliran percakapan = stream SSE → pipeline TTS.
   *
   * Balasan tidak menunggu utuh: tiap kalimat yang sudah lengkap langsung
   * di-enqueue ke TtsPipeline — Livia mulai bicara sambil LLM masih
   * menulis kalimat berikutnya.
   */
  const sendMessage = async (message: string) => {
    // Batalgilir manual: matikan giliran sebelumnya sebelum yang baru.
    pipelineRef.current?.stop();
    const pipeline = new TtsPipeline({
      onStateChange: (state) => {
        if (state === 'speaking') {
          setStatus((prev) => (prev === 'listening' ? prev : 'speaking'));
          setTimerStarted(true);
        } else if (state === 'idle') {
          // Kalimat terakhir selesai → balik ke idle (kecuali user sedang
          // bicara / Livia belum selesai berpikir).
          setStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
        }
      },
      getVolume: () => {
        const savedLiviaVol = localStorage.getItem('livia_volume');
        const liviaVol = savedLiviaVol !== null ? parseInt(savedLiviaVol, 10) / 100 : 0.8;
        return speakerRef.current ? liviaVol : liviaVol * 0.25;
      },
    });
    pipelineRef.current = pipeline;
    setStatus('thinking');
    setExpression('normal');

    let unspoken = ''; // teks belum diucapkan (kalimat tidak lengkap)
    let gotAny = false;
    let sseBuffer = '';
    const decoder = new TextDecoder();

    const handleEvent = (raw: string) => {
      if (!raw.startsWith('data: ')) return;
      let event: StreamEvent;
      try {
        event = JSON.parse(raw.slice(6)) as StreamEvent;
      } catch {
        return;
      }

      if (event.type === 'delta' && typeof event.text === 'string') {
        gotAny = true;
        unspoken += event.text;
        const { sentences, tail } = takeCompleteSentences(unspoken);
        unspoken = tail;
        for (const sentence of sentences) pipeline.enqueue(sentence);
      } else if (event.type === 'done') {
        // Sisa buffer (kalimat terakhir tanpa penutup) diucapkan sekalian.
        if (unspoken.trim()) pipeline.enqueue(unspoken);
        unspoken = '';
        if (event.expression) setExpression(event.expression);
        if (event.crisis?.escalate) {
          // Krisis (M4.2): persona dilepas — Livia berhenti bicara dan
          // pesannya (sudah memuat hotline) ditampilkan. Panel krisis
          // lengkap di call = utang M6.
          pipeline.stop();
          setStatus('error');
          setStatusDetail(event.crisis.message || 'Perlu bantuan? Hubungi orang terdekatmu.');
        }
      } else if (event.type === 'error') {
        pipeline.stop();
        setStatus('error');
        setStatusDetail(event.message || 'Koneksi terputus.');
      }
    };

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isVoiceCall: true }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error((data as { error?: string } | null)?.error || 'Koneksi terputus.');
      }

      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const chunks = sseBuffer.split('\n\n');
        sseBuffer = chunks.pop() ?? '';
        for (const chunk of chunks) handleEvent(chunk.trim());
      }
      if (sseBuffer.trim()) handleEvent(sseBuffer.trim());

      if (!gotAny) {
        setStatus('error');
        setStatusDetail('Livia tidak sempat menjawab.');
      }
    } catch (e) {
      console.error(e);
      pipeline.stop();
      setStatus('error');
      setStatusDetail('Koneksi terputus.');
    }
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
    isRecording && status === 'listening'
      ? 'Mendengarkan...'
      : status === 'idle' && timerStarted
        ? formatTime(callDuration)
        : status === 'error'
          ? statusDetail || STATUS_LABEL.error
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

      {/* Top Header (LINE Style) */}
      <div className="w-full h-12 flex justify-between items-center px-4 z-20 opacity-80">
        <span className="text-xs font-semibold tracking-wide">LINE</span>
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
          {isRecording && (
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
        <p className={`text-sm mt-2 font-mono transition-colors duration-300 ${isRecording ? 'text-pink-400 font-medium' : isSpeaking ? 'text-green-400 font-medium' : 'text-[#8b8b8f]'}`}>
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

          {/* Microphone (PTT) */}
          <button
            onClick={handleMicClick}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
              isRecording
                ? 'bg-white text-black ring-4 ring-white/20'
                : 'bg-[#353538] text-white hover:bg-[#454548]'
            }`}>
              {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
            </div>
            <span className={`text-[10px] font-bold tracking-wide ${isRecording ? 'text-white' : 'text-gray-400'}`}>
              {isRecording ? 'Stop' : 'Bicara'}
            </span>
          </button>

          {/* End Call */}
          <Link
            href="/chat"
            onClick={() => {
              pipelineRef.current?.stop();
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
