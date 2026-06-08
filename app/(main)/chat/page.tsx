'use client';

import { useState, useRef, useEffect } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  role: 'user' | 'livia';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expression, setExpression] = useState<LiviaExpression>('normal');
  const [toast, setToast] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(0);
  const toastTimeout = useRef<NodeJS.Timeout>();

  // Load expression + chat history on mount
  useEffect(() => {
    const savedExpr = localStorage.getItem('liviaExpression') as LiviaExpression;
    if (savedExpr) setExpression(savedExpr);

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

  // Doom scroll detector
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentTop = e.currentTarget.scrollTop;
    const now = Date.now();

    if (
      currentTop < lastScrollTop.current - 500 &&
      now - lastScrollTime.current < 2000
    ) {
      showToast('Eh, kamu ngapain scroll terus? Ngobrol sama aku aja.');
      setExpression('angry');
    }

    lastScrollTop.current = currentTop;
    lastScrollTime.current = now;
  };

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(''), 4000);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg,
    }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'livia',
          content: data.reply,
        }]);
        setExpression(data.expression);
        localStorage.setItem('liviaExpression', data.expression);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-black relative">
      {/* Immersive Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 z-0"
        style={{ 
          backgroundImage: "url('/bg/chat_bg.png')",
          filter: "brightness(0.6) blur(3px) sepia(0.1)"
        }}
      />

      {/* Panel kiri — Livia */}
      <div className="w-[45%] h-full flex flex-col items-center justify-end relative z-10">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            background: expression === 'angry'
              ? 'radial-gradient(ellipse at 50% 100%, rgba(180,60,60,0.12) 0%, transparent 65%)'
              : expression === 'blushing'
              ? 'radial-gradient(ellipse at 50% 100%, rgba(220,120,120,0.1) 0%, transparent 65%)'
              : expression === 'happy'
              ? 'radial-gradient(ellipse at 50% 100%, rgba(196,149,106,0.1) 0%, transparent 65%)'
              : expression === 'clingy'
              ? 'radial-gradient(ellipse at 50% 100%, rgba(180,130,250,0.08) 0%, transparent 65%)'
              : 'radial-gradient(ellipse at 50% 100%, rgba(100,90,80,0.06) 0%, transparent 65%)'
          }}
        />

        {/* Back button */}
        <Link href="/home"
          className="absolute top-5 left-5 z-20 flex items-center gap-1.5 font-mono text-xs transition-colors"
          style={{ color: 'rgba(196,149,106,0.4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(196,149,106,0.8)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,149,106,0.4)')}
        >
          <ArrowLeft size={12} />
          kembali
        </Link>

        {/* Nama Livia */}
        <div className="absolute top-5 right-5 z-20 font-display text-sm italic"
          style={{ color: 'rgba(196,149,106,0.5)' }}
        >
          Livia
        </div>

        {/* Toast doom scroll */}
        {toast && (
          <div
            className="absolute top-16 left-4 right-4 z-30 px-4 py-3 rounded-lg text-sm font-sans animate-[fadeIn_0.3s_ease]"
            style={{
              background: 'rgba(26,21,16,0.95)',
              border: '1px solid rgba(196,149,106,0.3)',
              color: '#e8e0d0',
            }}
          >
            <span style={{ color: '#c4956a', fontSize: '11px', fontFamily: 'monospace', display: 'block', marginBottom: '2px' }}>
              Livia
            </span>
            {toast}
          </div>
        )}

        {/* Sprite */}
        <div className="relative z-10 w-full flex justify-center items-end h-[90%]">
          <LiviaSprite
            expression={expression}
            className="h-full w-auto max-w-[90%] object-contain object-bottom drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
          />
        </div>
      </div>

      {/* Panel kanan — Chat */}
      <div className="w-[55%] h-full flex flex-col relative z-10 py-8 pr-8">
        {/* Glassmorphism Chat Container */}
        <div className="w-full h-full flex flex-col backdrop-blur-2xl bg-black/30 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">

        {/* Messages area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(196,149,106,0.2) transparent' }}
        >
          {!historyLoaded && (
            <div className="flex items-center justify-center h-full">
              <span className="font-mono text-xs animate-pulse"
                style={{ color: 'rgba(196,149,106,0.4)' }}
              >
                memuat riwayat...
              </span>
            </div>
          )}

          {historyLoaded && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="font-display italic text-lg text-center"
                style={{ color: 'rgba(201,195,184,0.3)' }}
              >
                Mulai percakapan dengan Livia...
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'livia' && (
                <span className="font-mono text-xs mr-2 mt-3 shrink-0"
                  style={{ color: 'rgba(196,149,106,0.5)' }}
                >
                  L
                </span>
              )}
              <div
                className="max-w-[72%] px-4 py-3 text-sm leading-relaxed"
                style={msg.role === 'livia' ? {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(196,149,106,0.15)',
                  borderRadius: '0 12px 12px 12px',
                  color: '#e8e0d0',
                } : {
                  background: 'rgba(196,149,106,0.1)',
                  border: '1px solid rgba(196,149,106,0.2)',
                  borderRadius: '12px 0 12px 12px',
                  color: '#c9c3b8',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start items-center gap-2">
              <span className="font-mono text-xs" style={{ color: 'rgba(196,149,106,0.5)' }}>L</span>
              <div className="flex gap-1 px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(196,149,106,0.15)',
                  borderRadius: '0 12px 12px 12px',
                }}
              >
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{
                      background: 'rgba(196,149,106,0.5)',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          className="px-6 py-4 flex items-end gap-3"
          style={{ borderTop: '1px solid rgba(196,149,106,0.1)' }}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ketik sesuatu..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent py-3 px-4 text-sm focus:outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(196,149,106,0.15)',
              borderRadius: '8px',
              color: '#e8e0d0',
              maxHeight: '120px',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(196,149,106,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(196,149,106,0.15)')}
          />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl transition-all"
              style={{
                background: input.trim() && !loading ? 'linear-gradient(135deg, #d4a373, #c4956a)' : 'rgba(196,149,106,0.15)',
                color: input.trim() && !loading ? '#0a0908' : 'rgba(196,149,106,0.3)',
                boxShadow: input.trim() && !loading ? '0 4px 15px rgba(196,149,106,0.3)' : 'none'
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}