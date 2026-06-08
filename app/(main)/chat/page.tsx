'use client';

import { useState, useRef, useEffect } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import DialogBox from '@/components/livia/DialogBox';
import { LiviaExpression } from '@/lib/gemini';
import { Send } from 'lucide-react';

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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(0);

  useEffect(() => {
    const savedExpr = localStorage.getItem('liviaExpression') as LiviaExpression;
    if (savedExpr) setExpression(savedExpr);
    
    // In a real app we'd fetch chat history here
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentTop = e.currentTarget.scrollTop;
    const now = Date.now();
    
    if (currentTop < lastScrollTop.current - 500 && now - lastScrollTime.current < 2000) {
      setToast('Eh, kamu ngapain scroll terus? Ngobrol sama aku aja.');
      setExpression('angry');
      setTimeout(() => setToast(''), 5000);
    }
    
    lastScrollTop.current = currentTop;
    lastScrollTime.current = now;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      
      const data = await res.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'livia', content: data.reply }]);
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
    <div className="flex w-full h-screen bg-background overflow-hidden">
      {/* Left: Livia Sprite */}
      <div className="w-[40%] h-full flex flex-col items-center justify-center relative bg-surface border-r border-custom">
        <div className="absolute top-8 text-center w-full text-sm text-text-muted font-mono uppercase tracking-widest">
          {expression}
        </div>
        <div className="h-[60%] w-full flex justify-center items-end px-8">
          <LiviaSprite expression={expression} className="h-full w-auto" />
        </div>
        
        {toast && (
          <div className="absolute top-24 max-w-[80%]">
            <DialogBox text={toast} />
          </div>
        )}
      </div>

      {/* Right: Chat Interface */}
      <div className="w-[60%] h-full flex flex-col relative bg-[url('/bg-texture.png')] bg-cover">
        <div className="absolute inset-0 bg-background/90 z-0" />
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-8 space-y-6 z-10 custom-scrollbar"
        >
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-text-muted italic text-center">
              Mulai percakapan dengan Livia...
            </div>
          )}
          
          {messages.map(msg => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-4 rounded-lg shadow-md ${
                msg.role === 'user' 
                  ? 'bg-accent/20 border border-accent/30 text-text-primary rounded-tr-none' 
                  : 'bg-surface border border-custom text-text-primary rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex w-full justify-start">
               <div className="max-w-[70%] w-32">
                 <DialogBox text="..." speaker="" />
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-surface border-t border-custom z-10 flex items-center gap-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ketik sesuatu..."
            className="flex-1 bg-background border border-custom rounded-sm px-4 py-3 text-text-primary focus:outline-none focus:border-accent resize-none h-14"
            disabled={loading}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-14 h-14 flex items-center justify-center bg-accent text-black rounded-sm hover:bg-[#d6a578] disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
