'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, ShoppingBag, Coffee, TreePine, Book, Gamepad2, Soup, UtensilsCrossed, Landmark, Ticket, Camera, Music, Waves, Lock } from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import DialogBox from '@/components/livia/DialogBox';
import { LiviaExpression } from '@/lib/gemini';

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
  { id: 'kolam_renang', name: 'Kolam Renang', icon: <Waves size={32} />, color: 'bg-cyan-50 border-cyan-200 text-cyan-600', hover: 'hover:bg-cyan-100', requiredItem: 'outfit_swimsuit', requirementName: 'Baju Renang' },
];

type SceneLine = { speaker: string, text: string, expression?: LiviaExpression };

export default function DatePage() {
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scene, setScene] = useState<SceneLine[] | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [itemsBrought, setItemsBrought] = useState<string[]>([]);
  const [activeOutfit, setActiveOutfit] = useState<string>('default');

  useEffect(() => {
    fetch('/api/outfit').then(res => res.json()).then(data => {
      setItemsBrought(data.itemsBrought || []);
      setActiveOutfit(data.activeOutfit || 'default');
    }).catch(console.error);
  }, []);

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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextScene = () => {
    if (scene && sceneIndex < scene.length - 1) {
      setSceneIndex(prev => prev + 1);
    } else {
      setScene(null);
      setSelectedLoc(null);
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
              expression={scene[sceneIndex].expression || 'normal'} 
              outfit={activeOutfit}
              className="h-full max-h-[60vh] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)] animate-[float_4s_ease-in-out_infinite]" 
            />
          </div>
          
          <div className="w-full max-w-4xl z-20 drop-shadow-2xl relative flex flex-col items-center shrink-0 mt-4">
            <div className="w-full">
              <DialogBox 
                text={scene[sceneIndex].text}
                speaker={scene[sceneIndex].speaker === 'Narator' ? '' : scene[sceneIndex].speaker}
                onNext={handleNextScene}
              />
            </div>
          </div>
        </div>
      ) : (
        // Location Selection Mode (GeForce NOW Style Carousel)
        <div className="flex-1 max-w-[1400px] w-full mx-auto flex flex-col justify-center pt-20 md:pt-24 px-4 md:px-8 z-10 relative">
          
          <div className="mb-6 md:mb-10 pl-2 md:pl-4">
            <h1 className="text-3xl md:text-5xl font-display font-black text-[#5c4d47] mb-2 md:mb-3 drop-shadow-sm flex items-center gap-2 md:gap-4">
              <MapPin className="w-8 h-8 md:w-10 md:h-10 text-[#ff758c]" />
              Pilih Destinasi
            </h1>
            <p className="text-[#8C7B6B] font-medium text-sm md:text-xl">
              Ke mana kamu ingin mengajak Livia pergi hari ini?
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 animate-pulse bg-white/40 rounded-[3rem] backdrop-blur-sm border-4 border-white/60 mx-4">
              <div className="w-20 h-20 border-4 border-pink-200 border-t-[#ff758c] rounded-full animate-spin" />
              <p className="text-[#8C7B6B] font-bold font-display text-2xl">Livia sedang bersiap...</p>
            </div>
          ) : (
            <div className="flex gap-4 md:gap-6 pb-8 md:pb-12 overflow-x-auto snap-x snap-mandatory hide-scrollbar md:scrollbar-thin md:scrollbar-thumb-pink-200 md:scrollbar-track-transparent pr-4 md:pr-8 -mx-4 md:-mx-8 px-6 md:px-12">
              {LOCATIONS.map(loc => {
                const isLocked = loc.requiredItem && !itemsBrought.includes(loc.requiredItem);
                
                return (
                <button
                  key={loc.id}
                  onClick={() => !isLocked && startJalan(loc.name)}
                  disabled={!!isLocked}
                  className={`relative group flex-shrink-0 w-[240px] md:w-[280px] sm:w-[320px] h-[360px] md:h-[450px] rounded-[2rem] md:rounded-[2.5rem] border-4 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] snap-center overflow-hidden flex flex-col justify-end p-6 md:p-8 text-left ${
                    isLocked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed grayscale' : `${loc.color} ${loc.hover} hover:-translate-y-2 md:hover:-translate-y-4 hover:shadow-[0_25px_50px_rgba(255,117,140,0.2)] hover:border-pink-200 border-white/50`
                  }`}
                >
                  <div className={`absolute inset-0 bg-white/40 transition-colors z-0 duration-500 ${isLocked ? '' : 'group-hover:bg-transparent'}`} />
                  
                  {/* Big Icon Background */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] opacity-[0.07] transition-all duration-500 z-0 pointer-events-none group-hover:scale-110">
                    {loc.icon}
                  </div>
                  
                  <div className={`relative z-10 transition-transform duration-500 ease-out ${isLocked ? '' : 'translate-y-4 md:translate-y-6 group-hover:translate-y-0'}`}>
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg mb-4 md:mb-6 transition-transform duration-500 ${isLocked ? 'bg-gray-200 text-gray-400' : 'bg-white/90 backdrop-blur-md text-[#ff758c] group-hover:scale-110'}`}>
                      {isLocked ? <Lock size={24} className="w-5 h-5 md:w-7 md:h-7" /> : loc.icon}
                    </div>
                    <h3 className={`font-black font-display text-2xl md:text-3xl leading-tight mb-2 md:mb-3 ${isLocked && 'text-gray-500'}`}>
                      {loc.name}
                    </h3>
                    {isLocked ? (
                      <p className="text-[10px] md:text-sm font-bold flex items-center gap-1.5 md:gap-2 text-red-400 bg-red-50/80 px-2 md:px-3 py-1 md:py-1.5 rounded-lg inline-flex w-max">
                        <Lock size={12} className="md:w-3.5 md:h-3.5" /> Butuh: {loc.requirementName}
                      </p>
                    ) : (
                      <p className="text-xs md:text-base font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 flex items-center gap-1.5 md:gap-2">
                        Ayo Berangkat <span className="animate-bounce-x">→</span>
                      </p>
                    )}
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
