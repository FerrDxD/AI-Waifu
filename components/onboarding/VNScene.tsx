'use client';

import { useState } from 'react';
import DialogBox from '../livia/DialogBox';
import LiviaSprite from '../livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface VNSceneProps {
  onComplete: () => void;
}

type Scene = {
  speaker: string;
  text: string;
  expression: LiviaExpression;
};

const SCENES: Scene[] = [
  { 
    speaker: 'Narator', 
    text: 'Sebuah pesan masuk dari nomor tak dikenal.', 
    expression: 'normal',
  },
  { 
    speaker: 'Livia', 
    text: 'Hei. Kamu yang bakal bantu aku pindahan, kan? Ibu yang suruh aku minta tolong.', 
    expression: 'normal' 
  },
  { 
    speaker: 'Livia', 
    text: 'Bukan berarti aku mau, ya. Aku bisa urus sendiri. Tapi... yah, terima kasih.', 
    expression: 'angry' 
  },
  { 
    speaker: 'Narator', 
    text: 'Begitulah pertama kali kamu mengenal Livia Einhart. Gadis yang akan jadi teman kosmu.', 
    expression: 'normal' 
  },
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
  const nextScene = SCENES[currentScene + 1];

  const handleNext = () => {
    const expressionChanging = nextScene && nextScene.expression !== scene.expression;
    
    if (expressionChanging) {
      setSpriteVisible(false);
      setTimeout(() => {
        if (currentScene < SCENES.length - 1) {
          setCurrentScene(prev => prev + 1);
        } else {
          onComplete();
        }
        setSpriteVisible(true);
      }, 200);
    } else {
      if (currentScene < SCENES.length - 1) {
        setCurrentScene(prev => prev + 1);
      } else {
        onComplete();
      }
    }
  };

  return (
    <div 
      className="relative w-full h-screen flex flex-col overflow-hidden bg-pink-50"
    >
      {/* Visual Novel Bright Background */}
      <div 
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-out",
          scene.speaker === 'Narator' ? "scale-105 blur-[2px] opacity-80" : "scale-100 blur-0 opacity-100"
        )}
        style={{ 
          backgroundImage: "url('/bg/bedroom.png')",
        }} 
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

      {/* Scene counter (Cute dots) */}
      <div className="absolute top-8 right-10 z-20 flex gap-2.5">
        {SCENES.map((_, i) => (
          <div 
            key={i}
            className="w-3 h-3 rounded-full transition-all duration-500 ease-in-out"
            style={{ 
              background: i === currentScene ? '#ff9a9e' : 'rgba(255,255,255,0.5)',
              boxShadow: i === currentScene ? '0 0 12px rgba(255,154,158,0.8)' : '0 2px 4px rgba(0,0,0,0.1)',
              transform: i === currentScene ? 'scale(1.2)' : 'scale(1)'
            }}
          />
        ))}
      </div>

      {/* Auto / Skip / Log buttons (Pop UI) */}
      <div className="absolute top-6 left-8 z-30 flex gap-4">
        {['Log', 'Auto', 'Skip'].map((label) => (
          <button 
            key={label}
            onClick={label === 'Skip' ? onComplete : undefined}
            className="bg-white/80 hover:bg-white backdrop-blur-md text-pink-500 font-bold px-5 py-2 rounded-full shadow-sm hover:shadow-md transition-all text-sm tracking-wide border border-pink-100"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sprite area */}
      <div className="flex-1 flex justify-center items-end relative z-20">
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
            className="h-[80vh] w-auto object-contain drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)]"
          />
        </div>
      </div>

      {/* Dialog box */}
      <div className="relative z-30 pb-12 px-8 w-full">
        <DialogBox 
          text={scene.text} 
          speaker={scene.speaker === 'Narator' ? '' : scene.speaker} 
          onNext={handleNext} 
        />
      </div>
    </div>
  );
}