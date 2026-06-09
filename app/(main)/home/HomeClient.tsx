'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, BookOpen, Briefcase, Gift, MapPin, Wallet, Shirt } from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import AffectionBar from '@/components/livia/AffectionBar';
import { LiviaExpression } from '@/lib/gemini';
import { getAffectionLevel } from '@/lib/livia/affection';

interface HomeClientProps {
  initialAffection: number;
  userName: string;
  initialItemsBrought: string[];
  initialOutfit: string;
}

function getGreeting(affection: number, itemsBrought: string[]): { text: string; expression: LiviaExpression; isInvitingOut?: boolean } {
  const hour = new Date().getHours();
  
  if (affection >= 40 && (itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses'))) {
    const randomChance = Math.random();
    if (randomChance > 0.6) {
      const places = ['supermarket', 'perpustakaan kota'];
      const place = places[Math.floor(Math.random() * places.length)];
      return { 
        text: `Hei... kebetulan aku mau ke ${place}. Karena kamu udah beliin kacamata ini... y-yah, kamu boleh ikut kalau mau.`, 
        expression: 'blushing',
        isInvitingOut: true
      };
    }
  }

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

export default function HomeClient({ initialAffection, userName, initialItemsBrought, initialOutfit }: HomeClientProps) {
  const [sessionTime, setSessionTime] = useState(0);
  const [affection] = useState(initialAffection);
  const [itemsBrought] = useState(initialItemsBrought);
  const [outfit] = useState(initialOutfit);
  const [money, setMoney] = useState(0);
  const [greetingData, setGreetingData] = useState<{text: string, expression: LiviaExpression, isInvitingOut?: boolean}>({
    text: '...', expression: 'normal'
  });
  
  useEffect(() => {
    setGreetingData(getGreeting(affection, itemsBrought));
    
    // Fetch money
    fetch('/api/affection').then(r => r.ok && r.json()).then(d => {
      if (d) setMoney(d.money || 0);
    }).catch(console.error);
  }, [affection, itemsBrought]);

  const { text: greeting, expression, isInvitingOut } = greetingData;
  const levelInfo = getAffectionLevel(affection);
  const [showEvent, setShowEvent] = useState(false);

  useEffect(() => {
    let sessionId: string | null = null;
    fetch('/api/screentime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    }).then(r => r.json()).then(d => { if (d.sessionId) sessionId = d.sessionId; });

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

  useEffect(() => {
    localStorage.setItem('liviaExpression', expression);
  }, [expression]);

  const sessionMinutes = Math.floor(sessionTime / 60);

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-[#fdfbf7] select-none font-sans">
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-multiply transition-all duration-1000"
        style={{ backgroundImage: "url('/bg/bedroom.png')" }} 
      />

      {/* Screen VFX Overlays */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 mix-blend-screen opacity-60"
        style={{
          background: expression === 'angry'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,100,100,0.5) 0%, transparent 70%)'
            : expression === 'blushing'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,150,180,0.5) 0%, transparent 70%)'
            : expression === 'happy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,220,150,0.5) 0%, transparent 70%)'
            : expression === 'clingy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(200,150,255,0.4) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.3) 0%, transparent 70%)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/10 pointer-events-none z-0" />

      {/* Center Character (Valkyrie Lobby Style) */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none z-10 pb-4">
        <LiviaSprite
          expression={expression}
          outfit={outfit}
          className="h-[75vh] md:h-[85vh] w-auto max-w-[900px] object-contain object-bottom drop-shadow-[0_25px_50px_rgba(255,154,158,0.25)] animate-[float_6s_ease-in-out_infinite]"
        />
      </div>

      {/* HUD UI Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none p-6 md:p-10 flex flex-col justify-between">
        
        {/* TOP ROW */}
        <div className="flex justify-between items-start pointer-events-auto">
          
          {/* Top Left: Player Info Panel */}
          <div className="bg-white/80 backdrop-blur-2xl p-5 rounded-3xl border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex flex-col gap-4 min-w-[280px] sm:min-w-[340px] transform hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-center px-1">
              <span className="font-display font-black text-2xl text-[#5c4d47] tracking-tight">{userName}</span>
              <div className="font-mono font-bold text-xs bg-gradient-to-r from-pink-400 to-pink-500 text-white px-3 py-1.5 rounded-full shadow-sm">
                {sessionMinutes > 0 ? `ON: ${sessionMinutes}m` : 'Baru tiba'}
              </div>
            </div>
            <AffectionBar
              affection={affection}
              level={levelInfo.level}
              levelName={levelInfo.name}
            />
          </div>

          {/* Top Right: Wallet Indicator */}
          <div className="bg-white/80 backdrop-blur-2xl px-6 py-4 rounded-[2rem] border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex items-center gap-4 transform hover:scale-[1.02] transition-transform">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Wallet className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saldo</span>
              <span className="font-mono font-black text-2xl text-amber-600 leading-none">{money} Rv</span>
            </div>
          </div>

        </div>

        {/* BOTTOM ROW */}
        <div className="flex flex-col md:flex-row justify-between items-end flex-1 pb-4 pointer-events-auto gap-8">
          
          {/* Bottom Left: Chat Bubble */}
          <div className="relative w-full max-w-sm mb-4 md:mb-12 drop-shadow-2xl origin-bottom-left hover:scale-105 transition-transform">
            <div className="bg-white/95 backdrop-blur-2xl px-8 py-6 rounded-[2.5rem] rounded-bl-xl border-2 border-pink-100/50 shadow-2xl relative z-10">
              <p className="font-display font-bold text-xl text-gray-800 leading-snug">
                "{greeting}"
              </p>
              {isInvitingOut && (
                <button 
                  onClick={() => setShowEvent(true)}
                  className="mt-6 w-full py-3 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-black text-lg rounded-2xl shadow-[0_10px_20px_rgba(255,117,140,0.3)] hover:shadow-[0_15px_30px_rgba(255,117,140,0.4)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">🕶️</span> Boleh, ayo pergi!
                </button>
              )}
            </div>
          </div>

          {/* Right Side: Command Menus (Lobby Navigation) */}
          <div className="flex flex-col gap-6 items-end">
            
            {/* Primary Navigation Column */}
            <div className="flex flex-col gap-4 items-end mb-4">
              <SideMenuCard href="/story" icon={<BookOpen size={28} />} title="CERITA" />
              <SideMenuCard href="/chat" icon={<MessageSquare size={28} />} title="INTERAKSI" />
              {isInvitingOut || (affection >= 40 && (itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses'))) ? (
                <SideMenuCard href="/date" icon={<MapPin size={28} />} title="JALAN" isSpecial />
              ) : null}
            </div>

            {/* Secondary Navigation Row */}
            <div className="flex gap-4 flex-wrap justify-end max-w-[400px]">
              <BottomMenuCard href="/pomodoro" icon={<Clock size={24} />} title="Fokus" />
              <BottomMenuCard href="/work" icon={<Briefcase size={24} />} title="Kerja" />
              <BottomMenuCard href="/wardrobe" icon={<Shirt size={24} />} title="Lemari" />
              <BottomMenuCard href="/shop" icon={<Gift size={24} />} title="Toko" />
            </div>

          </div>

        </div>
      </div>

      {/* Mini Event Modal (For Sunglasses Event) */}
      {showEvent && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-[2rem] flex items-center justify-center text-6xl mb-8 shadow-inner rotate-3">
              🕶️
            </div>
            <h2 className="text-3xl font-display font-black text-[#5c4d47] mb-4">Momen Spesial</h2>
            <p className="text-gray-600 mb-8 text-lg">
              Kamu menghabiskan waktu menemani Livia berbelanja. Dia memakai kacamata hitam pemberianmu sepanjang jalan, menyembunyikan wajahnya yang merona.
            </p>
            <p className="text-[#ff758c] font-black mb-10 text-xl">"T-tempat ini lumayan seru juga..."</p>
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setShowEvent(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold text-lg rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
              <Link 
                href="/date"
                className="flex-[2] py-4 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center"
              >
                Jalan Lanjut!
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SideMenuCard({ href, icon, title, isSpecial = false }: { href: string; icon: React.ReactNode; title: string; isSpecial?: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-end gap-5 pl-12 pr-6 py-4 rounded-l-full rounded-r-[2rem] transition-all duration-500 hover:pr-8 border-2 border-r-0 ${
        isSpecial 
          ? 'bg-gradient-to-l from-[#ff758c]/90 to-white/90 backdrop-blur-2xl border-white hover:border-pink-300 shadow-[0_15px_30px_rgba(255,117,140,0.3)]' 
          : 'bg-white/80 backdrop-blur-2xl border-white/50 hover:bg-white hover:border-pink-200 shadow-[0_10px_25px_rgba(0,0,0,0.05)]'
      }`}
    >
      <span className={`font-display font-black text-3xl tracking-widest italic transition-colors drop-shadow-sm ${isSpecial ? 'text-white' : 'text-[#5c4d47] group-hover:text-[#ff758c]'}`}>
        {title}
      </span>
      <div className={`p-4 rounded-full shadow-inner transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 ${isSpecial ? 'bg-white text-[#ff758c]' : 'bg-pink-50 text-[#ff758c]'}`}>
        {icon}
      </div>
    </Link>
  );
}

function BottomMenuCard({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-3 w-24 h-24 bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-[0_10px_25px_rgba(0,0,0,0.05)] hover:bg-white hover:border-pink-200 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(255,117,140,0.2)] transition-all duration-300"
    >
      <div className="text-gray-400 group-hover:text-[#ff758c] transition-colors transform group-hover:scale-110 duration-300">
        {icon}
      </div>
      <span className="font-display font-bold text-sm text-gray-500 group-hover:text-[#ff758c]">
        {title}
      </span>
    </Link>
  );
}