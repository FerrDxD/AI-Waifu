'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VNScene from '@/components/onboarding/VNScene';
import PackingGame from '@/components/onboarding/PackingGame';
import DialogBox from '@/components/livia/DialogBox';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';

type OnboardingStage = 'intro' | 'packing' | 'dialog';

export default function OnboardingPage() {
  const router = useRouter();
  const [stage, setStage] = useState<OnboardingStage>('intro');
  const [itemsBrought, setItemsBrought] = useState<string[]>([]);
  const [dialogIndex, setDialogIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const handlePackingComplete = (items: string[]) => {
    setItemsBrought(items);
    setStage('dialog');
  };

  const getDialogs = () => {
    const dialogs: { text: string, expression: LiviaExpression }[] = [];
    
    if (itemsBrought.includes('teddy_bear')) {
      dialogs.push({ text: "Eh, kamu masukin boneka beruang itu? ...Jangan salah paham! Aku cuma bawa karena udah kebiasaan dari kecil.", expression: 'clingy' });
    } else if (itemsBrought.includes('makeup')) {
      dialogs.push({ text: "Set make up? Tentu saja aku harus bawa itu. Penampilan di kampus kota besar itu penting.", expression: 'normal' });
    } else {
      dialogs.push({ text: "Oke. Pilihan barang yang... lumayan. Koperku udah ditutup rapi sekarang.", expression: 'normal' });
    }
    
    dialogs.push({ text: "Maaf ya tadi sempat bawel. Makasih udah bantuin packing... Ayo kita pamit ke Ibu dan berangkat ke stasiun.", expression: 'pleased' });
    dialogs.push({ text: "Kota besar dan kamar kos baru kita... Semoga semuanya berjalan lancar ya, tetangga.", expression: 'happy' });
    
    return dialogs;
  };

  const dialogs = getDialogs();

  const handleNextDialog = async () => {
    if (dialogIndex < dialogs.length - 1) {
      setDialogIndex(prev => prev + 1);
    } else {
      setLoading(true);
      try {
        await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemsBrought }),
        });
        router.push('/home');
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1816] relative flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Background Layer for final dialog */}
      {stage === 'dialog' && (
        <div className="absolute inset-0 z-0 animate-[fadeIn_1s_ease-out_forwards]">
          <img 
            src="/bg_story-8.12.webp"
            alt="Room Background Final"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] ease-linear hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c1816] via-[#1c1816]/40 to-transparent" />
          {/* Subtle GF2-style grid or vignette */}
          <div className="absolute inset-0 bg-[url('/bg/grid.webp')] opacity-10 mix-blend-overlay pointer-events-none" />
          <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-pink-300 z-10 pointer-events-none opacity-50" />
          <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-pink-300 z-10 pointer-events-none opacity-50" />
        </div>
      )}
      
      <div className="z-10 w-full h-full flex-1 flex flex-col">
        {stage === 'intro' && <VNScene onComplete={() => setStage('packing')} />}
        
        {stage === 'packing' && (
          <div className="w-full h-screen flex flex-col justify-center animate-[fadeIn_0.5s_ease-out_forwards] bg-[#fdfbf7] relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-white z-0" />
            <div className="absolute top-0 right-0 w-[50%] h-full bg-[#ff758c] opacity-5 transform translate-x-1/4 -skew-x-12 z-0" />
            <PackingGame onComplete={handlePackingComplete} />
          </div>
        )}
        
        {stage === 'dialog' && (
          <div className="relative w-full h-screen flex flex-col justify-end pb-12 px-8 overflow-hidden animate-[fadeIn_0.5s_ease-out_forwards]">
            {/* Livia Sprite */}
            <div className="absolute inset-0 flex items-end justify-center pointer-events-none z-10 pb-0">
              <div className="h-[55vh] md:h-[60vh] landscape:h-[70vh] aspect-[2/3] w-full max-w-[600px] animate-[float_4s_ease-in-out_infinite] drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)]">
                <LiviaSprite 
                  expression={dialogs[dialogIndex].expression} 
                  variant="story"
                  chapterId={0}
                  className="h-full w-full max-w-[600px]"
                  imgClassName="object-contain object-bottom scale-[1.5] md:scale-[1.75] translate-y-[10%] md:translate-y-[15%] transition-opacity duration-300"
                />
              </div>
            </div>
            
            {/* VN Dialog Box */}
            <div className="w-full max-w-5xl mx-auto z-30">
              <DialogBox 
                text={loading ? 'Memuat Sistem...' : dialogs[dialogIndex].text} 
                speaker="Livia" 
                onNext={loading ? undefined : handleNextDialog} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
