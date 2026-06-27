'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Power, Moon, Sun, Battery } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';

export default function BedroomPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLightOn, setIsLightOn] = useState(true);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [expression, setExpression] = useState<LiviaExpression>('normal');
  const [isSleeping, setIsSleeping] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/affection')
      .then(r => r.json())
      .then(d => {
        setStats(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const handleToggleLight = async () => {
    if (loading || !stats) return;

    const newLightState = !isLightOn;
    setIsLightOn(newLightState);

    const energy = stats.liviaEnergy || 0;

    if (!newLightState) {
      // Light turned OFF
      if (energy <= 15) {
        setDialogue("Zzz... mmm...");
        setExpression('happy');
        setIsSleeping(true);
        // Call API to restore energy
        try {
          await fetch('/api/bedroom/sleep', { method: 'POST' });
          setStats((prev: any) => ({ ...prev, liviaEnergy: 100 }));
        } catch(e) {
          console.error(e);
        }
      } else if (energy > 15 && energy <= 60) {
        setDialogue("H-hei! Kenapa dimatiin?! K-kamu nggak mikir macem-macem kan?!");
        setExpression('blushing');
      } else {
        setDialogue("Heh! Gelap tau! Aku belum ngantuk, nyalain lampunya!");
        setExpression('angry');
      }
    } else {
      // Light turned ON
      if (isSleeping) {
        setDialogue("Nghh... silau... apaan sih... bentar lagi ah...");
        setExpression('angry');
        setIsSleeping(false);
      } else {
        setDialogue("Nah gitu dong, terang.");
        setExpression('normal');
      }
    }
  };

  if (loading) {
    return <LoadingScreen text="Memasuki Kamar Livia..." />;
  }

  const energy = stats?.liviaEnergy || 0;

  return (
    <div className={`min-h-[100dvh] w-full relative flex flex-col items-center justify-end overflow-hidden transition-all duration-1000 ${isLightOn ? 'bg-[#f4ebd8]' : 'bg-[#151b2b]'}`}>
      
      {/* 1. WALLPAPER & BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Striped Wallpaper */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isLightOn ? 'opacity-30' : 'opacity-5'}`} style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(213, 195, 170, 0.2) 40px, rgba(213, 195, 170, 0.2) 80px)' }} />
        
        {/* Dark Overlay for Night Mode */}
        <div className={`absolute inset-0 bg-blue-900/40 mix-blend-multiply transition-opacity duration-1000 ${isLightOn ? 'opacity-0' : 'opacity-100'}`} />
      </div>

      {/* 2. THE WINDOW (Arched, Center) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-64 h-80 border-8 border-white rounded-t-full shadow-[0_10px_30px_rgba(0,0,0,0.1)] overflow-hidden z-0 transition-colors duration-1000 bg-white">
        {/* Sky */}
        <div className={`absolute inset-0 transition-colors duration-1000 ${isLightOn ? 'bg-gradient-to-b from-sky-300 to-sky-100' : 'bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-800'}`}>
          
          {/* Day Elements */}
          <div className={`absolute inset-0 transition-opacity duration-1000 ${isLightOn ? 'opacity-100' : 'opacity-0'}`}>
            <Sun className="absolute top-6 right-6 text-yellow-300 w-16 h-16 animate-[spin_20s_linear_infinite]" fill="currentColor" />
            {/* Clouds */}
            <div className="absolute top-20 left-4 w-16 h-6 bg-white/80 rounded-full blur-[2px]" />
            <div className="absolute top-12 left-10 w-12 h-6 bg-white/80 rounded-full blur-[2px]" />
          </div>

          {/* Night Elements */}
          <div className={`absolute inset-0 transition-opacity duration-1000 ${!isLightOn ? 'opacity-100' : 'opacity-0'}`}>
            <Moon className="absolute top-8 left-8 text-yellow-100 w-12 h-12" fill="currentColor" />
            {/* Stars */}
            <div className="absolute top-6 right-10 w-1 h-1 bg-white rounded-full animate-ping" />
            <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-white rounded-full animate-ping" style={{ animationDelay: '1s' }} />
            <div className="absolute top-16 left-24 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
          </div>

        </div>
        {/* Window Pane Crossbars */}
        <div className="absolute top-0 bottom-0 left-1/2 w-2 bg-white -translate-x-1/2 z-10 shadow-sm" />
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-white -translate-y-1/2 z-10 shadow-sm" />
        {/* Glass Reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 z-20 pointer-events-none" />
      </div>

      {/* 3. TOP HEADER UI */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
        <Link 
          href="/home" 
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-[0_5px_15px_rgba(0,0,0,0.05)] group bg-white/90 backdrop-blur-md border border-white hover:bg-orange-50"
        >
          <ChevronLeft className="text-[#5c4d47] group-hover:-translate-x-1 transition-transform" />
        </Link>

        {/* Energy Status Bubble */}
        <div className="px-5 py-2 rounded-full flex items-center gap-3 shadow-[0_5px_20px_rgba(0,0,0,0.08)] bg-white/90 backdrop-blur-md border border-white">
          <Battery className={energy > 60 ? 'text-green-500' : energy > 20 ? 'text-orange-500' : 'text-red-500'} size={20} />
          <div className="flex flex-col">
            <span className="font-bold text-[#5c4d47] text-sm leading-none">Energi Livia</span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${energy > 60 ? 'text-green-500' : energy > 20 ? 'text-orange-500' : 'text-red-500'}`}>{energy}%</span>
          </div>
        </div>
      </div>

      {/* 4. LIGHT PULL CORD (Interactive) */}
      <div className="absolute top-0 right-12 md:right-32 h-[40vh] z-50 flex flex-col items-center group cursor-pointer" onClick={handleToggleLight}>
        {/* String */}
        <div className="w-1 h-full bg-gradient-to-b from-gray-400 to-gray-300 shadow-sm transition-all duration-300 group-active:translate-y-10" />
        {/* Handle */}
        <div className="w-6 h-10 bg-gradient-to-b from-orange-300 to-orange-400 rounded-b-full shadow-md border-b-4 border-orange-500 transition-all duration-300 group-active:translate-y-10 flex items-center justify-center">
          <Power size={12} className="text-white/80" />
        </div>
        <span className="absolute -bottom-8 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Tarik Sakelar</span>
      </div>

      {/* 5. THE BED (Background Prop) */}
      <div className="absolute bottom-16 md:bottom-24 left-4 md:left-20 w-[300px] h-40 z-10 transition-opacity duration-1000">
        {/* Headboard */}
        <div className="absolute bottom-0 left-0 w-24 h-48 bg-[#a8896c] rounded-t-3xl border-4 border-[#8b6b50]" />
        {/* Mattress */}
        <div className="absolute bottom-0 left-10 right-0 h-20 bg-pink-100 rounded-tr-3xl border-t-8 border-pink-200 shadow-xl" />
        {/* Pillow */}
        <div className="absolute bottom-20 left-16 w-20 h-10 bg-white rounded-full border-2 border-gray-100 shadow-sm -rotate-6" />
        {/* Blanket Fold */}
        <div className="absolute bottom-0 left-32 right-0 h-24 bg-rose-300 rounded-tl-full rounded-tr-xl shadow-lg border-t-4 border-rose-400" />
      </div>

      {/* 6. LIVIA SPRITE & DIALOGUE */}
      <div className={`relative z-20 flex flex-col items-center transition-all duration-1000 ${isLightOn ? 'opacity-100 drop-shadow-2xl' : isSleeping ? 'opacity-80 translate-y-24 scale-95 brightness-50' : 'opacity-90 brightness-75'}`}>
        
        {/* Dialogue Bubble */}
        <div className={`absolute -top-32 md:-top-40 w-[280px] z-30 transition-all duration-500 ${dialogue ? 'opacity-100 translate-y-0 scale-100 animate-[bounce_2s_ease-in-out_infinite]' : 'opacity-0 translate-y-10 scale-90 pointer-events-none'}`}>
          <div className="p-5 rounded-[2rem] rounded-br-sm shadow-[0_15px_30px_rgba(0,0,0,0.1)] border border-pink-100 bg-white relative">
            <p className="font-bold text-center text-[#5c4d47] text-[15px] leading-relaxed">{dialogue}</p>
            {/* Tail */}
            <div className="absolute -bottom-3 right-8 w-6 h-6 rotate-45 border-r border-b bg-white border-pink-100" />
          </div>
        </div>

        {/* The Sprite itself */}
        <div className="relative">
          <LiviaSprite 
            expression={expression} 
            outfit={stats?.activeOutfit || 'casual'} 
            className="w-[320px] md:w-[450px] h-auto" 
            disableFloat={isSleeping}
          />
          
          {/* Zzz Particles when sleeping */}
          {isSleeping && !isLightOn && (
            <>
              <div className="absolute top-10 right-10 text-white font-black text-4xl animate-[ping_3s_ease-in-out_infinite] drop-shadow-md">Z</div>
              <div className="absolute top-0 right-0 text-white font-black text-2xl animate-[ping_3s_ease-in-out_infinite] drop-shadow-md" style={{ animationDelay: '0.5s' }}>z</div>
              <div className="absolute -top-6 right-20 text-white font-black text-xl animate-[ping_3s_ease-in-out_infinite] drop-shadow-md" style={{ animationDelay: '1s' }}>z</div>
            </>
          )}
        </div>
      </div>

      {/* 7. WOODEN FLOOR */}
      <div className="w-full h-32 md:h-40 z-0 relative shadow-[inset_0_20px_20px_rgba(0,0,0,0.1)]">
        {/* Wood planks texture */}
        <div className={`absolute inset-0 transition-colors duration-1000 ${isLightOn ? 'bg-[#d2a679]' : 'bg-[#1a141b]'}`} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,0.1) 40px)' }}>
          {/* Vertical gaps for planks */}
          <div className="w-full h-full opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 99px, rgba(0,0,0,0.5) 100px)' }} />
        </div>
        {/* Shadow from Livia/Bed */}
        <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-[400px] h-20 bg-black/20 blur-xl rounded-[100%] transition-opacity duration-1000 ${isLightOn ? 'opacity-100' : 'opacity-50'}`} />
      </div>

    </div>
  );
}
