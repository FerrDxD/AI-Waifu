'use client';

import React, { useState, useEffect } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { Shirt, CheckCircle2, Lock } from 'lucide-react';
import Link from 'next/link';

const ALL_OUTFITS = [
  { id: 'default', name: 'Baju Biasa', emoji: '👕', desc: 'Pakaian sehari-hari Livia.' },
  { id: 'outfit_casual', name: 'Baju Santai', emoji: '👚', desc: 'Pakaian ganti untuk bersantai di kamar.' },
  { id: 'trench_coat', name: 'Trench Coat', emoji: '🧥', desc: 'Sempurna untuk musim dingin atau pulang kampung.' },
  { id: 'outfit_school', name: 'Seragam SMA', emoji: '🎀', desc: 'Seragam sekolah bergaya pelaut.' },
  { id: 'outfit_yukata', name: 'Yukata Festival', emoji: '👘', desc: 'Pakaian tradisional untuk pergi ke festival.' },
  { id: 'gaun_pengantin', name: 'Gaun Pengantin', emoji: '👗', desc: 'Gaun putih suci untuk hari paling istimewa.' },
];

export default function WardrobePage() {
  const [activeOutfit, setActiveOutfit] = useState<string>('default');
  const [ownedOutfits, setOwnedOutfits] = useState<string[]>(['default']);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Lemari pakaianku. Jangan lama-lama milihnya!");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    const swipeThreshold = 50;

    if (diff > swipeThreshold) {
      setIsMobileMenuOpen(true);
    } else if (diff < -swipeThreshold) {
      setIsMobileMenuOpen(false);
    }
    setTouchStart(null);
  };

  useEffect(() => {
    const fetchWardrobe = async () => {
      try {
        const res = await fetch('/api/outfit');
        if (res.ok) {
          const data = await res.json();
          setActiveOutfit(data.activeOutfit || 'default');
          const items = data.itemsBrought || [];
          setOwnedOutfits(['default', ...items.filter((i: string) => i.startsWith('outfit_') || i === 'trench_coat' || i === 'gaun_pengantin')]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWardrobe();
  }, []);

  const changeOutfit = async (outfitId: string) => {
    if (!ownedOutfits.includes(outfitId)) {
      setMessage("Kamu belum beliin aku baju itu!");
      return;
    }

    try {
      const res = await fetch('/api/outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outfitId }),
      });
      
      if (res.ok) {
        setActiveOutfit(outfitId);
        if (outfitId === 'default') setMessage("Baju biasa memang paling nyaman.");
        else if (outfitId === 'outfit_casual') setMessage("Baju ini nyaman banget lho buat nyantai di kamar.");
        else if (outfitId === 'trench_coat') setMessage("Hangat... tapi pelukanmu pasti lebih hangat.");
        else if (outfitId === 'outfit_school') setMessage("P-pakaian ini... agak ketat di bagian dada. Jangan mikir macem-macem ya!");
        else if (outfitId === 'outfit_yukata') setMessage("Yukata ini... bagus kan? B-bukan berarti aku dandan buat kamu ya! Cuma pengen pakai aja.");
        else if (outfitId === 'gaun_pengantin') setMessage("A-aku jadi malu dilihatin terus... Aku cantik kan jadi istrimu?");
        else setMessage("Gimana penampilanku? B-biasa aja kan?");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center font-display font-bold text-pink-400">Membuka Lemari...</div>;

  return (
    <div 
      className="h-[100dvh] w-full bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-[30%_center] md:bg-center opacity-40 transition-all duration-1000"
        style={{ backgroundImage: "url('/bg/wardrobe-bg.webp')" }} 
      />

      {/* Screen VFX Overlays */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 mix-blend-screen opacity-60"
        style={{ background: 'radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.3) 0%, transparent 70%)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/10 pointer-events-none z-0" />

      {/* Center Character (Full Screen) */}
      <div className="absolute inset-0 pointer-events-none z-10 pb-0 overflow-hidden">
        <LiviaSprite 
          expression="normal" 
          outfit={activeOutfit}
          variant="wardrobe"
          disableFloat={true}
          className="w-full h-full"
          imgClassName="object-cover object-[30%_center] md:object-center drop-shadow-[0_20px_40px_rgba(255,117,140,0.15)] transition-all duration-300"
        />
      </div>

      {/* Floating Back Button & Title */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-30 flex items-center gap-3">
        <Link href="/home" className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white/50 backdrop-blur-md rounded-full text-pink-600 hover:bg-[#ff758c] hover:text-white transition-all shadow-lg hover:scale-105 active:scale-95 border border-white/50">
          <span className="text-lg md:text-xl font-black">←</span>
        </Link>
        <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 flex items-center gap-2">
          <Shirt className="text-[#ff758c] w-4 h-4 md:w-5 md:h-5" />
          <h1 className="text-sm md:text-base font-display font-black text-[#5c4d47] uppercase tracking-wider mt-0.5">Lemari</h1>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col md:flex-row pt-16 md:pt-20 z-10 relative h-full overflow-hidden">
        
        {/* Left Side: Layout spacing & Reaction Bubble */}
        <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-end relative z-20 pointer-events-none pb-8 md:pb-12">
          {/* Reaction Bubble - Moved to Bottom */}
          <div className={`bg-white/95 backdrop-blur-xl rounded-2xl rounded-bl-sm p-4 md:p-6 shadow-2xl border-l-4 border-[#ff758c] w-[90%] md:w-[85%] max-w-md pointer-events-auto transition-all duration-300 md:translate-x-0 md:self-start md:ml-8 mt-auto ${
            isMobileMenuOpen ? 'opacity-0 md:opacity-100 scale-95 md:scale-100' : 'opacity-100 scale-100'
          }`}>
            <p className="text-sm md:text-base font-bold text-[#5c4d47] leading-relaxed">
              <span className="text-pink-400 mr-2">Livia:</span>"{message}"
            </p>
          </div>
          
          {/* Mobile Swipe Hint */}
          <div className={`md:hidden mt-4 bg-black/40 text-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium animate-bounce pointer-events-auto flex items-center gap-2 transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>
            <span>👈 Swipe untuk buka lemari</span>
          </div>
        </div>

        {/* Right Side: Outfits List (Bang Dream Style) */}
        {/* Overlay for mobile */}
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`} 
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        <div className={`absolute right-0 top-0 w-[85%] sm:w-[60%] md:w-1/2 h-full md:relative flex flex-col pt-20 md:pt-24 pb-32 px-4 md:px-12 overflow-y-auto hide-scrollbar z-30 items-end transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-[120%] md:translate-x-0'
        }`}>
          
          {/* Header */}
          <div className="w-full max-w-[450px] mb-6 pl-6 self-center md:self-end">
            <div className="inline-block bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black font-display text-lg md:text-xl px-8 py-2 rounded-r-full shadow-[0_4px_15px_rgba(244,114,182,0.4)] border-l-4 border-white -skew-x-12 relative overflow-hidden">
              <div className="absolute top-0 left-1/4 w-12 h-full bg-white/20 skew-x-12 mix-blend-overlay" />
              <div className="skew-x-12 flex items-center gap-3">
                Koleksi Baju
                <span className="bg-white text-pink-500 text-xs px-2 py-0.5 rounded-full shadow-inner font-sans">
                  {ownedOutfits.length} / {ALL_OUTFITS.length}
                </span>
              </div>
            </div>
          </div>

          {/* List Items */}
          <div className="flex flex-col gap-4 md:gap-5 w-full max-w-[450px] self-center md:self-end">
            {ALL_OUTFITS.map((outfit, index) => {
              const isOwned = ownedOutfits.includes(outfit.id);
              const isActive = activeOutfit === outfit.id;
              
              return (
                <div 
                  key={outfit.id}
                  onClick={() => isOwned && changeOutfit(outfit.id)}
                  className={`relative w-full h-[85px] md:h-[100px] transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'md:-translate-x-8 -translate-x-4 scale-[1.02] z-10' 
                      : isOwned 
                        ? 'hover:-translate-x-2 opacity-95 hover:opacity-100 z-0'
                        : 'opacity-50 grayscale cursor-not-allowed z-0'
                  }`}
                >
                  {/* Outer Slanted Container */}
                  <div className={`absolute inset-0 -skew-x-12 rounded-xl border-2 shadow-xl overflow-hidden transition-colors duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 border-white shadow-pink-500/40' 
                      : 'bg-white/80 backdrop-blur-sm border-white/50 shadow-black/5'
                  }`}>
                    {/* Active Highlight Effect */}
                    {isActive && (
                      <>
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-20" />
                        <div className="absolute top-0 left-0 w-24 h-full bg-white/20 skew-x-12 -ml-10" />
                        <div className="absolute top-0 left-0 w-2 h-full bg-white/40" />
                      </>
                    )}
                    
                    {!isActive && isOwned && (
                      <div className="absolute top-0 left-0 w-2 h-full bg-pink-300" />
                    )}
                    {!isOwned && (
                      <div className="absolute top-0 left-0 w-2 h-full bg-gray-400" />
                    )}
                  </div>

                  {/* Inner Content (Skewed Back to Straight) */}
                  <div className="absolute inset-0 skew-x-12 flex items-center px-4 md:px-6">
                    {/* Icon Box */}
                    <div className={`w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-xl flex items-center justify-center text-2xl md:text-3xl shadow-inner border transition-colors duration-300 ${
                      isActive ? 'bg-white/20 border-white/40 text-white' : 'bg-gray-50 border-gray-100'
                    }`}>
                      {outfit.emoji}
                    </div>
                    
                    {/* Texts */}
                    <div className="ml-4 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-black font-display text-base md:text-xl truncate transition-colors duration-300 ${
                          isActive ? 'text-white drop-shadow-md' : 'text-[#5c4d47]'
                        }`}>
                          {outfit.name}
                        </h3>
                        {!isOwned && <Lock className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />}
                      </div>
                      <p className={`text-[10px] md:text-sm font-medium truncate mt-0.5 transition-colors duration-300 ${
                        isActive ? 'text-pink-50' : 'text-gray-500'
                      }`}>
                        {outfit.desc}
                      </p>
                    </div>

                    {/* Active Label */}
                    {isActive && (
                      <div className="shrink-0 ml-1">
                        <div className="bg-white text-pink-500 text-[9px] md:text-xs font-black uppercase tracking-widest px-2 md:px-3 py-1 md:py-1.5 rounded-full shadow-lg flex items-center gap-1 border-2 border-pink-100">
                          <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" /> ON
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
