'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, CheckCircle2, Phone, LifeBuoy, ExternalLink, Mic, MicOff } from 'lucide-react';
import Link from 'next/link';
import { playSfx } from '@/lib/sfx';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';


interface ChatMessage {
  id: string;
  role: 'user' | 'livia';
  content: string;
  isNew?: boolean;
}

/** Bentuk data krisis yang dikirim server (M4.2). */
interface CrisisInfo {
  message: string;
  resources: Array<{ name: string; contact: string; note: string }>;
  directoryUrl: string;
  escalate: boolean;
}

/**
 * Panel bantuan krisis (M4.2).
 *
 * Sengaja dibuat mencolok dan tidak bisa dilewati diam-diam: hijau/tenang,
 * bukan merah panik, tapi jelas bukan bagian dari roleplay. Nomor hotline bisa
 * diklik langsung dari HP.
 */
function CrisisPanel({ info, onDismiss }: { info: CrisisInfo; onDismiss: () => void }) {
  const { language } = useLanguage();
  const isUrl = (value: string) => /^https?:\/\//.test(value);

  return (
    <div className="mx-3 my-3 rounded-3xl border-2 border-emerald-200 bg-emerald-50/70 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
          <LifeBuoy className="text-white w-4 h-4" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-display font-black text-sm text-emerald-800">
            {language === 'en' ? 'You deserve real support' : 'Kamu berhak dapat bantuan nyata'}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium leading-relaxed">
            {language === 'en'
              ? 'Livia is an AI and cannot help with this. These services can.'
              : 'Livia adalah AI dan tidak bisa menangani ini. Layanan berikut bisa.'}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {info.resources.map((resource) => (
          <li key={resource.name} className="bg-white rounded-2xl p-3 border border-emerald-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black text-emerald-800">{resource.name}</span>
              {isUrl(resource.contact) ? (
                <a
                  href={resource.contact}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-600 underline inline-flex items-center gap-1"
                >
                  {language === 'en' ? 'Open' : 'Buka'} <ExternalLink size={10} />
                </a>
              ) : (
                <a
                  href={`tel:${resource.contact.replace(/[^\d+]/g, '')}`}
                  className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg"
                >
                  {resource.contact}
                </a>
              )}
            </div>
            <p className="text-[10px] text-emerald-600/80 font-medium mt-1 leading-snug">
              {resource.note}
            </p>
          </li>
        ))}
      </ul>

      <button
        onClick={onDismiss}
        className="text-[10px] font-bold text-emerald-600/70 hover:text-emerald-800 self-end transition-colors"
      >
        {language === 'en' ? 'Hide' : 'Sembunyikan'}
      </button>
    </div>
  );
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [text]);
  return <span>{displayed}</span>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  /**
   * M4.2: diisi kalau server mendeteksi sinyal krisis pada pesan user.
   * Ditampilkan sebagai panel bantuan yang menonjol, terpisah dari balon chat —
   * bukan disisipkan ke dalam teks Livia, supaya nomor hotline tidak bisa
   * terlewat karena terlihat seperti dialog biasa.
   */
  const [crisis, setCrisis] = useState<CrisisInfo | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // M6.3: diktasi suara ke input (Web Speech API). Transkrip mengalir
  // live ke input; saat diktasi selesai, teks final tertinggal di input
  // dan bisa DIEDIT sebelum dikirim.
  const [micHint, setMicHint] = useState('');
  const {
    supported: micSupported,
    listening: micListening,
    transcript: micTranscript,
    start: startMic,
    stop: stopMic,
  } = useSpeechRecognition((code) => {
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      setMicHint('Izin mikrofon ditolak — nyalakan di pengaturan browser.');
    }
  });
  const dictationBaseRef = useRef('');

  useEffect(() => {
    // Saat diktasi aktif, input = teks yang sudah diketik + transkrip live.
    // Saat berhenti, isi terakhir dipertahankan (bukan dikosongkan).
    if (micListening) {
      setInput(dictationBaseRef.current + micTranscript);
    }
  }, [micListening, micTranscript]);

  useEffect(() => {
    if (!micHint) return;
    const t = setTimeout(() => setMicHint(''), 4000);
    return () => clearTimeout(t);
  }, [micHint]);

  const handleMicClick = () => {
    if (micListening) {
      stopMic();
      return;
    }
    // Diktasi MENAMBAHKAN ke teks yang sudah ada, bukan menimpa.
    dictationBaseRef.current = input;
    startMic();
  };

  // Load chat history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/chat/history');
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })));
        }
      } catch (e) {
        console.error('Failed to fetch history:', e);
      } finally {
        setHistoryLoaded(true);
      }
    };
    fetchHistory();
  }, []);

  // Auto scroll ke bawah
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    playSfx('click');
    const userMsg = input.trim();
    setInput('');
    // Panel krisis dari giliran sebelumnya disembunyikan saat user memulai
    // percakapan baru; kalau masih relevan, server akan mengirimnya lagi.
    setCrisis(null);setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg,
    }]);
    setLoading(true);

    // M2.1: balasan mengalir (SSE). Bubble Livia dibuat langsung lalu diisi
    // bertahap — user melihat kalimat terbentuk, bukan menunggu kosong.
    const liviaId = (Date.now() + 1).toString();

    try {
      setMessages(prev => [...prev, { id: liviaId, role: 'livia', content: '', isNew: true }]);

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error((data as { error?: string } | null)?.error || 'Koneksi terputus.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let gotAny = false;

      const handleEvent = (raw: string) => {
        if (!raw.startsWith('data: ')) return;
        let event: { type?: string; text?: string; reply?: string; message?: string };
        try {
          event = JSON.parse(raw.slice(6));
        } catch {
          return;
        }

        if (event.type === 'delta' && typeof event.text === 'string') {
          gotAny = true;
          setMessages(prev =>
            prev.map(m =>
              m.id === liviaId ? { ...m, content: m.content + event.text } : m
            )
          );
        } else if (event.type === 'done') {
          // Angka afeksi & ekspresi HANYA dari event done — tidak dipercaya
          // dari aliran mentah (validasi server sudah berjalan).
          setMessages(prev =>
            prev.map(m =>
              m.id === liviaId ? { ...m, content: event.reply || m.content } : m
            )
          );
          // M4.2: panel bantuan hanya dari `done`, sama seperti afeksi —
          // data keamanan tidak boleh berasal dari delta parsial.
          const doneEvent = event as { crisis?: CrisisInfo };
          if (doneEvent.crisis?.escalate) setCrisis(doneEvent.crisis);
          playSfx('pop');
        } else if (event.type === 'error') {
          setMessages(prev =>
            prev.map(m =>
              m.id === liviaId
                ? { ...m, content: `[Sistem] Error: ${event.message || 'Koneksi terputus.'}` }
                : m
            )
          );
          playSfx('error');
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) handleEvent(chunk.trim());
      }
      if (buffer.trim()) handleEvent(buffer.trim());

      if (!gotAny) {
        setMessages(prev =>
          prev.map(m =>
            m.id === liviaId && m.content === ''
              ? { ...m, content: `[Sistem] Error: Livia tidak sempat menjawab.` }
              : m
          )
        );
        playSfx('error');
      }
    } catch (e) {
      console.error(e);
      playSfx('error');
      const message = e instanceof Error ? e.message : 'Koneksi terputus.';
      setMessages(prev =>
        prev.map(m =>
          m.id === liviaId
            ? { ...m, content: `[Sistem] Error: ${message}` }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex justify-center w-full h-[100dvh] overflow-hidden bg-[#f4f2ee] relative font-sans">
      
      {/* Panel Chat Fullscreen */}
      <div className="w-full h-full flex flex-col relative z-10 bg-white">
        
        {/* Header Area */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex items-center gap-3 bg-white/95 backdrop-blur-xl z-20 shadow-sm">
          <Link href="/home" className="p-2 -ml-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff758c] to-[#ff9a9e] flex items-center justify-center text-white shadow-sm font-bold text-lg shrink-0">
            L
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-lg text-gray-800 leading-tight">Livia Einhart</h2>
            <span className="text-[11px] text-green-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
            </span>
          </div>
          <Link href="/call" className="p-2.5 bg-pink-100 text-pink-500 hover:bg-pink-500 hover:text-white rounded-full transition-all shadow-sm">
            <Phone size={20} />
          </Link>
        </div>

          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6 bg-[#f0f2f5]"
            style={{ scrollbarWidth: 'none' }}
          >
            {!historyLoaded && (
              <div className="flex items-center justify-center h-full">
                <span className="font-display font-medium text-sm text-pink-300 animate-pulse">
                  memuat pesan...
                </span>
              </div>
            )}

            {historyLoaded && messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="font-display italic text-lg text-center text-amber-600/70">
                  Belum ada pesan. Sapa Livia untuk mulai ngobrol!
                </p>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'livia' && (
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-[#ff758c] to-[#ff9a9e] shrink-0 mr-2 md:mr-3 mt-0.5 flex items-center justify-center shadow-sm z-10">
                    <span className="text-white text-[12px] md:text-[14px] font-bold">L</span>
                  </div>
                )}

                {msg.role === 'user' && (
                  <div className="flex flex-col justify-end items-end mr-2 mb-0.5">
                    <span className="text-[10px] text-gray-500 font-medium leading-tight">Read</span>
                    <span className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">Now</span>
                  </div>
                )}

                <div
                  className={`max-w-[75%] md:max-w-[60%] px-4 py-2.5 md:px-5 md:py-3 text-[16px] leading-relaxed shadow-sm relative break-words font-medium ${
                    msg.role === 'livia'
                      ? 'bg-white text-gray-800 rounded-[4px_18px_18px_18px]'
                      : 'bg-rose-500 text-white rounded-[18px_4px_18px_18px]'
                  }`}
                >
                  {msg.role === 'livia' && msg.isNew ? <TypewriterText text={msg.content} /> : msg.content}
                </div>

                {msg.role === 'livia' && (
                  <div className="flex flex-col justify-end items-start ml-2 mb-0.5">
                    <span className="text-[10px] text-gray-400 font-medium leading-tight">Now</span>
                  </div>
                )}
              </div>
            ))}

            {/* M4.2: panel bantuan krisis — di dalam area scroll supaya
                tetap terlihat setelah balasan Livia, dan bisa ditutup user. */}
            {crisis && <CrisisPanel info={crisis} onDismiss={() => setCrisis(null)} />}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start items-end gap-3 mt-4">
                <div className="w-8 h-8 rounded-full bg-pink-100 border border-white shrink-0 flex items-center justify-center">
                  <span className="text-pink-400 text-xs font-bold">L</span>
                </div>
                <div className="flex gap-1.5 px-5 py-4 bg-white border border-pink-100 rounded-[24px_24px_24px_4px] shadow-sm">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: '#ff758c',
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

            {/* Input area */}
          <div className="relative px-4 md:px-6 py-2 md:py-3 bg-slate-50 flex items-end gap-2 md:gap-3 z-20 border-t border-gray-200">
            {micHint && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-rose-500 whitespace-nowrap">
                {micHint}
              </span>
            )}
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // M6.3: Enter saat diktasi aktif tidak mengirim (transkrip
                  // masih bisa berubah) — hentikan diktasi dulu.
                  if (micListening) return;
                  handleSend();
                }
              }}
              placeholder={micListening ? 'Mendengarkan...' : 'Ketik balasan...'}
              rows={1}
              disabled={loading}
              className="flex-1 resize-none py-3 md:py-3.5 px-5 md:px-6 text-[16px] text-gray-800 focus:outline-none transition-all placeholder:text-gray-400 bg-white rounded-3xl border border-transparent focus:border-gray-300 shadow-sm min-h-[50px] max-h-[120px]"
            />
            {/* M6.3: diktasi suara — PTT (tap mulai, tap lagi/hening berhenti) */}
            {micSupported && (
              <button
                onClick={handleMicClick}
                title={micListening ? 'Hentikan diktasi' : 'Diktasi suara'}
                className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-sm relative ${
                  micListening
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {micListening && (
                  <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-40" />
                )}
                {micListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={loading || micListening || !input.trim()}
              className="shrink-0 w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-sm bg-rose-500 text-white disabled:bg-gray-200 disabled:text-gray-400 scale-100 disabled:scale-95"
            >
              <Send size={18} className={`${input.trim() && !loading && !micListening ? "ml-1" : ""}`} />
            </button>
          </div>
        </div>
    </div>
  );
}