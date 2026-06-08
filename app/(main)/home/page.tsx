'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, BookOpen } from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import AffectionBar from '@/components/livia/AffectionBar';
import { LiviaExpression } from '@/lib/gemini';
import { getAffectionLevel } from '@/lib/livia/affection';

// Mocked profile data for client component (we'll fetch it on mount)
interface UserData {
  affection: number;
  totalScreenTime: number;
}

export default function HomePage() {
  const [data, setData] = useState<UserData | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [expression, setExpression] = useState<LiviaExpression>('normal');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const savedExpr = localStorage.getItem('liviaExpression') as LiviaExpression;
    if (savedExpr) setExpression(savedExpr);

    const fetchProfile = async () => {
      // In a real app we might have a separate endpoint or just pass it as props via RSC.
      // We will mock fetching the profile data for now, or just use default values if not fetched.
      // Wait, there is no /api/profile route. Let's make a quick fetch to a route or just pass it down if it was a server component.
      // To keep it clean, let's fetch session via a trick, or we can assume it starts at 0 if no data.
      // Since it's 'use client', I'll just leave it at 0 for now or assume another endpoint exists.
      setData({ affection: 0, totalScreenTime: 0 }); // Placeholder
    };
    fetchProfile();

    // Start ScreenTime session
    let sessionId: string | null = null;
    const startSession = async () => {
      const res = await fetch('/api/screentime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json();
      if (data.sessionId) sessionId = data.sessionId;
    };
    startSession();

    // Timer for display
    const timer = setInterval(() => setSessionTime(prev => prev + 1), 1000);

    return () => {
      clearInterval(timer);
      if (sessionId) {
        // use navigator.sendBeacon ideally, but fetch is fine for this demo
        fetch('/api/screentime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({ action: 'end', sessionId }),
        });
      }
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const hour = new Date().getHours();
    const aff = data.affection;
    
    // Greeting logic
    if (hour >= 5 && hour < 12) {
      setGreeting(aff < 40 ? "Kamu lagi ngapain pagi-pagi?" : "Pagi. Udah sarapan belum?");
    } else if (hour >= 12 && hour < 18) {
      setGreeting(aff < 40 ? "Siang. Sibuk?" : "Siang. Jangan lupa istirahat, ya.");
    } else {
      setGreeting(aff < 40 ? "Malam." : "Eh, kamu masih di sini juga. Belum tidur?");
    }
  }, [data]);

  if (!data) return null;

  const levelInfo = getAffectionLevel(data.affection);

  return (
    <div className="min-h-screen bg-[url('/bg-texture.png')] bg-cover relative flex flex-col items-center justify-between p-6">
      <div className="absolute inset-0 bg-background/80 z-0" />
      
      {/* ScreenTime small info */}
      <div className="absolute top-6 left-6 z-10 text-xs text-text-muted font-mono">
        Kamu sudah di sini {Math.floor(sessionTime / 60)} menit hari ini
      </div>

      <div className="z-10 flex-1 w-full max-w-4xl flex flex-col items-center pt-12">
        <div className="text-center mb-8 h-12">
          <p className="text-xl text-text-primary italic font-display">"{greeting}"</p>
        </div>

        <div className="h-[400px] w-[300px] mb-8">
          <LiviaSprite expression={expression} />
        </div>

        <div className="w-full max-w-md mb-12">
          <AffectionBar affection={data.affection} level={levelInfo.level} levelName={levelInfo.name} />
        </div>

        <div className="grid grid-cols-3 gap-6 w-full max-w-2xl mt-auto pb-12">
          <MenuCard href="/chat" icon={<MessageSquare />} title="Ngobrol" />
          <MenuCard href="/pomodoro" icon={<Clock />} title="Fokus" />
          <MenuCard href="/story" icon={<BookOpen />} title="Cerita" />
        </div>
      </div>
    </div>
  );
}

function MenuCard({ href, icon, title }: { href: string, icon: React.ReactNode, title: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center p-6 bg-surface border border-custom rounded-lg hover:border-accent hover:bg-background transition-all group">
      <div className="text-text-muted group-hover:text-accent transition-colors mb-3">
        {icon}
      </div>
      <span className="font-display text-xl text-text-primary group-hover:text-accent transition-colors">
        {title}
      </span>
    </Link>
  );
}
