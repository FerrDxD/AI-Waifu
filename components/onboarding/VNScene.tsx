'use client';

import { useState, useEffect } from 'react';
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
  background?: string;
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
    expression: 'normal' 
  },
];

export default function VNScene({ onComplete }: VNSceneProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [visible, setVisible] = useState(true);
  const [spriteVisible, setSpriteVisible] = useState(true);

  const scene = SCENES[currentScene];
  const nextScene = SCENES[currentScene + 1];

  const handleNext = () => {
    // Fade out jika ekspresi akan berubah
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

    <div 
      className="relative w-full h-screen flex flex-col overflow-hidden bg-black"
    >
      {/* Visual Novel Background */}
      <div 
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-out",
          scene.speaker === 'Narator' ? "scale-105 blur-sm brightness-50" : "scale-100 blur-0 brightness-75"
        )}
        style={{ 
          backgroundImage: "url('/bg/bedroom.png')",
        }} 
      />

      {/* Cinematic Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{ 
          background: 'radial-gradient(ellipse at 50% 60%, transparent 20%, rgba(0,0,0,0.85) 100%)',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.9)'
        }}
      />

      {/* Emotional glow overlays */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 z-10"
        style={{ 
          background: scene.expression === 'angry' 
            ? 'radial-gradient(ellipse at 50% 80%, rgba(200,40,40,0.15) 0%, transparent 70%)'
            : scene.expression === 'blushing'
            ? 'radial-gradient(ellipse at 50% 80%, rgba(255,100,120,0.12) 0%, transparent 70%)'
            : scene.expression === 'happy'
            ? 'radial-gradient(ellipse at 50% 80%, rgba(255,200,100,0.1) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.03) 0%, transparent 70%)'
        }}
      />

      {/* Scene counter (Subtle) */}
      <div className="absolute top-8 right-10 z-20 flex gap-2">
        {SCENES.map((_, i) => (
          <div 
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-500 ease-in-out"
            style={{ 
              background: i === currentScene ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
              boxShadow: i === currentScene ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
              transform: i === currentScene ? 'scale(1.2)' : 'scale(1)'
            }}
          />
        ))}
      </div>

      {/* Auto / Skip / Log buttons (Visual Polish) */}
      <div className="absolute top-6 left-8 z-30 flex gap-4">
        <button className="text-white/40 hover:text-white/80 font-display tracking-widest uppercase text-xs transition-colors">
          Log
        </button>
        <button className="text-white/40 hover:text-white/80 font-display tracking-widest uppercase text-xs transition-colors">
          Auto
        </button>
        <button className="text-white/40 hover:text-white/80 font-display tracking-widest uppercase text-xs transition-colors" onClick={onComplete}>
          Skip
        </button>
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
            filter: scene.speaker === 'Narator' ? 'blur(4px) brightness(0.5)' : 'none',
          }}
        >
          <LiviaSprite 
            expression={scene.expression} 
            className="h-[80vh] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
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