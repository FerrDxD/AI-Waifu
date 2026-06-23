'use client';

import { useState } from 'react';
import DialogBox from '../livia/DialogBox';
import LiviaSprite from '../livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface VNSceneProps {
  onComplete: () => void;
}

type Choice = {
  text: string;
  nextIndex: number;
};

type Scene = {
  speaker: string;
  text: string;
  expression: LiviaExpression;
  choices?: Choice[];
  nextIndex?: number;
};

const SCENES: Scene[] = [
  // 0
  { 
    speaker: 'Narator', 
    text: 'Sebuah pesan masuk dari nomor tak dikenal.', 
    expression: 'normal',
  },
  // 1
  { 
    speaker: 'Livia', 
    text: 'Hei. Kamu yang bakal bantu aku pindahan, kan? Ibu yang suruh aku minta tolong.', 
    expression: 'normal' 
  },
  // 2
  { 
    speaker: 'Livia', 
    text: 'Bukan berarti aku mau, ya. Aku bisa urus sendiri. Tapi... yah, terima kasih.', 
    expression: 'angry',
    choices: [
      { text: "Sama-sama. Senang bisa bantu tetangga baru.", nextIndex: 3 },
      { text: "Tumben orang sepertimu bisa bilang terima kasih.", nextIndex: 4 },
      { text: "Buat cewek manis sepertimu, apa sih yang enggak.", nextIndex: 5 },
      { text: "Secara fisik, bawa barang pindahan sendirian memang tidak efisien.", nextIndex: 6 }
    ]
  },
  // 3 (Branch Normal)
  {
    speaker: 'Livia',
    text: 'B-baguslah kalau kamu paham! Ayo cepetan beres-beres sebelum aku berubah pikiran.',
    expression: 'blushing',
    nextIndex: 7
  },
  // 4 (Branch Satire)
  {
    speaker: 'Livia',
    text: 'Ya ampun! Nyesel aku bilang gitu. Mending kutarik lagi aja ucapan terima kasihnya!',
    expression: 'angry',
    nextIndex: 7
  },
  // 5 (Branch Flirty)
  {
    speaker: 'Livia',
    text: 'J-jangan ngomong yang aneh-aneh deh! I-ini cuma formalitas aja tau! Dasar aneh...',
    expression: 'blushing',
    nextIndex: 7
  },
  // 6 (Branch Logic)
  {
    speaker: 'Livia',
    text: 'Terserah dengan teori efisiensimu itu! Intinya cepetan bantu aku angkat barangnya!',
    expression: 'angry',
    nextIndex: 7
  },
  // 7
  { 
    speaker: 'Narator', 
    text: 'Begitulah pertama kali kamu mengenal Livia Einhart. Gadis yang akan jadi teman kosmu.', 
    expression: 'normal' 
  },
  // 8
  { 
    speaker: 'Livia', 
    text: 'Oke, kita mulai dari barang-barangku. Aku nggak bisa bawa semuanya — koper aku cuma muat lima barang. Bantu aku milih, ya.', 
    expression: 'happy' 
  },
];

export default function VNScene({ onComplete }: VNSceneProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [spriteVisible, setSpriteVisible] = useState(true);

  const scene = SCENES[currentScene];

  const advanceScene = (targetIndex: number) => {
    const nextScene = SCENES[targetIndex];
    if (!nextScene) {
      onComplete();
      return;
    }

    const expressionChanging = nextScene.expression !== scene.expression;
    
    if (expressionChanging) {
      setSpriteVisible(false);
      setTimeout(() => {
        setCurrentScene(targetIndex);
        setSpriteVisible(true);
      }, 200);
    } else {
      setCurrentScene(targetIndex);
    }
  };

  const handleNext = () => {
    if (scene.choices) return; // Wait for choice to be clicked
    const target = scene.nextIndex !== undefined ? scene.nextIndex : currentScene + 1;
    advanceScene(target);
  };

  const handleChoice = (choice: Choice) => {
    advanceScene(choice.nextIndex);
  };

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden bg-pink-50">
      {/* Visual Novel Bright Background */}
      <img 
        src="/bg_onboarding.webp"
        alt="Room Background"
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-all duration-[3000ms] ease-out",
          scene.speaker === 'Narator' ? "scale-105 blur-[2px] opacity-80" : "scale-100 blur-0 opacity-100"
        )}
      />

      {/* Cheerful Sun-kissed Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{ 
          background: 'radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(255,182,193,0.3) 100%)',
          boxShadow: 'inset 0 0 100px rgba(255,255,255,0.4)'
        }}
      />

      {/* Sweet emotional glow overlays */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 z-10 mix-blend-screen"
        style={{ 
          background: scene.expression === 'angry' 
            ? 'radial-gradient(ellipse at 50% 80%, rgba(255,120,120,0.3) 0%, transparent 70%)'
            : scene.expression === 'blushing'
            ? 'radial-gradient(ellipse at 50% 80%, rgba(255,182,193,0.4) 0%, transparent 70%)'
            : scene.expression === 'happy'
            ? 'radial-gradient(ellipse at 50% 80%, rgba(255,223,150,0.4) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.2) 0%, transparent 70%)'
        }}
      />

      {/* Skip button */}
      <div className="absolute top-6 right-4 md:right-8 z-30">
        <button 
          onClick={onComplete}
          className="text-gray-400 hover:text-[#ff758c] font-display font-bold px-3 md:px-4 py-2 text-xs md:text-sm tracking-widest uppercase transition-colors bg-white/50 backdrop-blur-sm rounded-full"
        >
          Lewati 
        </button>
      </div>

      {/* Sprite area */}
      <div className="flex-1 flex justify-center items-end relative z-20 pb-10 md:pb-0">
        <div 
          className="transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ 
            opacity: scene.speaker === 'Narator' ? 0 : (spriteVisible ? 1 : 0),
            transform: scene.speaker === 'Narator' 
              ? 'translateY(40px) scale(0.95)' 
              : spriteVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
            filter: scene.speaker === 'Narator' ? 'blur(8px) brightness(1.2)' : 'none',
          }}
        >
          <LiviaSprite 
            expression={scene.expression} 
            className="h-[65vh] md:h-[80vh] w-auto object-contain drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)]"
          />
        </div>
      </div>

      {/* Dialog box & Choices */}
      <div className="relative z-30 pb-6 md:pb-12 px-4 md:px-8 w-full flex flex-col items-center">
        
        {/* Branching Choices Overlay */}
        {scene.choices && (
          <div className="absolute bottom-[100%] mb-4 flex flex-col gap-3 w-full max-w-lg animate-[fadeIn_0.4s_ease-out_forwards]">
            {scene.choices.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => handleChoice(choice)}
                className="w-full bg-white/95 backdrop-blur-md border-2 border-pink-100 py-3 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl shadow-[0_10px_25px_rgba(255,117,140,0.15)] text-[#5c4d47] font-bold font-display hover:border-[#ff758c] hover:text-[#ff758c] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(255,117,140,0.2)] transition-all duration-300 text-center text-base md:text-lg active:scale-95"
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}

        <div className="w-full max-w-4xl">
          <DialogBox 
            text={scene.text} 
            speaker={scene.speaker === 'Narator' ? '' : scene.speaker} 
            onNext={scene.choices ? () => {} : handleNext} 
          />
        </div>
      </div>
    </div>
  );
}