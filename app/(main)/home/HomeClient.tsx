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
      <div className="absolute inset-0 z-20 pointer-events-none p-4 sm:p-6 md:p-10 flex flex-col justify-between">
        
        {/* TOP ROW */}
        <div className="flex flex-col sm:flex-row justify-between items-start pointer-events-auto gap-4 sm:gap-0">
          
          {/* Top Left: Player Info Panel */}
          <div className="bg-white/80 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/50 shadow-sm flex flex-col gap-3 sm:gap-4 w-full sm:min-w-[340px] sm:w-auto transform hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-center px-1">
              <span className="font-display font-black text-xl sm:text-2xl text-[#5c4d47] tracking-tight">{userName}</span>
              <div className="font-mono font-bold text-[10px] sm:text-xs bg-gradient-to-r from-pink-400 to-pink-500 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm">
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
          <div className="bg-white/80 backdrop-blur-2xl px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-[2rem] border border-white/50 shadow-sm flex items-center gap-3 sm:gap-4 transform hover:scale-[1.02] transition-transform self-end sm:self-auto">
            <div className="p-1.5 sm:p-2 bg-amber-100 rounded-xl">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saldo</span>
              <span className="font-mono font-black text-xl sm:text-2xl text-amber-600 leading-none">{money} Rv</span>
            </div>
          </div>

        </div>

        {/* BOTTOM ROW */}
        <div className="flex flex-col-reverse md:flex-row justify-between items-end md:items-end flex-1 pb-4 md:pb-8 pointer-events-auto gap-6 md:gap-8 w-full mt-10 md:mt-0">
          
          {/* Bottom Left: Chat Bubble */}
          <div className="absolute bottom-24 md:static md:bottom-auto left-4 right-4 md:left-auto md:right-auto md:w-full md:max-w-sm drop-shadow-2xl origin-bottom-left hover:scale-[1.02] transition-transform z-50">
            <div className="bg-white/95 backdrop-blur-2xl px-6 py-5 md:px-8 md:py-6 rounded-3xl md:rounded-[2.5rem] md:rounded-bl-xl border-2 border-pink-100/50 shadow-xl md:shadow-2xl relative z-10">
              <p className="font-display font-bold text-lg md:text-xl text-gray-800 leading-snug">
                "{greeting}"
              </p>
              {isInvitingOut && (
                <button 
                  onClick={() => setShowEvent(true)}
                  className="mt-4 md:mt-6 w-full py-2.5 md:py-3 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-black text-base md:text-lg rounded-xl md:rounded-2xl shadow-md hover:-translate-y-1 transition-all flex items-center justify-center gap-2 md:gap-3"
                >
                  <span className="text-xl md:text-2xl">🕶️</span> Boleh, ayo!
                </button>
              )}
            </div>
          </div>

          {/* Right Side: Command Menus (Desktop Only) */}
          <div className="hidden md:flex flex-col gap-4 md:gap-6 items-end w-full md:w-auto">
            
            {/* Primary Navigation Column */}
            <div className="flex flex-row md:flex-col gap-2 md:gap-4 items-end mb-2 md:mb-4 w-full justify-end md:justify-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              <SideMenuCard href="/story" icon={<BookOpen size={24} className="md:w-[28px] md:h-[28px]" />} title="CERITA" />
              <SideMenuCard href="/chat" icon={<MessageSquare size={24} className="md:w-[28px] md:h-[28px]" />} title="OBROLAN" />
              {isInvitingOut || (affection >= 40 && (itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses'))) ? (
                <SideMenuCard href="/date" icon={<MapPin size={24} className="md:w-[28px] md:h-[28px]" />} title="JALAN" isSpecial />
              ) : null}
            </div>

            {/* Secondary Navigation Row */}
            <div className="flex gap-2 md:gap-4 flex-nowrap md:flex-wrap justify-end w-full overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              <BottomMenuCard href="/pomodoro" icon={<Clock size={20} className="md:w-[24px] md:h-[24px]" />} title="Fokus" />
              <BottomMenuCard href="/work" icon={<Briefcase size={20} className="md:w-[24px] md:h-[24px]" />} title="Kerja" />
              <BottomMenuCard href="/wardrobe" icon={<Shirt size={20} className="md:w-[24px] md:h-[24px]" />} title="Lemari" />
              <BottomMenuCard href="/shop" icon={<Gift size={20} className="md:w-[24px] md:h-[24px]" />} title="Toko" />
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-2xl border-t border-[#5c4d47]/10 px-2 py-3 pb-6 flex justify-around items-center z-[100] shadow-[0_-10px_20px_rgba(0,0,0,0.03)] pointer-events-auto">
        <MobileNavBtn href="/home" icon={<BookOpen size={22} />} label="Lobi" isActive />
        <MobileNavBtn href="/chat" icon={<MessageSquare size={22} />} label="Obrolan" />
        <MobileNavBtn href="/pomodoro" icon={<Clock size={22} />} label="Fokus" />
        <MobileNavBtn href="/wardrobe" icon={<Shirt size={22} />} label="Lemari" />
        <MobileNavBtn href="/shop" icon={<Gift size={22} />} label="Toko" />
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
      className={`group flex items-center justify-center md:justify-end gap-2 md:gap-5 px-4 md:pl-12 md:pr-6 py-3 md:py-4 rounded-2xl md:rounded-l-full md:rounded-r-[2rem] transition-all duration-300 md:duration-500 md:hover:pr-8 border-2 md:border-r-0 whitespace-nowrap shrink-0 ${
        isSpecial 
          ? 'bg-gradient-to-l from-[#ff758c] to-[#ff0844] md:from-[#ff758c]/90 md:to-white/90 backdrop-blur-2xl border-white hover:border-pink-300 shadow-md md:shadow-[0_15px_30px_rgba(255,117,140,0.3)]' 
          : 'bg-white/90 md:bg-white/80 backdrop-blur-2xl border-white/50 hover:bg-white hover:border-pink-200 shadow-sm md:shadow-[0_10px_25px_rgba(0,0,0,0.05)]'
      }`}
    >
      <span className={`font-display font-black text-sm md:text-3xl tracking-widest md:italic transition-colors drop-shadow-sm ${isSpecial ? 'text-white' : 'text-[#5c4d47] group-hover:text-[#ff758c]'}`}>
        {title}
      </span>
      <div className={`p-2 md:p-4 rounded-full shadow-inner transition-transform duration-300 md:duration-500 group-hover:rotate-12 group-hover:scale-110 hidden md:block ${isSpecial ? 'bg-white text-[#ff758c]' : 'bg-pink-50 text-[#ff758c]'}`}>
        {icon}
      </div>
    </Link>
  );
}

function BottomMenuCard({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-1.5 md:gap-3 w-[72px] h-[72px] md:w-24 md:h-24 bg-white/90 md:bg-white/80 backdrop-blur-2xl border border-white/50 rounded-xl md:rounded-[2rem] shadow-sm md:shadow-[0_10px_25px_rgba(0,0,0,0.05)] hover:bg-white hover:border-pink-200 md:hover:-translate-y-2 transition-all duration-300 shrink-0"
    >
      <div className="text-gray-400 group-hover:text-[#ff758c] transition-colors transform group-hover:scale-110 duration-300">
        {icon}
      </div>
      <span className="font-display font-bold text-[10px] md:text-sm text-gray-500 group-hover:text-[#ff758c]">
        {title}
      </span>
    </Link>
  );
}

function MobileNavBtn({ href, icon, label, isActive = false }: { href: string; icon: React.ReactNode; label: string; isActive?: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1 w-14">
      <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-pink-100 text-[#ff758c] shadow-sm' : 'text-gray-400 hover:text-[#ff758c]'}`}>
        {icon}
      </div>
      <span className={`font-display text-[9px] font-bold ${isActive ? 'text-[#ff758c]' : 'text-gray-400'}`}>
        {label}
      </span>
    </Link>
  );
}