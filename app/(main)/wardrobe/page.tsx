'use client';

import { useState, useEffect } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { Shirt, CheckCircle2, Lock } from 'lucide-react';
import Link from 'next/link';

const ALL_OUTFITS = [
  { id: 'default', name: 'Baju Biasa', emoji: '👕', desc: 'Pakaian sehari-hari Livia.' },
  { id: 'outfit_casual', name: 'Baju Santai', emoji: '👚', desc: 'Pakaian ganti untuk bersantai di kamar.' },
  { id: 'outfit_school', name: 'Seragam SMA', emoji: '🎀', desc: 'Seragam sekolah bergaya pelaut.' },
  { id: 'outfit_yukata', name: 'Yukata Festival', emoji: '👘', desc: 'Pakaian tradisional untuk pergi ke festival.' },
];

export default function WardrobePage() {
  const [activeOutfit, setActiveOutfit] = useState<string>('default');
  const [ownedOutfits, setOwnedOutfits] = useState<string[]>(['default']);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Lemari pakaianku. Jangan lama-lama milihnya!");

  useEffect(() => {
    const fetchWardrobe = async () => {
      try {
        const res = await fetch('/api/outfit');
        if (res.ok) {
          const data = await res.json();
          setActiveOutfit(data.activeOutfit || 'default');
          const items = data.itemsBrought || [];
          setOwnedOutfits(['default', ...items.filter((i: string) => i.startsWith('outfit_'))]);
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
        else if (outfitId === 'outfit_school') setMessage("P-pakaian ini... agak ketat di bagian dada. Jangan mikir macem-macem ya!");
        else if (outfitId === 'outfit_yukata') setMessage("Yukata ini... bagus kan? B-bukan berarti aku dandan buat kamu ya! Cuma pengen pakai aja.");
        else setMessage("Gimana penampilanku? B-biasa aja kan?");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center font-display font-bold text-pink-400">Membuka Lemari...</div>;

  return (
    <div className="h-[100dvh] w-full bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-[2px] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('/bg/bedroom.png')" }} />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#fdfbf7] via-transparent to-pink-50/50 pointer-events-none z-0" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full h-16 md:h-20 bg-white/80 backdrop-blur-md shadow-sm z-30 flex justify-between items-center px-4 md:px-6 border-b border-pink-50">
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/home" className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-pink-50 rounded-full text-pink-600 hover:bg-[#ff758c] hover:text-white transition-colors">
            <span className="text-lg md:text-xl font-black">←</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Shirt className="text-[#ff758c] w-6 h-6 md:w-8 md:h-8" />
            <h1 className="text-lg md:text-3xl font-display font-black text-[#5c4d47] italic tracking-tight uppercase">Lemari</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col md:flex-row pt-16 md:pt-20 z-10 relative h-full overflow-hidden">
        
        {/* Left Side: Sprite Preview (Fixed) */}
        <div className="w-full md:w-1/2 h-[45vh] md:h-full flex flex-col items-center justify-end relative z-10">
          {/* Reaction Bubble - Moved to Bottom */}
          <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-8 bg-white/95 backdrop-blur-xl rounded-2xl rounded-bl-sm p-4 md:p-6 shadow-2xl border-l-4 border-[#ff758c] w-[90%] md:w-[85%] max-w-md z-30">
            <p className="text-sm md:text-base font-bold text-[#5c4d47] leading-relaxed">
              <span className="text-pink-400 mr-2">Livia:</span>"{message}"
            </p>
          </div>

          {/* Pedestal/Mirror base effect */}
          <div className="absolute bottom-[-20px] w-[80%] md:w-[60%] h-12 md:h-20 bg-[radial-gradient(ellipse_at_center,rgba(255,117,140,0.2)_0%,transparent_70%)] rounded-[100%] blur-md z-0" />

          {/* Sprite Preview */}
          <LiviaSprite 
            expression="normal" 
            outfit={activeOutfit}
            variant="wardrobe"
            disableFloat={true}
            className="w-full h-full max-h-[65vh] md:max-h-[82vh] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(255,117,140,0.15)] z-10 transition-all duration-300 translate-y-4 md:translate-y-10"
          />
        </div>

        {/* Right Side: Outfits List (Scrollable, Project Sekai Style) */}
        <div className="w-full md:w-1/2 h-[55vh] md:h-full flex flex-col gap-3 md:gap-4 py-4 md:py-10 px-4 md:px-12 overflow-y-auto hide-scrollbar z-20 pb-32">
          <div className="sticky top-0 bg-gradient-to-b from-[#fdfbf7] to-transparent pb-4 z-30">
            <h2 className="text-xl md:text-2xl font-display font-black text-[#5c4d47] flex items-center gap-3 drop-shadow-sm">
              Koleksi Baju 
              <span className="text-sm font-bold text-white bg-gradient-to-r from-pink-400 to-rose-400 px-3 py-1 rounded-full shadow-md">
                {ownedOutfits.length} / {ALL_OUTFITS.length}
              </span>
            </h2>
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-xl mx-auto md:ml-0 md:mr-auto">
            {ALL_OUTFITS.map((outfit, index) => {
              const isOwned = ownedOutfits.includes(outfit.id);
              const isActive = activeOutfit === outfit.id;
              
              return (
                <div 
                  key={outfit.id}
                  onClick={() => isOwned && changeOutfit(outfit.id)}
                  className={`relative group bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300 transform ${
                    isActive 
                      ? 'border-l-[6px] border-[#ff758c] shadow-[0_15px_30px_rgba(255,117,140,0.2)] md:scale-105 ml-2 md:ml-6' 
                      : isOwned 
                        ? 'border-l-[6px] border-transparent hover:border-pink-300 hover:shadow-lg cursor-pointer hover:translate-x-2'
                        : 'border-l-[6px] border-transparent opacity-60 grayscale cursor-not-allowed'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${isActive ? 'from-pink-50/50 to-transparent' : 'from-transparent to-transparent'}`} />
                  
                  <div className="relative p-3 md:p-4 flex items-center gap-4 md:gap-6">
                    <div className={`w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-xl flex items-center justify-center text-3xl md:text-4xl shadow-inner transition-transform duration-300 ${isActive ? 'bg-gradient-to-br from-[#ff758c] to-[#ffb199] text-white scale-110' : 'bg-gray-100'}`}>
                      {outfit.emoji}
                    </div>
                    
                    <div className="flex-1 py-1">
                      <h3 className="font-black font-display text-[#5c4d47] text-base md:text-xl flex items-center gap-2">
                        {outfit.name}
                        {!isOwned && <Lock className="w-4 h-4 text-gray-400" />}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 font-medium mt-1 leading-snug">{outfit.desc}</p>
                    </div>

                    {isActive && (
                      <div className="shrink-0 pr-4 animate-[bounce-x_1s_infinite]">
                        <div className="bg-[#ff758c] text-white text-[10px] md:text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                          <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" /> Dipakai
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
