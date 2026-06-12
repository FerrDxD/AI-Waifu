'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, BookOpen, Briefcase, Gift, MapPin, Wallet, Shirt, Menu, X, Heart } from 'lucide-react';
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
  const [affection, setAffection] = useState(initialAffection);
  const [itemsBrought] = useState(initialItemsBrought);
  const [outfit, setOutfit] = useState(initialOutfit);
  const [money, setMoney] = useState(0);
  const [greetingData, setGreetingData] = useState<{text: string, expression: LiviaExpression, isInvitingOut?: boolean}>({
    text: '...', expression: 'normal'
  });
  const [interactionOverride, setInteractionOverride] = useState<{text: string, expression: LiviaExpression} | null>(null);
  
  useEffect(() => {
    setGreetingData(getGreeting(affection, itemsBrought));
    
    // Fetch fresh user data
    fetch(`/api/affection?t=${Date.now()}`).then(r => r.ok && r.json()).then(d => {
      if (d) {
        setMoney(d.money || 0);
        if (d.activeOutfit) setOutfit(d.activeOutfit);
      }
    }).catch(console.error);
  }, [affection, itemsBrought]);

  const { text: greeting, expression, isInvitingOut } = greetingData;
  const levelInfo = getAffectionLevel(affection);
  const [showEvent, setShowEvent] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  const displayGreeting = interactionOverride ? interactionOverride.text : greeting;
  const displayExpression = interactionOverride ? interactionOverride.expression : expression;

  const handleInteract = async (part: 'head' | 'chest' | 'belly' | 'thigh') => {
    let newExpr: LiviaExpression = 'normal';
    let newText = '';
    let affectionChange = 0;

    if (part === 'head') {
      newExpr = 'blushing';
      affectionChange = 1;
      const texts = [
        "E-eh?! Jangan elus-elus kepalaku dong...",
        "A-apa sih... tanganmu hangat...",
        "Jangan mikir aku suka diginiin ya!",
        "R-rambutku berantakan tau..."
      ];
      newText = texts[Math.floor(Math.random() * texts.length)];
    } else if (part === 'chest') {
      newExpr = 'angry';
      affectionChange = -2;
      const texts = [
        "H-hei! Dasar mesum! Tanganmu mau kupatahkan?!",
        "M-mata dan tanganmu itu dijaga ya!",
        "K-kamu mau mati sekarang juga?!",
        "K-kyyaa! Jangan sentuh dadaku bodoh!"
      ];
      newText = texts[Math.floor(Math.random() * texts.length)];
    } else if (part === 'belly') {
      newExpr = 'angry';
      affectionChange = -1;
      const texts = [
        "Geli tau! Jauhkan tanganmu dari perutku!",
        "Kamu ngapain sih?! Dasar aneh!",
        "A-aku nggak gemuk kok! Jangan pegang-pegang!",
        "Hentikan! Atau aku beneran panggil polisi!"
      ];
      newText = texts[Math.floor(Math.random() * texts.length)];
    } else if (part === 'thigh') {
      newExpr = 'angry';
      affectionChange = -2;
      const texts = [
        "T-tanganmu nyentuh pahaku! Dasar cabul!",
        "M-mau kutendang wajahmu?!",
        "Jangan coba-coba meraba-raba ke bawah ya!",
        "K-kotor! Jauhkan tanganmu!"
      ];
      newText = texts[Math.floor(Math.random() * texts.length)];
    }

    setInteractionOverride({ text: newText, expression: newExpr });
    setShowEvent(false);
    
    // Update local state and backend
    setAffection(prev => Math.min(100, Math.max(0, prev + affectionChange)));
    fetch('/api/affection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: affectionChange, reason: `interaction_touch_${part}` })
    }).catch(console.error);

    // Reset interaction override after 5 seconds
    const globalObj = window as any;
    if (globalObj.interactionTimeout) clearTimeout(globalObj.interactionTimeout);
    globalObj.interactionTimeout = setTimeout(() => {
      setInteractionOverride(null);
    }, 5000);
  };

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

  const getBackgroundImage = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 15) return '/bg/home screen/home_morning.png';
    if (hour >= 15 && hour < 18) return '/bg/home screen/home_afternoon.png';
    return '/bg/home screen/home_night.png';
  };

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-[#fdfbf7] select-none font-sans">
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-[60%_center] md:bg-center opacity-40 transition-all duration-1000"
        style={{ backgroundImage: `url('${getBackgroundImage()}')` }} 
      />

      {/* Screen VFX Overlays */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 mix-blend-screen opacity-60"
        style={{
          background: displayExpression === 'angry'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,100,100,0.5) 0%, transparent 70%)'
            : displayExpression === 'blushing'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,150,180,0.5) 0%, transparent 70%)'
            : displayExpression === 'happy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,220,150,0.5) 0%, transparent 70%)'
            : displayExpression === 'clingy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(200,150,255,0.4) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.3) 0%, transparent 70%)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/10 pointer-events-none z-0" />

      {/* Center Character (Valkyrie Lobby Style) */}
      <div className="absolute inset-0 pointer-events-none z-10 pb-0 overflow-hidden">
        {/* Livia Character */}
        <div className="absolute inset-0 z-0">
          {/* Main Sprite */}
          <LiviaSprite
            expression={displayExpression}
            outfit={outfit}
            disableFloat={true}
            className="w-full h-full"
            imgClassName="object-cover object-[60%_center] md:object-center"
          />
        </div>

        {/* Invisible Hitboxes Wrapper (Aligned to Livia's body: 48%-71% width on Desktop, 10%-90% on Mobile) */}
        <div className="absolute top-0 left-[10%] md:left-[48%] w-[80%] md:w-[24%] h-full pointer-events-auto group z-50">
          {/* Head */}
          <div 
            onClick={() => handleInteract('head')}
            className="absolute top-[5%] left-[25%] w-[50%] h-[15%] cursor-pointer z-50 rounded-full opacity-0"
          />
          {/* Chest */}
          <div 
            onClick={() => handleInteract('chest')}
            className="absolute top-[23%] left-[25%] w-[50%] h-[12%] cursor-pointer z-50 rounded-full opacity-0"
          />
          {/* Belly */}
          <div 
            onClick={() => handleInteract('belly')}
            className="absolute top-[35%] left-[25%] w-[50%] h-[15%] cursor-pointer z-50 rounded-full opacity-0"
          />
          {/* Thigh */}
          <div 
            onClick={() => handleInteract('thigh')}
            className="absolute top-[50%] left-[15%] w-[70%] h-[35%] cursor-pointer z-50 rounded-[3rem] opacity-0"
          />
        </div>
      </div>
          


      {/* HUD UI Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none p-4 sm:p-6 md:p-10 flex flex-col justify-between">
        
        {/* TOP ROW (Desktop) */}
        <div className="hidden md:flex flex-row justify-between items-start pointer-events-auto w-full">
          {/* Top Left: Player Info Panel */}
          <div className="bg-white/80 backdrop-blur-2xl p-5 rounded-3xl border border-white/50 shadow-sm flex flex-col gap-4 min-w-[340px] transform hover:scale-[1.02] transition-transform">
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
          <div className="bg-white/80 backdrop-blur-2xl px-6 py-4 rounded-[2rem] border border-white/50 shadow-sm flex items-center gap-4 transform hover:scale-[1.02] transition-transform">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Wallet className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saldo</span>
              <span className="font-mono font-black text-2xl text-amber-600 leading-none">{money} Rv</span>
            </div>
          </div>
        </div>

        {/* TOP ROW (Mobile - Ultra Compact) */}
        <div className="flex md:hidden flex-col gap-2">
            <div className="absolute top-4 left-4 flex gap-2 z-50">
              {/* Minimal Affection Pill */}
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-100 shadow-sm flex items-center gap-2">
              <Heart size={14} className="fill-amber-400 text-amber-400" />
              <span className="text-xs font-display font-bold text-amber-600">Lv.{levelInfo.level} {levelInfo.name}</span>
              <div className="w-12 h-1.5 bg-pink-100 rounded-full overflow-hidden ml-1">
                <div className="h-full bg-gradient-to-r from-pink-400 to-pink-500" style={{ width: `${Math.max(0, Math.min(100, affection))}%` }} />
              </div>
            </div>
            
            {/* Minimal Wallet Pill */}
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-100 shadow-sm flex items-center gap-1.5">
              <Wallet size={14} className="text-amber-500" />
              <span className="font-mono font-black text-sm text-amber-600">{money} Rv</span>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="flex flex-col-reverse md:flex-row justify-between items-end md:items-end flex-1 pb-4 md:pb-8 pointer-events-auto gap-6 md:gap-8 w-full mt-10 md:mt-0 relative">
          
          {/* Bottom Left: Chat Bubble */}
          <div className="absolute bottom-[4.5rem] left-4 right-4 md:bottom-8 md:left-10 md:right-auto md:w-[400px] drop-shadow-lg md:drop-shadow-2xl origin-bottom-left hover:scale-[1.02] transition-transform z-50">
            <div className="bg-white/95 backdrop-blur-2xl px-4 py-3 md:px-8 md:py-6 rounded-2xl md:rounded-[2.5rem] md:rounded-bl-xl border md:border-2 border-pink-100/50 shadow-xl relative z-10 transition-all duration-300">
              <p className={`font-display font-semibold md:font-bold text-sm md:text-xl leading-tight md:leading-snug transition-colors duration-300 ${interactionOverride?.expression === 'angry' ? 'text-red-500' : 'text-gray-800'}`}>
                "{displayGreeting}"
              </p>
              {isInvitingOut && !interactionOverride && (
                <button 
                  onClick={() => setShowEvent(true)}
                  className="mt-2 md:mt-6 w-full py-2 md:py-3 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-bold md:font-black text-sm md:text-lg rounded-xl md:rounded-2xl shadow-md hover:-translate-y-1 transition-all flex items-center justify-center gap-2 md:gap-3"
                >
                  <span className="text-base md:text-2xl">🕶️</span> Boleh, ayo!
                </button>
              )}
            </div>
          </div>

          {/* Right Side: Command Menus (Desktop Only) */}
          <div className="hidden md:flex flex-col gap-4 md:gap-6 items-end w-full md:w-auto md:absolute md:bottom-8 md:right-10 z-40">
            
            {/* Primary Navigation Column (Main Menus) */}
            <div className="flex flex-col gap-4 items-end mb-2 w-full justify-end pb-0 hide-scrollbar">
              <SideMenuCard href="/chat" icon={<MessageSquare size={24} className="w-[28px] h-[28px]" />} title="OBROLAN" />
              <SideMenuCard href="/story" icon={<BookOpen size={24} className="w-[28px] h-[28px]" />} title="CERITA" />
              
              {(isInvitingOut || (affection >= 40 && (itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses')))) && (
                <SideMenuCard href="/date" icon={<MapPin size={24} className="w-[28px] h-[28px]" />} title="JALAN" isSpecial />
              )}
            </div>

            {/* Sub Navigation Row (Bottom Menus) */}
            <div className="flex flex-row gap-4 justify-end">
              <BottomMenuCard href="/wardrobe" icon={<Shirt size={28} className="md:w-[32px] md:h-[32px]" />} title="Lemari" />
              <BottomMenuCard href="/pomodoro" icon={<Clock size={28} className="md:w-[32px] md:h-[32px]" />} title="Fokus" />
              <BottomMenuCard href="/work" icon={<Briefcase size={28} className="md:w-[32px] md:h-[32px]" />} title="Kerja" />
              <BottomMenuCard href="/shop" icon={<Gift size={28} className="md:w-[32px] md:h-[32px]" />} title="Toko" />
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Bottom Navigation (Island UI) */}
      <div className="md:hidden absolute bottom-6 left-4 right-4 bg-white/90 backdrop-blur-2xl border border-[#5c4d47]/10 rounded-[2rem] p-2 px-4 flex justify-around items-center z-[100] shadow-[0_15px_35px_rgba(0,0,0,0.1)] pointer-events-auto">
        <MobileNavBtn href="/home" icon={<BookOpen size={22} />} label="Lobi" isActive />
        <MobileNavBtn href="/chat" icon={<MessageSquare size={22} />} label="Obrolan" />
        <MobileNavBtn href="/pomodoro" icon={<Clock size={22} />} label="Fokus" />
        <button onClick={() => setShowMoreModal(true)} className="flex flex-col items-center justify-center gap-1 w-14">
          <div className="p-2 rounded-xl transition-all text-gray-400 hover:text-[#ff758c]">
            <Menu size={22} />
          </div>
          <span className="font-display text-[9px] font-bold text-gray-400">Lainnya</span>
        </button>
      </div>

      {/* Menu Lainnya Modal */}
      {showMoreModal && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#fdfbf7] w-full md:max-w-lg rounded-t-[2rem] md:rounded-[2rem] p-6 pb-12 md:pb-8 shadow-2xl flex flex-col transform transition-transform animate-[slideUp_0.3s_ease-out] border-t-4 border-[#ff758c] md:border-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-display font-black text-[#5c4d47] flex items-center gap-2">
                <Menu className="text-[#ff758c]" /> Menu Lainnya
              </h2>
              <button 
                onClick={() => setShowMoreModal(false)} 
                className="text-gray-400 hover:text-white hover:bg-[#ff758c] bg-white border border-gray-200 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 md:gap-6">
              <BottomMenuCard href="/wardrobe" icon={<Shirt size={28} className="md:w-[32px] md:h-[32px]" />} title="Lemari" />
              <BottomMenuCard href="/shop" icon={<Gift size={28} className="md:w-[32px] md:h-[32px]" />} title="Toko" />
              <BottomMenuCard href="/work" icon={<Briefcase size={28} className="md:w-[32px] md:h-[32px]" />} title="Kerja" />
              <BottomMenuCard href="/story" icon={<BookOpen size={28} className="md:w-[32px] md:h-[32px]" />} title="Cerita" />
              {(isInvitingOut || (affection >= 40 && (itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses')))) && (
                <BottomMenuCard href="/date" icon={<MapPin size={28} className="md:w-[32px] md:h-[32px]" />} title="Jalan" />
              )}
            </div>
          </div>
        </div>
      )}

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
      className="group flex flex-col items-center justify-center gap-1.5 md:gap-3 w-full aspect-square md:w-28 md:h-28 bg-white/90 md:bg-white/80 backdrop-blur-2xl border border-pink-100 rounded-[1.5rem] md:rounded-[2rem] shadow-sm md:shadow-[0_10px_25px_rgba(0,0,0,0.05)] hover:bg-white hover:border-[#ff758c] hover:shadow-md md:hover:-translate-y-2 transition-all duration-300 shrink-0"
    >
      <div className="text-pink-300 group-hover:text-[#ff758c] transition-colors transform group-hover:scale-110 duration-300">
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