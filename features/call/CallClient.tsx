'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PhoneOff, Mic, MicOff, Loader2, Volume2, Volume1 } from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';

// Web Speech API Types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function CallPage() {
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Menghubungkan...');
  
  const [outfit, setOutfit] = useState('default');
  const [expression, setExpression] = useState<LiviaExpression>('normal');
  const [affection, setAffection] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(true);

  const [callDuration, setCallDuration] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const speakerRef = useRef(true);
  const transcriptRef = useRef('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleSpeaker = () => {
    const newState = !speakerOn;
    setSpeakerOn(newState);
    speakerRef.current = newState;
    if (audioRef.current) {
      audioRef.current.volume = newState ? 1.0 : 0.25;
    }
  };

  useEffect(() => {
    // Fetch profile for outfit & affection
    fetch(`/api/affection`).then(r => r.ok && r.json()).then(d => {
      if (d) {
        setOutfit(d.activeOutfit || 'default');
        setAffection(d.affection || 0);
        setStatus('Terhubung');
        setIsReady(true);
      }
    }).catch(() => {
      setStatus('Gagal menghubungkan.');
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
        setStatus('Livia sedang mendengarkan...');
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
        setStatus('Gagal mendengar suaramu.');
      };

      recognition.onend = () => {
        setIsRecording(false);
        const finalMsg = transcriptRef.current;
        if (finalMsg.trim().length > 0) {
          sendMessage(finalMsg.trim());
          transcriptRef.current = '';
          // Jangan setTranscript('') di sini agar teksnya masih terbaca selama Livia mikir.
        }
      };

      recognitionRef.current = recognition;
    } else {
      setStatus('Browser tidak mendukung fitur suara.');
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (timerStarted) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStarted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
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

  const sendMessage = async (message: string) => {
    setStatus('Livia sedang berpikir...');
    setExpression('normal');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isVoiceCall: true }),
      });

      const data = await res.json();
      if (data.reply) {
        setExpression(data.expression || 'normal');
        speakText(data.reply);
      }
    } catch (e) {
      setStatus('Koneksi terputus.');
    }
  };

  const speakText = async (text: string) => {
    // Hentikan audio yang sedang berjalan jika ada
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
        console.error('ElevenLabs API error');
        setStatus('Terhubung (TTS Gagal)');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      const savedLiviaVol = localStorage.getItem('livia_volume');
      const liviaVol = savedLiviaVol !== null ? parseInt(savedLiviaVol, 10) / 100 : 0.8;
      audio.volume = speakerRef.current ? liviaVol : liviaVol * 0.25;
      
      audio.onplay = () => {
        setIsSpeaking(true);
        if (!timerStarted) setTimerStarted(true);
        setStatus('Livia sedang berbicara...');
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setStatus('Terhubung');
        setTranscript('');
        URL.revokeObjectURL(url);
      };

      audioRef.current = audio;
      audio.play();

    } catch (error) {
      console.error('Failed to play TTS:', error);
      setStatus('Terhubung (TTS Gagal)');
    }
  };

  if (!isReady) {
    return (
      <div className="h-[100dvh] w-full bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
        <Loader2 className="animate-spin text-pink-500 mb-4" size={40} />
        <p className="font-display animate-pulse">{status}</p>
      </div>
    );
  }

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
              <div className="absolute inset-0 rounded-full border-4 border-pink-500/30 scale-110" />
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
          {isRecording ? 'Mendengarkan...' : 
           status === 'Livia sedang berpikir...' ? 'Menunggu respon...' :
           timerStarted ? formatTime(callDuration) : status}
        </p>

        {transcript && (
          <div className="mt-8 px-6 py-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 max-w-[80%] text-center text-sm text-gray-300 shadow-inner">
            "{transcript}"
          </div>
        )}
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
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
              }
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
