'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  role: 'user' | 'livia';
  content: string;
  isNew?: boolean;
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

  const scrollRef = useRef<HTMLDivElement>(null);

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
          isNew: true,
        }]);
      }
    } catch (e) {
      console.error(e);
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
                  className="max-w-[75%] md:max-w-[60%] px-4 py-2.5 md:px-5 md:py-3 text-[14px] md:text-[15px] leading-relaxed shadow-sm relative break-words"
                  style={msg.role === 'livia' ? {
                    background: '#ffffff',
                    borderRadius: '4px 18px 18px 18px',
                    color: '#333333',
                    fontWeight: 500
                  } : {
                    background: '#ff758c',
                    borderRadius: '18px 4px 18px 18px',
                    color: '#ffffff',
                    fontWeight: 500
                  }}
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
          <div className="px-4 md:px-6 py-2 md:py-3 bg-[#f0f2f5] flex items-end gap-2 md:gap-3 z-20 border-t border-gray-200">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ketik balasan..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none py-3 md:py-3.5 px-5 md:px-6 text-[15px] focus:outline-none transition-all placeholder:text-gray-400 bg-white rounded-3xl border border-transparent focus:border-gray-300 shadow-sm"
              style={{
                color: '#333',
                maxHeight: '120px',
                minHeight: '50px',
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="shrink-0 w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-sm"
              style={{
                background: input.trim() && !loading ? '#ff758c' : '#e4e6eb',
                color: input.trim() && !loading ? '#ffffff' : '#b0b3b8',
                transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.95)'
              }}
            >
              <Send size={18} className={`${input.trim() && !loading ? "ml-1" : ""}`} />
            </button>
          </div>
        </div>
    </div>
  );
}