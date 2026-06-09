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
      <div className="absolute top-0 left-0 w-full h-20 bg-white/80 backdrop-blur-md shadow-sm z-30 flex justify-between items-center px-6 border-b border-pink-50">
        <div className="flex items-center gap-6">
          <Link href="/home" className="flex items-center justify-center w-12 h-12 bg-pink-50 rounded-full text-pink-600 hover:bg-[#ff758c] hover:text-white transition-colors">
            <span className="text-xl font-black">←</span>
          </Link>
          <div className="flex items-center gap-3">
            <Shirt className="text-[#ff758c] w-8 h-8" />
            <h1 className="text-3xl font-display font-black text-[#5c4d47] italic tracking-tight uppercase">Lemari Pakaian</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mx-auto flex flex-col md:flex-row pt-24 px-6 z-10 relative">
        
        {/* Left Side: Outfits List */}
        <div className="w-full md:w-[45%] flex flex-col gap-4 py-6 overflow-y-auto custom-scrollbar pr-4">
          <h2 className="text-xl font-display font-bold text-[#5c4d47] mb-2 flex items-center gap-2">
            Koleksi Baju <span className="text-sm text-pink-400 bg-pink-50 px-3 py-1 rounded-full">{ownedOutfits.length} / {ALL_OUTFITS.length}</span>
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {ALL_OUTFITS.map(outfit => {
              const isOwned = ownedOutfits.includes(outfit.id);
              const isActive = activeOutfit === outfit.id;
              
              return (
                <div 
                  key={outfit.id}
                  onClick={() => isOwned && changeOutfit(outfit.id)}
                  className={`relative bg-white rounded-3xl p-5 border-2 transition-all duration-300 flex items-center gap-5 ${
                    isActive ? 'border-[#ff758c] shadow-[0_10px_20px_rgba(255,117,140,0.15)] bg-pink-50/30' 
                    : isOwned ? 'border-transparent hover:border-pink-200 hover:shadow-md cursor-pointer'
                    : 'border-transparent opacity-60 grayscale cursor-not-allowed'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner ${isActive ? 'bg-gradient-to-br from-[#ff758c] to-[#ffb199] text-white' : 'bg-gray-100'}`}>
                    {outfit.emoji}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold font-display text-[#5c4d47] text-lg flex items-center gap-2">
                      {outfit.name}
                      {!isOwned && <Lock className="w-4 h-4 text-gray-400" />}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">{outfit.desc}</p>
                  </div>

                  {isActive && (
                    <div className="absolute right-6">
                      <CheckCircle2 className="w-8 h-8 text-[#ff758c]" />
                    </div>
                  )}
                  {!isOwned && (
                    <div className="absolute right-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Beli di Toko
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Preview */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-end relative h-[85vh]">
          {/* Reaction Bubble */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl rounded-[2rem] rounded-br-sm p-6 shadow-2xl border-2 border-pink-100 max-w-[300px] animate-[float_4s_ease-in-out_infinite] z-20">
            <p className="text-lg font-bold text-[#5c4d47] leading-relaxed text-center">
              "{message}"
            </p>
          </div>

          {/* Pedestal/Mirror base effect */}
          <div className="absolute bottom-0 w-96 h-20 bg-[radial-gradient(ellipse_at_center,rgba(255,117,140,0.2)_0%,transparent_70%)] rounded-[100%] blur-md z-0" />

          {/* Sprite Preview */}
          <LiviaSprite 
            expression="normal" 
            outfit={activeOutfit}
            className="h-[80vh] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(255,117,140,0.15)] z-10 transition-all duration-500 hover:scale-[1.02]"
          />
        </div>

      </div>
    </div>
  );
}
