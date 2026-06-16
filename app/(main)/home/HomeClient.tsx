'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, BookOpen, Briefcase, Gift, MapPin, Wallet, Shirt, Menu, X, Heart, Moon, Utensils, Battery, Droplet } from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import AffectionBar from '@/components/livia/AffectionBar';
import { LiviaExpression } from '@/lib/gemini';
import { getAffectionLevel } from '@/lib/livia/affection';
import { ITEMS } from '@/lib/livia/items';

interface HomeClientProps {
  initialAffection: number;
  userName: string;
  initialItemsBrought: string[];
  initialOutfit: string;
}

function calculateCycleDay(anchorString: string): number {
  if (!anchorString) return 1;
  const anchorDate = new Date(anchorString);
  anchorDate.setHours(0, 0, 0, 0);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((nowDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
  return (daysDiff % 28 + 28) % 28 + 1; // 1 to 28
}

function getGreeting(affection: number, itemsBrought: string[], stats: {hunger: number, energy: number, hydration: number, cyclePhase: string}, userName: string): { text: string; expression: LiviaExpression; isInvitingOut?: boolean } {
  const hour = new Date().getHours();
  
  if (affection >= 40 && (itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses'))) {
    const randomChance = Math.random();
    if (randomChance > 0.6 && stats.energy > 50 && stats.cyclePhase !== 'Menstruasi') {
      const places = ['supermarket', 'perpustakaan kota'];
      const place = places[Math.floor(Math.random() * places.length)];
      return { 
        text: `Hei... kebetulan aku mau ke ${place}. Karena ${userName} udah beliin kacamata ini... y-yah, ${userName} boleh ikut kalau mau.`, 
        expression: 'blushing',
        isInvitingOut: true
      };
    }
  }

  // Priority overrides based on extreme physical conditions
  if (stats.hunger < 25) {
    return { text: `A-aku laper banget... ${userName} nggak peka banget sih, aku belum makan daritadi!`, expression: 'angry' };
  }
  if (stats.hydration < 25) {
    return { text: 'Haus... kerongkonganku kering banget. Jangan ajak ngobrol dulu.', expression: 'normal' }; // using normal as tired
  }
  if (stats.energy < 25) {
    return { text: 'Aku capek banget... mataku berat... jangan berisik ya.', expression: 'normal' };
  }
  if (stats.cyclePhase === 'Menstruasi') {
    return { text: 'Perutku sakit... jangan banyak tingkah hari ini, aku lagi sensitif!', expression: 'angry' };
  } else if (stats.cyclePhase === 'Luteal') {
    return { text: `Nggak tau kenapa aku gampang bete hari ini. Mending ${userName} jangan bikin ulah.`, expression: 'angry' };
  }

  if (hour >= 5 && hour < 12) {
    return affection < 40
      ? { text: `${userName} lagi ngapain pagi-pagi?`, expression: 'normal' }
      : { text: 'Pagi. Udah sarapan belum?', expression: 'happy' };
  } else if (hour >= 12 && hour < 18) {
    return affection < 40
      ? { text: 'Siang. Sibuk?', expression: 'normal' }
      : { text: 'Siang. Jangan lupa istirahat ya... bukan karena aku peduli.', expression: 'blushing' };
  } else if (hour >= 18 && hour < 22) {
    return affection < 40
      ? { text: 'Malam.', expression: 'normal' }
      : { text: `Eh, ${userName} masih di sini juga.`, expression: 'happy' };
  } else {
    return affection < 40
      ? { text: `${userName} nggak tidur?`, expression: 'angry' }
      : { text: `Tengah malam begini... ${userName} nggak ada kerjaan lain?`, expression: 'clingy' };
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
  const [liviaStats, setLiviaStats] = useState({ hunger: 100, energy: 100, hydration: 100, cycleAnchor: new Date().toISOString() });
  
  useEffect(() => {
    // Only fetch cyclePhase once based on liviaStats anchor
    const getCycleInfoTemp = () => {
      const dayOfCycle = calculateCycleDay(liviaStats.cycleAnchor);
      if (dayOfCycle <= 5) return 'Menstruasi';
      if (dayOfCycle <= 14) return 'Folikuler';
      if (dayOfCycle <= 17) return 'Ovulasi';
      return 'Luteal';
    };

    setGreetingData(getGreeting(affection, itemsBrought, { ...liviaStats, cyclePhase: getCycleInfoTemp() }, userName));
    
    // Fetch fresh user data
    fetch(`/api/affection?t=${Date.now()}`).then(r => r.ok && r.json()).then(d => {
      if (d) {
        setMoney(d.money || 0);
        if (d.activeOutfit) setOutfit(d.activeOutfit);
        if (d.liviaStats) {
           setLiviaStats(d.liviaStats);
           // Recompute greeting if stats changed drastically from defaults
           const newCyclePhase = (() => {
             const dayOfCycle = calculateCycleDay(d.liviaStats.cycleAnchor);
             if (dayOfCycle <= 5) return 'Menstruasi';
             if (dayOfCycle <= 14) return 'Folikuler';
             if (dayOfCycle <= 17) return 'Ovulasi';
             return 'Luteal';
           })();
           setGreetingData(getGreeting(affection, itemsBrought, { ...d.liviaStats, cyclePhase: newCyclePhase }, userName));
        }
      }
    }).catch(console.error);
  }, [affection, itemsBrought]);

  const { text: greeting, expression, isInvitingOut } = greetingData;
  const levelInfo = getAffectionLevel(affection);
  const [showEvent, setShowEvent] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);

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
        `Jangan mikir aku suka diginiin ya, ${userName}!`,
        "R-rambutku berantakan tau..."
      ];
      newText = texts[Math.floor(Math.random() * texts.length)];
    } else if (part === 'chest') {
      newExpr = 'angry';
      affectionChange = -2;
      const texts = [
        "H-hei! Dasar mesum! Tanganmu mau kupatahkan?!",
        "M-mata dan tanganmu itu dijaga ya!",
        `${userName} mau mati sekarang juga?!`,
        "K-kyyaa! Jangan sentuh dadaku bodoh!"
      ];
      newText = texts[Math.floor(Math.random() * texts.length)];
    } else if (part === 'belly') {
      newExpr = 'angry';
      affectionChange = -1;
      const texts = [
        "Geli tau! Jauhkan tanganmu dari perutku!",
        `${userName} ngapain sih?! Dasar aneh!`,
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
        `Jangan coba-coba meraba-raba ke bawah ya, ${userName}!`,
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
    if (hour >= 5 && hour < 15) return '/bg/home screen/home_morning.webp';
    if (hour >= 15 && hour < 18) return '/bg/home screen/home_afternoon.webp';
    return '/bg/home screen/home_night.webp';
  };

  const getCycleInfo = () => {
    const dayOfCycle = calculateCycleDay(liviaStats.cycleAnchor);
    
    if (dayOfCycle <= 5) return { phase: 'Menstruasi', color: 'text-red-500 bg-red-50 border-red-200', day: dayOfCycle };
    if (dayOfCycle <= 14) return { phase: 'Folikuler', color: 'text-pink-500 bg-pink-50 border-pink-200', day: dayOfCycle };
    if (dayOfCycle <= 17) return { phase: 'Ovulasi', color: 'text-purple-500 bg-purple-50 border-purple-200', day: dayOfCycle };
    return { phase: 'Luteal', color: 'text-amber-500 bg-amber-50 border-amber-200', day: dayOfCycle };
  };
  const cycle = getCycleInfo();

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
        <div className="flex md:hidden flex-col gap-2 pointer-events-auto">
            <div className="absolute top-4 left-4 flex gap-2 z-50">
              {/* Minimal Affection Pill */}
            <div 
              onClick={() => setShowMobileStats(true)}
              className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-100 shadow-sm flex items-center gap-2 active:scale-95 transition-transform"
            >
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
          
          {/* Bottom Left: Island UI & Chat Bubble */}
          <div className="absolute bottom-[4.5rem] left-4 right-4 md:bottom-8 md:left-10 md:right-auto md:w-[400px] z-50 flex flex-col gap-3">
            
            {/* Onboarding Items Vault (Horizontal Full Width) */}
            {itemsBrought.filter(id => ITEMS.some(i => i.id === id)).length > 0 && (
              <div className="hidden md:flex bg-white/70 backdrop-blur-2xl border border-white/60 p-3 rounded-[2rem] shadow-sm w-fit max-w-full gap-3 flex-wrap items-center">
                <div className="pl-2 flex items-center justify-center">
                  <Gift size={20} className="text-pink-400 drop-shadow-sm" />
                </div>
                <div className="w-px h-6 bg-pink-200/50" />
                {itemsBrought.filter(id => ITEMS.some(i => i.id === id)).map(id => {
                  const item = ITEMS.find(i => i.id === id)!;
                  return (
                    <div key={id} className="w-12 h-12 shrink-0 group relative bg-white/90 rounded-[1rem] flex items-center justify-center border border-pink-50 shadow-sm cursor-help hover:bg-white hover:scale-110 hover:shadow-md hover:border-pink-300 transition-all duration-300">
                      <span className="text-2xl drop-shadow-sm group-hover:drop-shadow-md transition-all">{item.emoji}</span>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 md:w-64 p-3.5 bg-white/95 backdrop-blur-xl border border-pink-100 rounded-2xl shadow-[0_10px_40px_rgba(255,117,140,0.15)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] origin-bottom scale-95 group-hover:scale-100 pointer-events-none flex flex-col gap-2">
                        <div className="font-display font-black text-[#5c4d47] text-sm md:text-base border-b-2 border-pink-50 pb-2 flex items-center gap-2">
                          <span className="text-lg drop-shadow-sm">{item.emoji}</span> {item.name}
                        </div>
                        <p className="text-[11px] md:text-xs text-[#8b7355] font-medium leading-relaxed italic">{item.description}</p>
                        <div className="flex flex-col pt-1">
                          <div className="flex items-start gap-2 text-[10px] md:text-[11px] leading-snug bg-gradient-to-r from-green-50 to-emerald-50/30 p-2.5 rounded-xl border border-green-100 shadow-inner">
                            <span className="text-emerald-500 font-black shrink-0 text-sm mt-[1px]">✦</span>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-black text-emerald-600 uppercase tracking-wider text-[9px] md:text-[10px]">{item.buff.label}</span> 
                              <span className="text-[#5c4d47]">{item.buff.description}</span>
                            </div>
                          </div>
                        </div>
                        {/* Triangle arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-pink-100 drop-shadow-sm" />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-white -mt-[2px]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats Island (Physiological) */}
            <div className="hidden md:flex bg-white/80 backdrop-blur-2xl rounded-[2rem] p-4 border border-white/50 shadow-lg items-center justify-between gap-4 self-start w-auto hover:scale-[1.02] transition-transform origin-bottom-left">
              <div className="flex items-center gap-4 md:gap-5 w-full">
                 <div className="flex flex-col items-center gap-1.5">
                   <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12">
                     <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-200" strokeWidth="4" />
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-orange-400 transition-all duration-1000" strokeWidth="4" strokeDasharray={100.53} strokeDashoffset={100.53 - (liviaStats.hunger/100)*100.53} strokeLinecap="round" />
                     </svg>
                     <div className="absolute flex items-center justify-center"><Utensils size={14} className="text-orange-500 drop-shadow-sm" /></div>
                   </div>
                   <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider">{liviaStats.hunger}%</span>
                 </div>

                 <div className="flex flex-col items-center gap-1.5">
                   <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12">
                     <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-200" strokeWidth="4" />
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-yellow-400 transition-all duration-1000" strokeWidth="4" strokeDasharray={100.53} strokeDashoffset={100.53 - (liviaStats.energy/100)*100.53} strokeLinecap="round" />
                     </svg>
                     <div className="absolute flex items-center justify-center"><Battery size={14} className="text-yellow-500 drop-shadow-sm" /></div>
                   </div>
                   <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider">{liviaStats.energy}%</span>
                 </div>

                 <div className="flex flex-col items-center gap-1.5">
                   <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12">
                     <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-200" strokeWidth="4" />
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-blue-400 transition-all duration-1000" strokeWidth="4" strokeDasharray={100.53} strokeDashoffset={100.53 - (liviaStats.hydration/100)*100.53} strokeLinecap="round" />
                     </svg>
                     <div className="absolute flex items-center justify-center"><Droplet size={14} className="text-blue-500 drop-shadow-sm" /></div>
                   </div>
                   <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider">{liviaStats.hydration}%</span>
                 </div>
              </div>
              <div className="w-px h-10 md:h-12 bg-gray-200 mx-1 md:mx-2" />
              <div className={`flex flex-col items-center justify-center text-center min-w-[70px] md:min-w-[90px] gap-1 px-1`}>
                <Moon size={16} className={`${cycle.color.split(' ')[0]} drop-shadow-sm`} />
                <span className={`text-[9px] md:text-[11px] font-bold leading-tight ${cycle.color.split(' ')[0]}`}>{cycle.phase}</span>
                <span className="text-[8px] md:text-[9px] font-bold text-gray-400">Hari {cycle.day}</span>
              </div>
            </div>

            {/* Chat Bubble */}
            <div className="drop-shadow-lg md:drop-shadow-2xl origin-bottom-left hover:scale-[1.02] transition-transform">
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
      {/* Custom Mobile Modal for Stats & Inventory */}
      {showMobileStats && (
        <div className="md:hidden fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out] pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-[340px] rounded-[2rem] p-6 shadow-2xl border border-pink-100 flex flex-col gap-6 animate-[slideUp_0.3s_ease-out]">
            
            {/* Header & Close Button */}
            <div className="flex justify-between items-center border-b border-pink-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-500 font-black font-display text-xl">{userName.charAt(0)}</div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-[#5c4d47] text-lg leading-none">{userName}</span>
                  <span className="text-[10px] font-bold text-pink-400">{levelInfo.name}</span>
                </div>
              </div>
              <button onClick={() => setShowMobileStats(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full active:scale-95 transition-transform">
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            {/* Affection Details */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-1.5">
                  <Heart size={16} className="fill-pink-500 text-pink-500" />
                  <span className="font-bold text-[#5c4d47] text-sm">Afeksi</span>
                </div>
                <span className="text-xs font-bold text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">Lv.{levelInfo.level} {levelInfo.name}</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, affection))}%` }} />
              </div>
            </div>

            {/* Inventory Vault */}
            {itemsBrought.filter(id => ITEMS.some(i => i.id === id)).length > 0 && (
              <div className="flex flex-col gap-2 bg-pink-50/40 p-3.5 rounded-[1.5rem] border border-pink-100/50 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <Gift size={14} className="text-pink-400" />
                  <span className="text-[10px] font-black text-[#5c4d47] uppercase tracking-widest opacity-80">Barang Bawaan</span>
                </div>
                <div className="flex flex-wrap gap-2.5 w-full">
                  {itemsBrought.filter(id => ITEMS.some(i => i.id === id)).map(id => {
                    const item = ITEMS.find(i => i.id === id)!;
                    return (
                      <div key={id} className="w-[3rem] h-[3rem] shrink-0 relative bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center border border-pink-100 shadow-sm cursor-help active:scale-95 transition-transform group">
                        <span className="text-2xl drop-shadow-sm">{item.emoji}</span>
                        {/* Tooltip for Mobile (appears on click/hold) */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-white border border-pink-100 rounded-2xl shadow-2xl opacity-0 invisible group-active:opacity-100 group-active:visible transition-all z-[100] origin-bottom scale-95 group-active:scale-100 pointer-events-none flex flex-col gap-1.5">
                          <div className="font-display font-black text-[#5c4d47] text-sm border-b-2 border-pink-50 pb-1.5 flex items-center gap-2">
                            <span>{item.emoji}</span> {item.name}
                          </div>
                          <div className="flex items-start gap-1.5 text-[10px] leading-snug bg-gradient-to-r from-green-50 to-emerald-50/30 p-2 rounded-xl border border-green-100 shadow-inner mt-1">
                            <span className="text-emerald-500 font-black shrink-0 mt-[1px]">✦</span>
                            <span className="text-[#5c4d47]"><span className="font-black text-emerald-600 uppercase text-[9px] block mb-0.5">{item.buff.label}</span>{item.buff.description}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Physiological Stats */}
            <div className="flex flex-col gap-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Kondisi Livia</span>
                <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 ${cycle.color}`}>
                  <Moon size={10} /> Siklus: {cycle.phase} (Hari {cycle.day})
                </div>
              </div>
              
              <div className="flex justify-between items-center gap-4 mt-1">
                 <div className="flex flex-col items-center gap-1 flex-1">
                   <div className="relative flex items-center justify-center w-12 h-12">
                     <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-200" strokeWidth="4" />
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-orange-400 transition-all duration-1000" strokeWidth="4" strokeDasharray={100.53} strokeDashoffset={100.53 - (liviaStats.hunger/100)*100.53} strokeLinecap="round" />
                     </svg>
                     <div className="absolute flex items-center justify-center"><Utensils size={14} className="text-orange-500" /></div>
                   </div>
                   <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{liviaStats.hunger}%</span>
                 </div>

                 <div className="flex flex-col items-center gap-1 flex-1">
                   <div className="relative flex items-center justify-center w-12 h-12">
                     <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-200" strokeWidth="4" />
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-yellow-400 transition-all duration-1000" strokeWidth="4" strokeDasharray={100.53} strokeDashoffset={100.53 - (liviaStats.energy/100)*100.53} strokeLinecap="round" />
                     </svg>
                     <div className="absolute flex items-center justify-center"><Battery size={14} className="text-yellow-500" /></div>
                   </div>
                   <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{liviaStats.energy}%</span>
                 </div>

                 <div className="flex flex-col items-center gap-1 flex-1">
                   <div className="relative flex items-center justify-center w-12 h-12">
                     <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-200" strokeWidth="4" />
                       <circle cx="20" cy="20" r="16" className="fill-transparent stroke-blue-400 transition-all duration-1000" strokeWidth="4" strokeDasharray={100.53} strokeDashoffset={100.53 - (liviaStats.hydration/100)*100.53} strokeLinecap="round" />
                     </svg>
                     <div className="absolute flex items-center justify-center"><Droplet size={14} className="text-blue-500" /></div>
                   </div>
                   <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{liviaStats.hydration}%</span>
                 </div>
              </div>
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