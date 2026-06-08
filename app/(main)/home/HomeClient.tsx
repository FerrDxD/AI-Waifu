'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, BookOpen } from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import AffectionBar from '@/components/livia/AffectionBar';
import { LiviaExpression } from '@/lib/gemini';
import { getAffectionLevel } from '@/lib/livia/affection';

interface HomeClientProps {
  initialAffection: number;
  userName: string;
}

function getGreeting(affection: number): { text: string; expression: LiviaExpression } {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return affection < 40
      ? { text: 'Kamu lagi ngapain pagi-pagi?', expression: 'normal' }
      : { text: 'Pagi. Udah sarapan belum?', expression: 'happy' };
  } else if (hour >= 12 && hour < 18) {
    return affection < 40
      ? { text: 'Siang. Sibuk?', expression: 'normal' }
      : { text: 'Siang. Jangan lupa istirahat ya... bukan karena aku peduli.', expression: 'blushing' };
  } else if (hour >= 18 && hour < 22) {
    return affection < 40
      ? { text: 'Malam.', expression: 'normal' }
      : { text: 'Eh, kamu masih di sini juga.', expression: 'happy' };
  } else {
    return affection < 40
      ? { text: 'Kamu nggak tidur?', expression: 'angry' }
      : { text: 'Tengah malam begini... kamu nggak ada kerjaan lain?', expression: 'clingy' };
  }
}

export default function HomeClient({ initialAffection, userName }: HomeClientProps) {
  const [sessionTime, setSessionTime] = useState(0);
  const [affection] = useState(initialAffection);
  const { text: greeting, expression } = getGreeting(affection);
  const levelInfo = getAffectionLevel(affection);

  useEffect(() => {
    // Screen time tracking
    let sessionId: string | null = null;

    fetch('/api/screentime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    })
      .then(r => r.json())
      .then(d => { if (d.sessionId) sessionId = d.sessionId; });

    const timer = setInterval(() => setSessionTime(prev => prev + 1), 1000);

    const endSession = () => {
      if (sessionId) {
        navigator.sendBeacon('/api/screentime', JSON.stringify({ action: 'end', sessionId }));
      }
    };

    window.addEventListener('beforeunload', endSession);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', endSession);
      endSession();
    };
  }, []);

  // Simpan expression ke localStorage buat halaman lain
  useEffect(() => {
    localStorage.setItem('liviaExpression', expression);
  }, [expression]);

  const sessionMinutes = Math.floor(sessionTime / 60);

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-pink-50">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-60 blur-[3px]"
        style={{ backgroundImage: "url('/bg/bedroom.png')" }} 
      />

      {/* Sweet background glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 mix-blend-screen"
        style={{
          background: expression === 'angry'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,100,100,0.3) 0%, transparent 60%)'
            : expression === 'blushing'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,150,180,0.4) 0%, transparent 60%)'
            : expression === 'happy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,220,150,0.4) 0%, transparent 60%)'
            : expression === 'clingy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(200,150,255,0.3) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.2) 0%, transparent 60%)'
        }}
      />

      {/* Screen time */}
      <div className="absolute top-6 left-8 z-10 font-mono font-bold text-xs bg-white/70 backdrop-blur-md px-4 py-2 rounded-full text-pink-400 border border-pink-100 shadow-sm">
        {sessionMinutes > 0 ? `${sessionMinutes} menit bersama Livia` : 'Baru datang'}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-6 py-12 pt-20">
        
        {/* Greeting */}
        <div className="text-center pt-4 mb-4">
          <p className="font-display font-bold text-2xl drop-shadow-sm"
            style={{ color: '#5c4d47' }}
          >
            "{greeting}"
          </p>
          <p className="font-mono text-sm mt-2 font-bold text-pink-400">
            — Livia
          </p>
        </div>

        {/* Livia sprite */}
        <div className="flex-1 flex items-end justify-center w-full max-w-sm drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)]">
          <LiviaSprite
            expression={expression}
            className="w-full h-auto max-h-[55vh]"
          />
        </div>

        {/* Bottom section */}
        <div className="w-full max-w-lg flex flex-col gap-6 mt-6">
          {/* Affection bar */}
          <AffectionBar
            affection={affection}
            level={levelInfo.level}
            levelName={levelInfo.name}
          />

          {/* Menu */}
          <div className="grid grid-cols-3 gap-4 px-2">
            <MenuCard href="/chat" icon={<MessageSquare size={24} />} title="Ngobrol" />
            <MenuCard href="/pomodoro" icon={<Clock size={24} />} title="Fokus" />
            <MenuCard href="/story" icon={<BookOpen size={24} />} title="Cerita" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuCard({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-3 py-5 rounded-3xl transition-all duration-300 group shadow-sm hover:shadow-[0_10px_25px_rgba(255,154,158,0.3)] hover:-translate-y-1 bg-white/80 backdrop-blur-md border-2 border-pink-100 hover:border-pink-300"
    >
      <div className="text-pink-400 group-hover:text-pink-600 transition-colors transform group-hover:scale-110 duration-300">
        {icon}
      </div>
      <span className="font-display font-bold text-sm text-[#8a7e7a] group-hover:text-pink-600">
        {title}
      </span>
    </Link>
  );
}