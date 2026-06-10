'use client';

import { useState, useEffect } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { Shirt, CheckCircle2, Lock } from 'lucide-react';
import Link from 'next/link';

const ALL_OUTFITS = [
  { id: 'default', name: 'Baju Biasa', emoji: '👕', desc: 'Pakaian sehari-hari Livia.' },
  { id: 'outfit_casual', name: 'Baju Santai', emoji: '👚', desc: 'Pakaian ganti untuk bersantai di kamar.' },
  { id: 'outfit_maid', name: 'Baju Maid', emoji: '👗', desc: 'Kostum pelayan klasik bergaya prancis.' },
  { id: 'outfit_school', name: 'Seragam SMA', emoji: '🎀', desc: 'Seragam sekolah bergaya pelaut.' },
  { id: 'outfit_swimsuit', name: 'Baju Renang', emoji: '🩱', desc: 'Satu set baju renang cantik.' },
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
        else if (outfitId === 'outfit_maid') setMessage("B-baju ini... aneh nggak sih? Jangan ngeliatin terus dong!");
        else if (outfitId === 'outfit_casual') setMessage("Baju santai. Cocok buat rebahan di kasur.");
        else if (outfitId === 'outfit_school') setMessage("Seragam sekolah? Kamu ada-ada aja. Tapi... makasih.");
        else if (outfitId === 'outfit_swimsuit') setMessage("I-ini kan baju renang! K-kamu nyuruh aku pakai ini sekarang?! M-mesum!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center font-display font-bold text-pink-400">Membuka Lemari...</div>;

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
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

      <div className="flex-1 w-full mx-auto flex flex-col-reverse md:flex-row pt-16 md:pt-24 px-4 md:px-6 z-10 relative h-[100dvh]">
        
        {/* Left Side: Outfits List (Bottom on mobile) */}
        <div className="w-full md:w-[45%] h-[45%] md:h-full flex flex-col gap-2 md:gap-4 py-4 md:py-6 overflow-y-auto hide-scrollbar z-20">
          <h2 className="text-lg md:text-xl font-display font-bold text-[#5c4d47] mb-1 md:mb-2 flex items-center gap-2">
            Koleksi Baju <span className="text-xs md:text-sm text-pink-400 bg-pink-50 px-2 md:px-3 py-0.5 md:py-1 rounded-full">{ownedOutfits.length} / {ALL_OUTFITS.length}</span>
          </h2>
          
          <div className="grid grid-cols-1 gap-3 md:gap-4 pb-6">
            {ALL_OUTFITS.map(outfit => {
              const isOwned = ownedOutfits.includes(outfit.id);
              const isActive = activeOutfit === outfit.id;
              
              return (
                <div 
                  key={outfit.id}
                  onClick={() => isOwned && changeOutfit(outfit.id)}
                  className={`relative bg-white/95 md:bg-white rounded-2xl md:rounded-3xl p-3 md:p-5 border-2 transition-all duration-300 flex items-center gap-3 md:gap-5 ${
                    isActive ? 'border-[#ff758c] shadow-[0_10px_20px_rgba(255,117,140,0.15)] bg-pink-50/30' 
                    : isOwned ? 'border-transparent hover:border-pink-200 hover:shadow-md cursor-pointer'
                    : 'border-transparent opacity-60 grayscale cursor-not-allowed'
                  }`}
                >
                  <div className={`w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-inner ${isActive ? 'bg-gradient-to-br from-[#ff758c] to-[#ffb199] text-white' : 'bg-gray-100'}`}>
                    {outfit.emoji}
                  </div>
                  
                  <div className="flex-1 pr-6 md:pr-12">
                    <h3 className="font-bold font-display text-[#5c4d47] text-sm md:text-lg flex items-center gap-1.5 md:gap-2">
                      {outfit.name}
                      {!isOwned && <Lock className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />}
                    </h3>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium mt-0.5 md:mt-1 leading-snug">{outfit.desc}</p>
                  </div>

                  {isActive && (
                    <div className="absolute right-3 md:right-6">
                      <CheckCircle2 className="w-5 h-5 md:w-8 md:h-8 text-[#ff758c]" />
                    </div>
                  )}
                  {!isOwned && (
                    <div className="absolute right-3 md:right-6 text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest text-right max-w-[50px] md:max-w-none">
                      Beli di Toko
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Preview (Top on mobile) */}
        <div className="flex-1 w-full md:w-auto flex flex-col items-center justify-end relative h-[55%] md:h-[85vh] z-10 -mb-4 md:mb-0">
          {/* Reaction Bubble */}
          <div className="absolute top-[5%] md:top-[10%] left-1/2 -translate-x-1/2 bg-white/95 md:bg-white/90 backdrop-blur-xl rounded-[2rem] rounded-br-xl md:rounded-br-sm p-4 md:p-6 shadow-2xl border-2 border-pink-100 w-[85%] md:w-auto max-w-[300px] animate-[float_4s_ease-in-out_infinite] z-30">
            <p className="text-sm md:text-lg font-bold text-[#5c4d47] leading-relaxed text-center">
              "{message}"
            </p>
          </div>

          {/* Pedestal/Mirror base effect */}
          <div className="absolute bottom-0 w-64 md:w-96 h-12 md:h-20 bg-[radial-gradient(ellipse_at_center,rgba(255,117,140,0.2)_0%,transparent_70%)] rounded-[100%] blur-md z-0" />

          {/* Sprite Preview */}
          <LiviaSprite 
            expression="normal" 
            outfit={activeOutfit}
            className="h-full object-contain object-bottom drop-shadow-[0_20px_40px_rgba(255,117,140,0.15)] z-10 transition-all duration-500 md:hover:scale-[1.02]"
          />
        </div>

      </div>
    </div>
  );
}
