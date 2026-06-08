'use client';

import { useState } from 'react';
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
};

const SCENES: Scene[] = [
  { speaker: 'Narator', text: 'Sebuah pesan masuk dari nomor tak dikenal.', expression: 'normal' },
  { speaker: 'Livia', text: 'Hei. Kamu yang bakal bantu aku pindahan, kan? Ibu yang suruh aku minta tolong.', expression: 'normal' },
  { speaker: 'Livia', text: 'Bukan berarti aku mau, ya. Aku bisa urus sendiri. Tapi... yah, terima kasih.', expression: 'angry' },
  { speaker: 'Narator', text: 'Begitulah pertama kali kamu mengenal Livia Einhart. Gadis yang akan jadi teman kosmu.', expression: 'normal' },
  { speaker: 'Livia', text: 'Oke, kita mulai dari barang-barangku. Aku nggak bisa bawa semuanya — koper aku cuma muat lima barang. Bantu aku milih, ya.', expression: 'normal' },
];

export default function VNScene({ onComplete }: VNSceneProps) {
  const [currentScene, setCurrentScene] = useState(0);

  const handleNext = () => {
    if (currentScene < SCENES.length - 1) {
      setCurrentScene(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const scene = SCENES[currentScene];

  return (
    <div className="flex flex-col items-center justify-between w-full h-[80vh] max-w-4xl mx-auto py-8">
      <div className="flex-1 w-full flex justify-center items-end pb-8">
        {scene.speaker === 'Livia' && (
          <div className="h-[400px] w-[300px]">
            <LiviaSprite expression={scene.expression} />
          </div>
        )}
      </div>
      
      <div className="w-full">
        <DialogBox 
          text={scene.text} 
          speaker={scene.speaker === 'Narator' ? '' : scene.speaker} 
          onNext={handleNext} 
        />
      </div>
    </div>
  );
}
