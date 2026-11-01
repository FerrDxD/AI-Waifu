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

function CrisisPanel({
  info,
  onDismiss,
}: {
  info: CrisisInfo;
  onDismiss: () => void;
}) {
  const { language } = useLanguage();
  const isUrl = (value: string) => /^https?:\/\//.test(value);

  return (
    <div className="mx-2 my-3 rounded-2xl border border-emerald-300 bg-white p-4 flex flex-col gap-3 shadow-md">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
          <LifeBuoy className="text-white w-4 h-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-sm text-emerald-950">
            {language === 'en'
              ? 'You deserve real support'
              : 'Kamu berhak dapat bantuan nyata'}
          </span>
          <span className="text-xs text-emerald-800 leading-relaxed">
            {language === 'en'
              ? 'Livia is an AI companion and cannot handle this. These official hotlines can.'
              : 'Livia adalah AI dan tidak bisa menangani ini. Layanan resmi berikut siap membantumu.'}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2 mt-1">
        {info.resources.map((resource) => (
          <li
            key={resource.name}
            className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100 flex items-center justify-between gap-2 flex-wrap"
          >
            <div>
              <span className="text-xs font-bold text-emerald-900 block">
                {resource.name}
              </span>
              <p className="text-[11px] text-emerald-700 leading-tight mt-0.5">
                {resource.note}
              </p>
            </div>
            {isUrl(resource.contact) ? (
              <a
                href={resource.contact}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-700 underline inline-flex items-center gap-1 hover:text-emerald-950"
              >
                {language === 'en' ? 'Open' : 'Buka'}{' '}
                <ExternalLink size={11} />
              </a>
            ) : (
              <a
                href={`tel:${resource.contact.replace(/[^\d+]/g, '')}`}
                className="text-xs font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-full border border-emerald-200"
              >
                {resource.contact}
              </a>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onDismiss}
        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 self-end transition-colors pt-1"
      >
        {language === 'en' ? '[ Hide Notice ]' : '[ Tutup Informasi ]'}
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
    }, 15);
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
    `w-5 h-5 rounded-full flex items-center justify-center transition-all ${
      active
        ? activeColor
        : 'text-[#8c7a70] hover:text-[#5c4d47] hover:bg-pink-50'
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
        <ThumbsUp size={10} />
      </button>
      <button
        type="button"
        aria-label="Balasan buruk"
        title="Jawaban buruk"
        onClick={() => onRate('down')}
        className={btn(current === 'down', 'bg-rose-100 text-rose-600')}
      >
        <ThumbsDown size={10} />
      </button>
    </div>
  );
}

export default function ChatPage() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [crisis, setCrisis] = useState<CrisisInfo | null>(null);

  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [pendingDbId, setPendingDbId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [micHint, setMicHint] = useState('');
  const {
    supported: micSupported,
    listening: micListening,
    transcript: micTranscript,
    start: startMic,
    stop: stopMic,
  } = useSpeechRecognition((code) => {
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      setMicHint(
        language === 'en'
          ? 'Microphone permission denied.'
          : 'Izin mikrofon ditolak di browser.'
      );
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
                ? new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
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

    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

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
        {
          id: liviaId,
          role: 'livia',
          content: '',
          isNew: true,
          timestamp: nowTime,
        },
      ]);

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(
          (data as { error?: string } | null)?.error || 'Koneksi terputus.'
        );
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
                ? {
                    ...m,
                    content: `[Sistem] Error: ${
                      event.message || 'Koneksi terputus.'
                    }`,
                  }
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
              ? {
                  ...m,
                  content: `[Sistem] Error: Livia tidak sempat menjawab.`,
                }
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
    <div
      style={{ backgroundColor: '#f4efe8' }}
      className="relative flex flex-col w-full h-[100dvh] overflow-hidden bg-[#f4efe8] font-sans select-none"
    >
      {/* ── Teman Kost Messenger Header ──────────────────────────────── */}
      <header className="sticky top-0 z-30 px-3 sm:px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-[0_2px_12px_rgba(255,117,140,0.06)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <Link
            href="/home"
            className="p-1.5 -ml-1 text-[#5c4d47] hover:text-[#ff758c] hover:bg-pink-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            title="Kembali"
          >
            <ArrowLeft size={20} />
          </Link>

          {/* Contact Avatar */}
          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-pink-100 border border-pink-200/80 shadow-[0_2px_8px_rgba(255,117,140,0.15)] shrink-0">
            <Image
              src="/livia/chibi-livia.webp"
              alt="Livia"
              width={36}
              height={36}
              className="h-full w-full object-cover scale-105"
              priority
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm sm:text-base text-[#5c4d47] leading-none">
                Livia Einhart
              </h1>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Call Action Icon */}
        <Link
          href="/call"
          className="p-2 text-[#5c4d47] hover:text-[#ff758c] hover:bg-pink-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          title="Telepon Livia"
        >
          <Phone size={19} />
        </Link>
      </header>

      {/* ── Warm Messenger Timeline ──────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{ backgroundColor: '#f4efe8', scrollbarWidth: 'thin' }}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3.5 bg-[#f4efe8]"
      >
        {/* Date Stamp Pill */}
        <div className="flex justify-center my-1">
          <span className="px-3 py-1 rounded-full bg-[#e6dcd3] text-[#5c4d47] text-[11px] font-mono font-bold border border-[#ded2c7] shadow-2xs select-none">
            {language === 'en' ? 'Today' : 'Hari Ini'}
          </span>
        </div>

        {!historyLoaded && (
          <div className="flex items-center justify-center py-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-pink-100 px-4 py-1.5 text-xs font-bold text-[#5c4d47] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#ff758c] animate-pulse" />
              {language === 'en'
                ? 'Loading messages...'
                : 'Memuat percakapan kos...'}
            </div>
          </div>
        )}

        {historyLoaded && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-xs mx-auto text-[#5c4d47]">
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-pink-100 border-2 border-pink-200/80 mb-3 shadow-[0_4px_14px_rgba(255,117,140,0.2)]">
              <Image
                src="/livia/chibi-livia.webp"
                alt="Livia"
                width={64}
                height={64}
                className="h-full w-full object-cover scale-105"
              />
            </div>
            <p className="text-xs sm:text-sm font-medium leading-relaxed bg-white/90 border border-pink-100/80 px-4 py-2 rounded-2xl shadow-xs">
              {language === 'en'
                ? 'Start a chat with Livia!'
                : 'Mulai obrolan dengan Livia!'}
            </p>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* LIVIA (INCOMING MESSAGE - WARM KOS WHITE BUBBLE) */}
            {msg.role === 'livia' && (
              <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[75%]">
                {/* Livia Avatar */}
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-white border border-pink-200 shrink-0 mt-0.5 shadow-2xs">
                  <Image
                    src="/livia/chibi-livia.webp"
                    alt="Livia"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover scale-105"
                  />
                </div>

                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[11px] font-bold text-[#8c7a70] mb-1 pl-1 select-none">
                    Livia
                  </span>

                  <div className="flex items-end gap-1.5 flex-wrap sm:flex-nowrap">
                    {/* White Chat Bubble */}
                    <div className="bg-white text-[#5c4d47] px-4 py-2.5 rounded-2xl rounded-tl-xs text-[15px] leading-relaxed border border-pink-100/80 shadow-[0_2px_10px_rgba(255,117,140,0.04)] break-words font-normal">
                      {msg.isNew ? (
                        <TypewriterText text={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>

                    {/* Metadata: Time + Feedback */}
                    <div className="flex flex-col items-start pb-0.5 select-none shrink-0">
                      <span className="font-mono text-[10px] text-[#8c7a70]">
                        {msg.timestamp || 'Now'}
                      </span>
                      {msg.dbId && (
                        <FeedbackThumbs
                          current={feedback[msg.dbId]}
                          pending={pendingDbId === msg.dbId}
                          onRate={(rating) => handleRate(msg.dbId!, rating)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USER (OUTGOING MESSAGE - TEMAN KOST SIGNATURE LAMP-PINK BUBBLE) */}
            {msg.role === 'user' && (
              <div className="flex items-end justify-end gap-1.5 max-w-[85%] sm:max-w-[75%]">
                {/* LINE Signature: Stacked "Dibaca" / Read receipt + Time */}
                <div className="flex flex-col items-end pb-0.5 select-none shrink-0 font-mono text-[10px] text-[#8c7a70] leading-tight">
                  <span className="text-[9px] font-bold text-[#ff758c]">
                    {language === 'en' ? 'Read' : 'Dibaca'}
                  </span>
                  <span>{msg.timestamp || 'Now'}</span>
                </div>

                {/* Teman Kost Lamp-Pink Signature Bubble */}
                <div className="bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white px-4 py-2.5 rounded-2xl rounded-tr-xs text-[15px] leading-relaxed shadow-[0_4px_16px_rgba(255,117,140,0.25)] break-words font-normal">
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Safety Crisis Notice Panel */}
        {crisis && (
          <CrisisPanel info={crisis} onDismiss={() => setCrisis(null)} />
        )}

        {/* Streaming / Typing Indicator */}
        {loading && (
          <div className="flex items-start gap-2 max-w-[80%]">
            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-white border border-pink-200 shrink-0 mt-0.5 shadow-2xs">
              <Image
                src="/livia/chibi-livia.webp"
                alt="Livia"
                width={32}
                height={32}
                className="h-full w-full object-cover scale-105"
              />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-bold text-[#8c7a70] mb-1 pl-1 select-none">
                Livia
              </span>
              <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-xs border border-pink-100 shadow-xs flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#ff758c] animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
                <span className="text-xs text-[#8c7a70] font-medium ml-1">
                  {language === 'en' ? 'Typing...' : 'Mengetik...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Docked Bottom Input Bar ──────────────────────────────────── */}
      <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-pink-100 px-3 py-2 sm:px-4 sm:py-2.5 flex items-end gap-2 shrink-0">
        {micHint && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-full border border-pink-200 bg-white px-3 py-1 font-mono text-[10px] font-bold text-[#ff758c] shadow-md">
            {micHint}
          </div>
        )}

        {/* Mic / Voice Dictation Button */}
        {micSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            title={
              micListening
                ? 'Hentikan diktasi suara'
                : 'Dikte suara (Push-to-Talk)'
            }
            aria-label={
              micListening
                ? 'Hentikan diktasi suara'
                : 'Dikte suara (Push-to-Talk)'
            }
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
              micListening
                ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white animate-pulse shadow-md'
                : 'text-[#8c7a70] hover:text-[#ff758c] hover:bg-pink-50'
            }`}
          >
            {micListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}

        {/* Text Input Box */}
        <textarea
          ref={textareaRef}
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
            micListening
              ? language === 'en'
                ? 'Listening to your voice...'
                : 'Mendengarkan ucapanmu...'
              : language === 'en'
              ? 'Type a message...'
              : 'Ketik pesan...'
          }
          rows={1}
          disabled={loading}
          className="flex-1 resize-none py-2 px-3.5 text-[15px] text-[#5c4d47] font-normal placeholder:text-[#8c7a70]/70 bg-[#fbf8f4] rounded-2xl border border-pink-100/70 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-[#ff758c]/40 focus:border-[#ff758c] min-h-[38px] max-h-24 transition-all leading-normal"
        />

        {/* Teman Kost Pink Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || micListening || !input.trim()}
          title="Kirim"
          aria-label="Kirim Pesan"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-r from-[#ff758c] to-[#ff0844] hover:opacity-95 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95 shadow-[0_4px_14px_rgba(255,117,140,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <Send
            size={16}
            className={input.trim() && !loading && !micListening ? 'ml-0.5' : ''}
          />
        </button>
      </footer>
    </div>
  );
}
