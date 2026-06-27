'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ShoppingBag, Coffee, TreePine, Book, Gamepad2, Soup, UtensilsCrossed, Landmark, Ticket, Camera, Music, Waves, Lock, Sparkles, Film, Fish, Tent, Snowflake } from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import DialogBox from '@/components/livia/DialogBox';
import { LiviaExpression } from '@/lib/gemini';
import { Send } from 'lucide-react';

const LOCATIONS = [
  { id: 'supermarket', name: 'Supermarket', icon: <ShoppingBag size={32} />, color: 'bg-blue-50 border-blue-200 text-blue-600', hover: 'hover:bg-blue-100' },
  { id: 'taman', name: 'Taman Kota', icon: <TreePine size={32} />, color: 'bg-green-50 border-green-200 text-green-600', hover: 'hover:bg-green-100' },
  { id: 'cafe', name: 'Kafe Kucing', icon: <Coffee size={32} />, color: 'bg-amber-50 border-amber-200 text-amber-600', hover: 'hover:bg-amber-100' },
  { id: 'perpustakaan', name: 'Perpustakaan', icon: <Book size={32} />, color: 'bg-purple-50 border-purple-200 text-purple-600', hover: 'hover:bg-purple-100' },
  { id: 'arcade', name: 'Arcade Center', icon: <Gamepad2 size={32} />, color: 'bg-indigo-50 border-indigo-200 text-indigo-600', hover: 'hover:bg-indigo-100' },
  { id: 'ramen', name: 'Warung Ramen', icon: <Soup size={32} />, color: 'bg-orange-50 border-orange-200 text-orange-600', hover: 'hover:bg-orange-100' },
  { id: 'gyoza', name: 'Restoran Gyoza', icon: <UtensilsCrossed size={32} />, color: 'bg-red-50 border-red-200 text-red-600', hover: 'hover:bg-red-100' },
  { id: 'museum', name: 'Museum Seni', icon: <Landmark size={32} />, color: 'bg-stone-50 border-stone-200 text-stone-600', hover: 'hover:bg-stone-100' },
  { id: 'amusement', name: 'Taman Hiburan', icon: <Ticket size={32} />, color: 'bg-pink-50 border-pink-200 text-pink-600', hover: 'hover:bg-pink-100' },
  { id: 'studio', name: 'Studio Potret', icon: <Camera size={32} />, color: 'bg-teal-50 border-teal-200 text-teal-600', hover: 'hover:bg-teal-100' },
  { id: 'konser', name: 'Konser Musik', icon: <Music size={32} />, color: 'bg-indigo-50 border-indigo-200 text-indigo-600', hover: 'hover:bg-indigo-100', requiredItem: 'tiket_konser', requirementName: 'Tiket Konser' },
  { id: 'festival', name: 'Festival Musim Panas', icon: <Sparkles size={32} />, color: 'bg-rose-50 border-rose-200 text-rose-600', hover: 'hover:bg-rose-100', requiredItem: 'outfit_yukata', requirementName: 'Yukata Festival', mustWear: true },
  { id: 'pantai', name: 'Pantai', icon: <Waves size={32} />, color: 'bg-cyan-50 border-cyan-200 text-cyan-600', hover: 'hover:bg-cyan-100' },
  { id: 'bioskop', name: 'Bioskop', icon: <Film size={32} />, color: 'bg-slate-50 border-slate-200 text-slate-600', hover: 'hover:bg-slate-100' },
  { id: 'akuarium', name: 'Akuarium', icon: <Fish size={32} />, color: 'bg-blue-50 border-blue-200 text-blue-600', hover: 'hover:bg-blue-100' },
  { id: 'pasar_malam', name: 'Pasar Malam', icon: <Tent size={32} />, color: 'bg-amber-50 border-amber-200 text-amber-600', hover: 'hover:bg-amber-100' },
  { id: 'ice_skating', name: 'Ice Skating', icon: <Snowflake size={32} />, color: 'bg-sky-50 border-sky-200 text-sky-600', hover: 'hover:bg-sky-100' },
];

type SceneLine = { speaker: string, text: string, expression?: LiviaExpression };

function DateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scene, setScene] = useState<SceneLine[] | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [itemsBrought, setItemsBrought] = useState<string[]>([]);
  const [activeOutfit, setActiveOutfit] = useState<string>('default');
  
  // Interactive mode states
  const [isInteractive, setIsInteractive] = useState(false);
  const [chatLog, setChatLog] = useState<{role: 'user' | 'livia' | 'narator', content: string}[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [liviaExpression, setLiviaExpression] = useState<LiviaExpression>('normal');

  useEffect(() => {
    fetch('/api/outfit').then(res => res.json()).then(data => {
      setItemsBrought(data.itemsBrought || []);
      setActiveOutfit(data.activeOutfit || 'default');
    }).catch(console.error);

    const locationParam = searchParams.get('location');
    if (locationParam && LOCATIONS.some(l => l.id === locationParam)) {
      startJalan(locationParam);
      // Clean up the URL so it doesn't trigger again on refresh
      router.replace('/date');
    }
  }, [searchParams, router]);

  const startJalan = async (locName: string) => {
    setSelectedLoc(locName);
    setIsLoading(true);
    try {
      const res = await fetch('/api/date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locName }),
      });
      if (res.ok) {
        const data = await res.json();
        setScene(data.scene);
        setSceneIndex(0);
        setIsInteractive(false);
        setChatLog(data.scene.map((line: any) => ({
          role: line.speaker === 'Livia' ? 'livia' : line.speaker === 'Narator' || !line.speaker ? 'narator' : 'user',
          content: line.text
        })));
        setLiviaExpression(data.scene[0].expression || 'normal');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextScene = () => {
    if (isInteractive) return; // In interactive mode, clicking next does nothing
    
    if (scene && sceneIndex < scene.length - 1) {
      setSceneIndex(prev => prev + 1);
      setLiviaExpression(scene[sceneIndex + 1].expression || 'normal');
    } else {
      setIsInteractive(true);
    }
  };

  const handleSendChat = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    const userMsg = inputValue.trim();
    setInputValue('');
    
    const newHistory = [...chatLog, { role: 'user' as const, content: userMsg }];
    setChatLog(newHistory);
    setIsTyping(true);

    try {
      const res = await fetch('/api/date/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: selectedLoc,
          message: userMsg,
          history: chatLog.slice(-10) // Send last 10 messages for context
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatLog(prev => [...prev, { role: 'livia', content: data.reply }]);
        setLiviaExpression(data.expression || 'normal');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Top Bar */}
      <div className="absolute top-4 md:top-6 left-4 md:left-6 z-30">
        <Link href="/home" className="font-display font-bold text-xs md:text-sm bg-white/70 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[#5c4d47] shadow-sm hover:shadow-md hover:bg-white transition-all flex items-center gap-1 md:gap-2">
          <span>←</span> Kembali
        </Link>
      </div>

      {scene ? (
        // VN Reader Mode
        <div className="fixed inset-0 z-[100] bg-[#fdfbf7]/95 backdrop-blur-xl flex flex-col items-center justify-between py-6 px-4 md:px-6 sm:py-12 animate-[fadeIn_0.3s_ease-out]">
          <div className="w-full max-w-5xl flex justify-between px-2 sm:px-8 z-20 shrink-0 mt-8 md:mt-0">
            <span className="font-display font-bold text-sm md:text-base text-[#ff758c] bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-[0_5px_15px_rgba(255,117,140,0.15)] border border-pink-50 flex items-center gap-2">
              <MapPin size={16} className="w-4 h-4" /> {selectedLoc}
            </span>
            <button onClick={() => setScene(null)} className="text-gray-400 hover:text-[#ff758c] text-sm md:text-base font-bold bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              Pulang
            </button>
          </div>
          
          <div className="flex-1 w-full max-w-4xl flex justify-center items-end min-h-0 z-10 relative">
            <LiviaSprite 
              expression={liviaExpression} 
              outfit={activeOutfit}
              className="h-full max-h-[60vh] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)] animate-[float_4s_ease-in-out_infinite]" 
            />
          </div>
          
          <div className="w-full max-w-4xl z-20 drop-shadow-2xl relative flex flex-col items-center shrink-0 mt-4 gap-4">
            <div className="w-full">
              <DialogBox 
                text={isInteractive ? chatLog[chatLog.length - 1].content : scene[sceneIndex].text}
                speaker={isInteractive ? (chatLog[chatLog.length - 1].role === 'livia' ? 'Livia' : chatLog[chatLog.length - 1].role === 'user' ? 'Kamu' : '') : (scene[sceneIndex].speaker === 'Narator' ? '' : scene[sceneIndex].speaker)}
                onNext={handleNextScene}
              />
            </div>
            
            {/* Interactive Input Field */}
            <div className={`w-full transition-all duration-500 transform ${isInteractive ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
              <div className="px-2 md:px-0 flex items-end gap-2 md:gap-3">
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="Ketik balasanmu untuk Livia..."
                  rows={1}
                  disabled={isTyping}
                  className="flex-1 resize-none py-3 md:py-4 px-4 md:px-6 text-[15px] focus:outline-none transition-all placeholder:text-gray-400 bg-white/95 backdrop-blur-xl border border-pink-100 rounded-[24px] text-[#5c4d47] font-medium shadow-[0_10px_25px_rgba(0,0,0,0.05)]"
                />
                <button
                  onClick={handleSendChat}
                  disabled={isTyping || !inputValue.trim()}
                  className="shrink-0 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all shadow-md bg-gradient-to-r from-[#ff0844] to-[#ffb199] text-white disabled:opacity-50 disabled:grayscale"
                >
                  <Send size={16} className={`md:w-5 md:h-5 ${inputValue.trim() && !isTyping ? "ml-1" : ""}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Location Selection Mode (GeForce NOW Style Carousel)
        <div className="flex-1 max-w-[1400px] w-full mx-auto flex flex-col justify-center pt-20 md:pt-24 px-4 md:px-8 z-10 relative">
          
          <div className="mb-6 md:mb-12 flex flex-col items-center text-center animate-[fadeIn_0.5s_ease-out]">
            <div className="inline-flex items-center justify-center gap-2 bg-pink-50 text-[#ff758c] px-4 md:px-5 py-2 md:py-2.5 rounded-full font-bold text-xs md:text-sm mb-4 border border-pink-100 shadow-sm">
               <MapPin size={16} className="w-4 h-4 md:w-5 md:h-5 animate-bounce" /> PILIHAN DESTINASI
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-black text-[#5c4d47] mb-3 md:mb-4 tracking-tight drop-shadow-sm">
              Pilih Destinasi
            </h1>
            <p className="text-[#8C7B6B] font-medium text-sm md:text-xl max-w-lg mx-auto px-4">
              Geser untuk memilih tempat yang akan jadi kenangan manis kalian hari ini.
            </p>
          </div>

          {isLoading ? (
            <div className="fixed inset-0 z-50 bg-[#fdfbf7]/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-[fadeIn_0.3s_ease-out]">
              <div className="relative flex items-center justify-center w-32 h-32 md:w-40 md:h-40 mb-8">
                <div className="absolute inset-0 border-4 border-pink-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-[#ff758c] rounded-full border-t-transparent animate-[spin_1.5s_linear_infinite]" />
                <MapPin className="w-12 h-12 md:w-16 md:h-16 text-[#ff758c] animate-pulse" />
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-black text-[#5c4d47] tracking-wider mb-3">Menuju {selectedLoc}...</h2>
              <p className="text-[#8C7B6B] font-medium text-base md:text-xl px-4 text-center">Livia sedang berdandan dan memilih baju yang pas!</p>
            </div>
          ) : (
            <div className="flex gap-4 md:gap-8 pb-8 md:pb-16 overflow-x-auto snap-x snap-mandatory hide-scrollbar md:scrollbar-thin md:scrollbar-thumb-pink-200 md:scrollbar-track-transparent pr-4 md:pr-8 -mx-4 md:-mx-8 px-6 md:px-12 items-center">
              {LOCATIONS.map(loc => {
                const notOwned = loc.requiredItem && !itemsBrought.includes(loc.requiredItem);
                const notWearing = loc.mustWear && activeOutfit !== loc.requiredItem && activeOutfit !== loc.requiredItem.replace('outfit_', '');
                const isLocked = notOwned || notWearing;
                const lockedReason = notOwned ? `Butuh: ${loc.requirementName}` : notWearing ? `Pakai: ${loc.requirementName}` : '';
                
                return (
                <button
                  key={loc.id}
                  onClick={() => !isLocked && startJalan(loc.name)}
                  disabled={!!isLocked}
                  className={`group relative flex-shrink-0 w-[260px] md:w-[320px] h-[380px] md:h-[480px] rounded-[2.5rem] md:rounded-[3rem] transition-all duration-700 ease-out snap-center overflow-hidden flex flex-col justify-end p-6 md:p-8 text-left border-[6px] md:border-8 ${
                    isLocked 
                      ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed grayscale' 
                      : `bg-white border-white hover:border-[#ff758c]/20 hover:-translate-y-4 hover:shadow-[0_40px_80px_rgba(255,117,140,0.15)]`
                  }`}
                >
                  {/* Subtle Colored Background that grows on hover */}
                  <div className={`absolute inset-0 transition-all duration-700 z-0 ${
                    isLocked ? 'bg-gray-100/50' : `${loc.color.split(' ')[0]} opacity-0 group-hover:opacity-100`
                  }`} />
                  
                  {/* Giant Blurred Icon Backdrop */}
                  <div className={`absolute -right-8 -top-8 text-[240px] opacity-5 transition-all duration-700 z-0 pointer-events-none ${
                    isLocked ? 'text-gray-900' : `${loc.color.split(' ')[2]} group-hover:scale-110 group-hover:rotate-12 group-hover:opacity-[0.08]`
                  }`}>
                    {loc.icon}
                  </div>
                  
                  {/* Gradient Overlay for Text Readability */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${isLocked ? 'from-gray-200/90' : 'from-white via-white/80 group-hover:from-white/40 group-hover:via-transparent'} to-transparent z-0 transition-all duration-500`} />

                  <div className={`relative z-10 transition-transform duration-500 ease-out flex flex-col h-full justify-between ${isLocked ? '' : 'translate-y-4 md:translate-y-6 group-hover:translate-y-0'}`}>
                    
                    {/* Top Section - Icon */}
                    <div className="flex justify-between items-start w-full">
                      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.2rem] md:rounded-2xl flex items-center justify-center shadow-sm border transition-all duration-500 ${
                        isLocked ? 'bg-gray-200 text-gray-400 border-gray-300' : `${loc.color} group-hover:scale-110 group-hover:shadow-xl`
                      }`}>
                        {isLocked ? <Lock size={24} className="w-6 h-6 md:w-7 md:h-7" /> : loc.icon}
                      </div>
                      
                      {!isLocked && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/80 backdrop-blur-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-sm text-[10px] md:text-xs font-bold text-[#ff758c] flex items-center gap-1">
                          Ajak Livia <span>✧</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Bottom Section - Text */}
                    <div>
                      <h3 className={`font-black font-display text-2xl md:text-[32px] leading-[1.1] mb-3 md:mb-4 tracking-tight ${
                        isLocked ? 'text-gray-400' : 'text-[#5c4d47] group-hover:text-[#ff758c]'
                      } transition-colors duration-300`}>
                        {loc.name}
                      </h3>
                      {isLocked ? (
                        <p className="text-[10px] md:text-sm font-bold flex items-center gap-1.5 md:gap-2 text-red-500 bg-white/90 backdrop-blur-md px-3 md:px-4 py-2 rounded-xl inline-flex w-max shadow-sm border border-red-100">
                          <Lock size={14} className="md:w-4 md:h-4" /> {lockedReason}
                        </p>
                      ) : (
                        <p className="text-xs md:text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 flex items-center gap-2 text-[#8C7B6B]">
                          Berangkat sekarang <span className="animate-bounce-x text-[#ff758c]">→</span>
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )})}
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default function DatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center text-pink-400 font-bold">Memuat...</div>}>
      <DateContent />
    </Suspense>
  );
}
