'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Send,
  ArrowLeft,
  Phone,
  LifeBuoy,
  ExternalLink,
  Mic,
  MicOff,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from 'lucide-react';
import { playSfx } from '@/lib/sfx';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';

interface ChatMessage {
  id: string;
  role: 'user' | 'livia';
  content: string;
  isNew?: boolean;
  dbId?: string;
  timestamp?: string;
}

interface CrisisInfo {
  message: string;
  resources: Array<{ name: string; contact: string; note: string }>;
  directoryUrl: string;
  escalate: boolean;
}

function CrisisPanel({ info, onDismiss }: { info: CrisisInfo; onDismiss: () => void }) {
  const { language } = useLanguage();
  const isUrl = (value: string) => /^https?:\/\//.test(value);

  return (
    <div className="mx-2 my-4 rounded-[2rem] border border-emerald-200 bg-emerald-50/90 backdrop-blur-md p-5 flex flex-col gap-3 shadow-[0_8px_24px_rgba(16,185,129,0.12)]">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
          <LifeBuoy className="text-white w-5 h-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-display font-black text-base text-emerald-900">
            {language === 'en' ? 'You deserve real support' : 'Kamu berhak dapat bantuan nyata'}
          </span>
          <span className="text-xs text-emerald-700 font-medium leading-relaxed">
            {language === 'en'
              ? 'Livia is an AI and cannot help with this. These services can.'
              : 'Livia adalah AI dan tidak bisa menangani ini. Layanan resmi berikut siap membantumu.'}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2 mt-1">
        {info.resources.map((resource) => (
          <li
            key={resource.name}
            className="bg-white/95 backdrop-blur-xs rounded-2xl p-3.5 border border-emerald-100 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-900">{resource.name}</span>
              {isUrl(resource.contact) ? (
                <a
                  href={resource.contact}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-700 underline inline-flex items-center gap-1 hover:text-emerald-900"
                >
                  {language === 'en' ? 'Open' : 'Buka'} <ExternalLink size={11} />
                </a>
              ) : (
                <a
                  href={`tel:${resource.contact.replace(/[^\d+]/g, '')}`}
                  className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200/60"
                >
                  {resource.contact}
                </a>
              )}
            </div>
            <p className="text-[11px] text-emerald-700/80 font-medium mt-1 leading-snug">
              {resource.note}
            </p>
          </li>
        ))}
      </ul>

      <button
        onClick={onDismiss}
        className="text-[11px] font-mono font-bold text-emerald-700 hover:text-emerald-900 self-end transition-colors pt-1 focus-visible:outline-none"
      >
        {language === 'en' ? '[ Hide ]' : '[ Sembunyikan ]'}
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

function FeedbackThumbs({
  current,
  pending,
  onRate,
}: {
  current: 'up' | 'down' | undefined;
  pending: boolean;
  onRate: (rating: 'up' | 'down') => void;
}) {
  const btn = (active: boolean, activeColor: string) =>
    `w-6 h-6 rounded-full flex items-center justify-center transition-all ${
      active ? activeColor : 'text-[#7a7268]/60 hover:text-[#5c4d47] hover:bg-pink-50'
    } ${pending ? 'opacity-50 pointer-events-none' : ''}`;

  return (
    <div className="flex items-center gap-1 mt-1">
      <button
        type="button"
        aria-label="Balasan baik"
        title="Jawaban baik"
        onClick={() => onRate('up')}
        className={btn(current === 'up', 'bg-emerald-100 text-emerald-700')}
      >
        <ThumbsUp size={11} />
      </button>
      <button
        type="button"
        aria-label="Balasan buruk"
        title="Jawaban buruk"
        onClick={() => onRate('down')}
        className={btn(current === 'down', 'bg-rose-100 text-rose-600')}
      >
        <ThumbsDown size={11} />
      </button>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [crisis, setCrisis] = useState<CrisisInfo | null>(null);

  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [pendingDbId, setPendingDbId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [micHint, setMicHint] = useState('');
  const {
    supported: micSupported,
    listening: micListening,
    transcript: micTranscript,
    start: startMic,
    stop: stopMic,
  } = useSpeechRecognition((code) => {
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      setMicHint('Izin mikrofon ditolak — aktifkan di setelan browser.');
    }
  });
  const dictationBaseRef = useRef('');

  useEffect(() => {
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
    dictationBaseRef.current = input;
    startMic();
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/chat/history');
        const data = await res.json();
        if (data.messages) {
          setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              dbId: m.id,
              timestamp: m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : undefined,
            }))
          );
        }
        if (data.feedback && typeof data.feedback === 'object') {
          setFeedback(data.feedback);
        }
      } catch (e) {
        console.error('Failed to fetch history:', e);
      } finally {
        setHistoryLoaded(true);
      }
    };
    fetchHistory();
  }, []);

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
    setCrisis(null);

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content: userMsg,
        timestamp: nowTime,
      },
    ]);
    setLoading(true);

    const liviaId = (Date.now() + 1).toString();

    try {
      setMessages((prev) => [
        ...prev,
        { id: liviaId, role: 'livia', content: '', isNew: true, timestamp: nowTime },
      ]);

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
        let event: {
          type?: string;
          text?: string;
          reply?: string;
          message?: string;
          messageId?: string;
        };
        try {
          event = JSON.parse(raw.slice(6));
        } catch {
          return;
        }

        if (event.type === 'delta' && typeof event.text === 'string') {
          gotAny = true;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === liviaId ? { ...m, content: m.content + event.text } : m
            )
          );
        } else if (event.type === 'done') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === liviaId
                ? {
                    ...m,
                    content: event.reply || m.content,
                    dbId: event.messageId || m.dbId,
                  }
                : m
            )
          );
          const doneEvent = event as { crisis?: CrisisInfo };
          if (doneEvent.crisis?.escalate) setCrisis(doneEvent.crisis);
          playSfx('pop');
        } else if (event.type === 'error') {
          setMessages((prev) =>
            prev.map((m) =>
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
        setMessages((prev) =>
          prev.map((m) =>
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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === liviaId
            ? { ...m, content: `[Sistem] Error: ${message}` }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (dbId: string, rating: 'up' | 'down') => {
    if (pendingDbId || feedback[dbId] === rating) return;

    const previous = feedback;
    setFeedback((f) => ({ ...f, [dbId]: rating }));
    setPendingDbId(dbId);
    playSfx('click');

    try {
      const res = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: dbId, rating }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error('Failed to send feedback:', e);
      setFeedback(previous);
      playSfx('error');
    } finally {
      setPendingDbId(null);
    }
  };

  return (
    <div className="relative flex flex-col w-full h-[100dvh] overflow-hidden bg-[#fdfbf7] font-sans selection:bg-[#ff758c]/25 selection:text-[#5c4d47]">
      {/* ── Ambient Backdrop ────────────────────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-multiply pointer-events-none"
        style={{ backgroundImage: "url('/bg/bedroom.webp')" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-[#fdfbf7]/90 pointer-events-none"
      />

      {/* ── Header Area ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 px-4 md:px-8 py-3.5 border-b border-pink-100/80 bg-white/90 backdrop-blur-2xl shadow-[0_4px_24px_rgba(255,117,140,0.08)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="p-2 -ml-1 text-[#5c4d47]/70 hover:text-[#ff758c] hover:bg-pink-50 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            title="Kembali ke Kamar Kos"
          >
            <ArrowLeft size={20} />
          </Link>

          {/* Livia Chibi Avatar */}
          <div className="relative h-11 w-11 rounded-full border-2 border-white shadow-[0_4px_14px_rgba(255,117,140,0.25)] overflow-hidden bg-gradient-to-tr from-[#ff758c] to-[#ff9a9e] shrink-0">
            <Image
              src="/livia/chibi-livia.webp"
              alt="Livia"
              width={48}
              height={48}
              className="h-full w-full object-cover scale-110"
              priority
            />
          </div>

          <div className="flex flex-col">
            <h1 className="font-display font-black text-xl text-[#5c4d47] leading-none tracking-tight">
              Livia Einhart
            </h1>
            <span className="font-mono text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Kamar Kos // Online
            </span>
          </div>
        </div>

        {/* Quick Voice Call Shortcut */}
        <Link
          href="/call"
          className="p-2.5 rounded-full border border-pink-200 bg-pink-50/80 text-pink-600 hover:bg-gradient-to-r hover:from-[#ff758c] hover:to-[#ff0844] hover:text-white hover:border-transparent shadow-xs transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          title="Mulai Panggilan Telepon dengan Livia"
        >
          <Phone size={18} />
        </Link>
      </header>

      {/* ── Messages Stream ─────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5 pb-32 md:pb-36"
        style={{ scrollbarWidth: 'thin' }}
      >
        {!historyLoaded && (
          <div className="flex items-center justify-center h-full">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white/80 px-4 py-2 font-mono text-xs font-bold text-pink-600 shadow-xs backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
              Memuat percakapan kos...
            </div>
          </div>
        )}

        {historyLoaded && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto p-6 rounded-[2.5rem] bg-white/70 border border-pink-100/80 backdrop-blur-md shadow-[0_8px_30px_rgba(255,117,140,0.06)]">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center mb-4 text-pink-600 shadow-inner">
              <Sparkles size={28} />
            </div>
            <h2 className="font-display font-black text-2xl text-[#5c4d47] mb-2">
              Kamar Kos Tenang...
            </h2>
            <p className="text-sm font-medium text-[#5c4d47]/80 leading-relaxed">
              Livia sedang berada di meja belajarnya. Kirim pesan pertama untuk menyapa atau ceritakan
              harimu padanya!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full items-end ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* Livia Chibi Mini Avatar beside her messages */}
            {msg.role === 'livia' && (
              <div className="relative h-8 w-8 rounded-full border border-pink-200 bg-gradient-to-tr from-[#ff758c] to-[#ff9a9e] overflow-hidden shrink-0 mr-2.5 mb-1 shadow-2xs">
                <Image
                  src="/livia/chibi-livia.webp"
                  alt="Livia"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover scale-110"
                />
              </div>
            )}

            {/* User message timestamp on left */}
            {msg.role === 'user' && (
              <div className="flex flex-col justify-end items-end mr-2 mb-1 shrink-0 font-mono text-[9px] text-[#7a7268]/60">
                <span>{msg.timestamp || 'Read'}</span>
              </div>
            )}

            {/* Speech Bubble */}
            <div
              className={`max-w-[82%] sm:max-w-[70%] md:max-w-[62%] px-4 py-3 sm:px-5 sm:py-3.5 text-[15px] sm:text-[16px] leading-relaxed shadow-sm break-words font-medium transition-all ${
                msg.role === 'livia'
                  ? 'bg-white/95 backdrop-blur-md text-[#5c4d47] rounded-[4px_1.5rem_1.5rem_1.5rem] border border-pink-100/90 shadow-[0_4px_20px_rgba(255,117,140,0.06)]'
                  : 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white rounded-[1.5rem_4px_1.5rem_1.5rem] shadow-[0_6px_22px_rgba(255,117,140,0.32)] selection:bg-white/30 selection:text-white'
              }`}
            >
              {msg.role === 'livia' && msg.isNew ? (
                <TypewriterText text={msg.content} />
              ) : (
                msg.content
              )}
            </div>

            {/* Livia message footer on right */}
            {msg.role === 'livia' && (
              <div className="flex flex-col justify-end items-start ml-2 mb-1 shrink-0 font-mono text-[9px] text-[#7a7268]/60">
                <span>{msg.timestamp || 'Now'}</span>
                {msg.dbId && (
                  <FeedbackThumbs
                    current={feedback[msg.dbId]}
                    pending={pendingDbId === msg.dbId}
                    onRate={(rating) => handleRate(msg.dbId!, rating)}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Safety Crisis Panel */}
        {crisis && <CrisisPanel info={crisis} onDismiss={() => setCrisis(null)} />}

        {/* Streaming / Typing indicator */}
        {loading && (
          <div className="flex justify-start items-end gap-2.5">
            <div className="relative h-8 w-8 rounded-full border border-pink-200 bg-gradient-to-tr from-[#ff758c] to-[#ff9a9e] overflow-hidden shrink-0 shadow-2xs">
              <Image
                src="/livia/chibi-livia.webp"
                alt="Livia"
                width={32}
                height={32}
                className="h-full w-full object-cover scale-110"
              />
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white/95 border border-pink-100 rounded-[4px_1.5rem_1.5rem_1.5rem] shadow-[0_4px_16px_rgba(255,117,140,0.06)]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#ff758c] animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Floating Warm Glass Input Dock ───────────────────────────── */}
      <div className="fixed bottom-4 left-4 right-4 md:left-8 md:right-8 max-w-4xl mx-auto z-40">
        {micHint && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full border border-pink-200 bg-white/95 px-3 py-1 font-mono text-[10px] font-bold text-pink-600 shadow-md backdrop-blur-md">
            {micHint}
          </div>
        )}

        <div className="bg-white/92 backdrop-blur-2xl border border-white/90 rounded-[2.25rem] p-2 sm:p-2.5 shadow-[0_12px_40px_rgba(255,117,140,0.16)] flex items-end gap-2 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (micListening) return;
                handleSend();
              }
            }}
            placeholder={
              micListening ? 'Mendengarkan ucapanmu...' : 'Ketik obrolan dengan Livia...'
            }
            rows={1}
            disabled={loading}
            className="flex-1 resize-none py-3 px-4 text-[15px] sm:text-[16px] text-[#5c4d47] font-medium placeholder:text-[#7a7268]/60 bg-transparent focus:outline-none min-h-[46px] max-h-[120px]"
          />

          {/* Voice Dictation (Mic PTT) */}
          {micSupported && (
            <button
              onClick={handleMicClick}
              title={micListening ? 'Hentikan diktasi suara' : 'Dikte suara (Push-to-Talk)'}
              className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                micListening
                  ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white shadow-md animate-pulse'
                  : 'bg-pink-50 text-pink-600 border border-pink-100 hover:bg-pink-100/80 active:scale-95'
              }`}
            >
              {micListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={loading || micListening || !input.trim()}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all shadow-[0_4px_16px_rgba(255,117,140,0.3)] bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            title="Kirim Pesan"
          >
            <Send size={18} className={input.trim() && !loading && !micListening ? 'ml-0.5' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}
