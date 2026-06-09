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
      dialogs.push({ text: "Eh, kamu masukin boneka itu? ...Jangan salah paham. Aku cuma penasaran aja.", expression: 'clingy' });
    } else if (itemsBrought.includes('makeup')) {
      dialogs.push({ text: "Set make up? Tentu saja aku bawa itu. Penampilan itu penting.", expression: 'normal' });
    } else {
      dialogs.push({ text: "Oke. Pilihan yang... lumayan. Ayo berangkat.", expression: 'normal' });
    }
    
    dialogs.push({ text: "Rumah baruku... Aku nggak bakal menyesal, kan?", expression: 'normal' });
    
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
    <div className="min-h-screen bg-pink-50 relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
      
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-0" />
      
      <div className="z-10 w-full max-w-5xl">
        {stage === 'intro' && <VNScene onComplete={() => setStage('packing')} />}
        
        {stage === 'packing' && <PackingGame onComplete={handlePackingComplete} />}
        
        {stage === 'dialog' && (
          <div className="flex flex-col items-center justify-between w-full h-[80vh] max-w-4xl mx-auto py-8">
            <div className="flex-1 w-full flex justify-center items-end pb-8">
              <div className="h-[400px] w-[300px]">
                <LiviaSprite expression={dialogs[dialogIndex].expression} />
              </div>
            </div>
            
            <div className="w-full">
              <DialogBox 
                text={loading ? 'Menyimpan...' : dialogs[dialogIndex].text} 
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
