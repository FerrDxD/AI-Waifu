'use client';

import { useState, useRef, useEffect } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';
import { Send, ArrowLeft, Heart } from 'lucide-react';
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
    <div className="flex flex-col md:flex-row w-full h-screen overflow-hidden bg-[#fdfbf7]">
      {/* Panel kiri — Livia */}
      <div className="w-full h-[40%] md:h-full md:w-[35%] shrink-0 flex flex-col items-center justify-end relative z-10 bg-[#fdfbf7] shadow-[0_5px_15px_rgba(0,0,0,0.03)] md:shadow-[5px_0_15px_rgba(0,0,0,0.03)] border-b md:border-b-0 md:border-r border-pink-100">
        {/* Immersive Background just for Livia */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 z-0 opacity-40 mix-blend-multiply blur-[1px]"
          style={{ backgroundImage: "url('/bg/bedroom.png')" }}
        />

        {/* Sweet Background glow */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-1000 mix-blend-screen z-0"
          style={{
            background: expression === 'angry'
              ? 'radial-gradient(ellipse at 50% 100%, rgba(255,100,100,0.3) 0%, transparent 70%)'
              : expression === 'blushing'
              ? 'radial-gradient(ellipse at 50% 100%, rgba(255,150,180,0.4) 0%, transparent 70%)'
              : expression === 'happy'
              ? 'radial-gradient(ellipse at 50% 100%, rgba(255,220,150,0.4) 0%, transparent 70%)'
              : expression === 'clingy'
              ? 'radial-gradient(ellipse at 50% 100%, rgba(200,150,255,0.3) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.2) 0%, transparent 70%)'
          }}
        />

        {/* Back button & Name Label */}
        <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 flex items-center justify-between z-20">
          <Link href="/home"
            className="flex items-center gap-1.5 md:gap-2 font-display font-bold text-[10px] md:text-sm bg-white/70 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full text-pink-500 shadow-sm hover:shadow-md hover:text-[#ff758c] transition-all"
          >
            <ArrowLeft size={14} className="md:w-4 md:h-4" />
            Kembali
          </Link>
          <div className="bg-white/80 backdrop-blur-md px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-sm border border-pink-100">
            <span className="font-display font-bold text-xs md:text-base text-[#ff758c] tracking-wide">L I V I A</span>
          </div>
        </div>

        {/* Toast doom scroll */}
        {toast && (
          <div
            className="absolute top-20 left-8 right-8 z-30 px-6 py-4 rounded-2xl text-sm font-sans animate-[bounceIn_0.4s_ease]"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: '2px solid #fecfef',
              boxShadow: '0 10px 25px rgba(255,154,158,0.3)',
              color: '#5c4d47',
            }}
          >
            <span style={{ color: '#ff758c', fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
              Livia
            </span>
            {toast}
          </div>
        )}

        {/* Sprite */}
        <div className="relative z-10 w-full flex justify-center items-end h-[90%]">
          <LiviaSprite
            expression={expression}
            className="h-full w-auto max-w-[90%] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(255,154,158,0.4)]"
          />
        </div>
      </div>

      {/* Panel kanan — Chat */}
      <div className="flex-1 md:w-[65%] h-[60%] md:h-full flex flex-col relative z-10 bg-white">
        <div className="w-full h-full flex flex-col">
          
          {/* Header Area */}
          <div className="px-4 md:px-8 py-3 md:py-4 border-b border-pink-50 flex items-center gap-3 bg-white/90 backdrop-blur-md z-20 shadow-sm">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-[#ff758c] to-[#ff9a9e] flex items-center justify-center text-white shadow-sm font-bold text-sm md:text-base">
              L
            </div>
            <div>
              <h2 className="font-display font-bold text-base md:text-lg text-[#ff758c] leading-tight">Livia Einhart</h2>
              <span className="text-[10px] md:text-xs text-amber-500 font-medium italic">Sedang online</span>
            </div>
          </div>

          {/* Messages area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-8 py-6 space-y-5"
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
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-pink-100 border border-white shrink-0 mr-2 md:mr-3 mt-auto mb-1 flex items-center justify-center">
                    <span className="text-pink-400 text-[10px] md:text-xs font-bold">L</span>
                  </div>
                )}
                <div
                  className="max-w-[85%] md:max-w-[70%] px-4 py-2.5 md:px-5 md:py-3.5 text-sm md:text-[15px] leading-relaxed shadow-sm"
                  style={msg.role === 'livia' ? {
                    background: '#fffdfa',
                    border: '1px solid #f9ecec',
                    borderLeft: '4px solid #ff758c',
                    borderRadius: '4px 20px 20px 20px',
                    color: '#5c4d47',
                    fontWeight: 500
                  } : {
                    background: 'linear-gradient(135deg, #ffb199 0%, #ff0844 100%)',
                    borderRadius: '20px 4px 20px 20px',
                    color: '#ffffff',
                    fontWeight: 500,
                    boxShadow: '0 4px 10px rgba(255,8,68,0.2)'
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

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
          <div className="px-4 md:px-8 py-4 md:py-6 bg-white border-t border-pink-50 flex items-end gap-2 md:gap-3 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ketik balasanmu..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none py-2.5 md:py-3.5 px-4 md:px-6 text-sm md:text-[15px] focus:outline-none transition-all placeholder:text-gray-300"
              style={{
                background: '#fcfcfc',
                border: '2px solid #f1f1f1',
                borderRadius: '20px',
                color: '#5c4d47',
                maxHeight: '100px',
                fontWeight: 500,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#ff758c')}
              onBlur={e => (e.currentTarget.style.borderColor = '#f1f1f1')}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="shrink-0 w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all shadow-md"
              style={{
                background: input.trim() && !loading ? 'linear-gradient(135deg, #ff0844, #ffb199)' : '#f5f5f5',
                color: input.trim() && !loading ? '#ffffff' : '#cccccc',
                transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.95)'
              }}
            >
              <Send size={16} className={`md:w-5 md:h-5 ${input.trim() && !loading ? "ml-1" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}