'use client';

import { useState, useEffect } from 'react';
import DialogBox from '../livia/DialogBox';
import LiviaSprite from '../livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';

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

  return (
    <div 
      className="relative w-full h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #0a0908 0%, #12100e 60%, #1a1510 100%)' }}
    >
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)' }}
      />

      {/* Subtle background glow berdasarkan ekspresi */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ 
          background: scene.expression === 'angry' 
            ? 'radial-gradient(ellipse at 50% 80%, rgba(180,60,60,0.06) 0%, transparent 60%)'
            : scene.expression === 'blushing'
            ? 'radial-gradient(ellipse at 50% 80%, rgba(220,120,120,0.07) 0%, transparent 60%)'
            : scene.expression === 'happy'
            ? 'radial-gradient(ellipse at 50% 80%, rgba(196,149,106,0.07) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 50% 80%, rgba(100,90,80,0.05) 0%, transparent 60%)'
        }}
      />

      {/* Scene counter */}
      <div className="absolute top-6 right-8 z-20 flex gap-1.5">
        {SCENES.map((_, i) => (
          <div 
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{ 
              background: i === currentScene ? '#c4956a' : 'rgba(196,149,106,0.2)',
              transform: i === currentScene ? 'scale(1.3)' : 'scale(1)'
            }}
          />
        ))}
      </div>

      {/* Sprite area — Livia selalu ada, hanya opacity yang berubah */}
      <div className="flex-1 flex justify-center items-end relative z-20">
        <div 
          className="transition-all duration-300 ease-in-out"
          style={{ 
            opacity: scene.speaker === 'Narator' ? 0.3 : (spriteVisible ? 1 : 0),
            transform: scene.speaker === 'Narator' ? 'translateY(20px) scale(0.95)' : 'translateY(0) scale(1)',
            filter: scene.speaker === 'Narator' ? 'blur(1px) grayscale(0.5)' : 'none',
          }}
        >
          <LiviaSprite 
            expression={scene.expression} 
            className="h-[75vh] w-auto object-contain drop-shadow-2xl"
          />
        </div>
      </div>

      {/* Dialog box */}
      <div className="relative z-30 pb-8 px-4">
        <DialogBox 
          text={scene.text} 
          speaker={scene.speaker === 'Narator' ? '' : scene.speaker} 
          onNext={handleNext} 
        />
      </div>
    </div>
  );
}