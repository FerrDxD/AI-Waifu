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
    <div className="min-h-screen relative flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #0a0908 0%, #12100e 60%, #1a1510 100%)' }}
    >
      {/* Background glow sesuai expression */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: expression === 'angry'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(180,60,60,0.08) 0%, transparent 60%)'
            : expression === 'blushing'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(220,120,120,0.08) 0%, transparent 60%)'
            : expression === 'happy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(196,149,106,0.08) 0%, transparent 60%)'
            : expression === 'clingy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(180,130,250,0.06) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 50% 90%, rgba(100,90,80,0.05) 0%, transparent 60%)'
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)' }}
      />

      {/* Screen time */}
      <div className="absolute top-5 left-6 z-10 font-mono text-xs"
        style={{ color: 'rgba(196,149,106,0.4)' }}
      >
        {sessionMinutes > 0 ? `${sessionMinutes} menit di sini` : 'baru datang'}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-6 py-12">
        
        {/* Greeting */}
        <div className="text-center pt-4">
          <p className="font-display text-2xl italic"
            style={{ color: '#e8e0d0' }}
          >
            "{greeting}"
          </p>
          <p className="font-mono text-xs mt-2" style={{ color: 'rgba(196,149,106,0.5)' }}>
            — Livia
          </p>
        </div>

        {/* Livia sprite — besar, dominan */}
        <div className="flex-1 flex items-end justify-center w-full max-w-sm">
          <LiviaSprite
            expression={expression}
            className="w-full h-auto max-h-[55vh]"
          />
        </div>

        {/* Bottom section */}
        <div className="w-full max-w-lg flex flex-col gap-6">
          {/* Affection bar */}
          <AffectionBar
            affection={affection}
            level={levelInfo.level}
            levelName={levelInfo.name}
          />

          {/* Menu */}
          <div className="grid grid-cols-3 gap-3">
            <MenuCard href="/chat" icon={<MessageSquare size={20} />} title="Ngobrol" />
            <MenuCard href="/pomodoro" icon={<Clock size={20} />} title="Fokus" />
            <MenuCard href="/story" icon={<BookOpen size={20} />} title="Cerita" />
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
      className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all duration-200 group"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(196,149,106,0.15)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(196,149,106,0.08)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196,149,106,0.4)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196,149,106,0.15)';
      }}
    >
      <div style={{ color: 'rgba(196,149,106,0.6)' }} className="transition-colors group-hover:text-accent">
        {icon}
      </div>
      <span className="font-display text-sm" style={{ color: '#c9c3b8' }}>
        {title}
      </span>
    </Link>
  );
}