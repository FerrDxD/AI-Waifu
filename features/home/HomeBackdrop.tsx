'use client';

import LiviaSprite from '@/components/livia/LiviaSprite';
import { getHomeBackground } from './cycle';
import type { BodyPart } from './touch-interactions';
import type { LiviaExpression } from '@/lib/gemini';

/**
 * Latar + karakter + hitbox sentuh home (M5.1).
 *
 * VFX radial-gradient mengikuti ekspresi; nilai warnanya disalin verbatim
 * karena menentukan suasana layar. Hitbox posisinya dipertahankan persis —
 * geser beberapa persen saja dan sentuhan "meraba" tidak lagi jatuh di tubuh.
 */

const VFX_BY_EXPRESSION: Record<string, string> = {
  angry: 'radial-gradient(ellipse at 50% 90%, rgba(255,100,100,0.5) 0%, transparent 70%)',
  blushing: 'radial-gradient(ellipse at 50% 90%, rgba(255,150,180,0.5) 0%, transparent 70%)',
  happy: 'radial-gradient(ellipse at 50% 90%, rgba(255,220,150,0.5) 0%, transparent 70%)',
  clingy: 'radial-gradient(ellipse at 50% 90%, rgba(200,150,255,0.4) 0%, transparent 70%)',
  normal: 'radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.3) 0%, transparent 70%)',
};

export default function HomeBackdrop({
  displayExpression,
  outfit,
  onInteract,
}: {
  displayExpression: LiviaExpression;
  outfit: string;
  onInteract: (part: BodyPart) => void;
}) {
  return (
    <>
      {/* Latar belakang */}
      <div
        className="absolute inset-0 bg-cover bg-[60%_center] md:bg-center opacity-40 transition-all duration-1000"
        style={{ backgroundImage: `url('${getHomeBackground(new Date().getHours())}')` }}
      />

      {/* VFX layar mengikuti ekspresi */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 mix-blend-screen opacity-60"
        style={{ background: VFX_BY_EXPRESSION[displayExpression] ?? VFX_BY_EXPRESSION.normal }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/10 pointer-events-none z-0" />

      {/* Karakter tengah + hitbox tak terlihat */}
      <div className="absolute inset-0 pointer-events-none z-10 pb-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <LiviaSprite
            expression={displayExpression}
            outfit={outfit}
            disableFloat={true}
            className="w-full h-full"
            imgClassName="object-cover object-[60%_center] md:object-center"
          />
        </div>

        <div className="absolute top-0 left-[10%] md:left-[48%] w-[80%] md:w-[24%] h-full pointer-events-auto z-50 flex flex-col">
          <div onClick={() => onInteract('head')} className="absolute top-[5%] left-[25%] w-[50%] h-[15%] cursor-pointer z-50 rounded-full transition-colors hover:bg-white/5 active:bg-pink-300/20" />
          <div onClick={() => onInteract('chest')} className="absolute top-[23%] left-[25%] w-[50%] h-[12%] cursor-pointer z-50 rounded-[2rem] transition-colors hover:bg-white/5 active:bg-pink-300/20" />
          <div onClick={() => onInteract('belly')} className="absolute top-[35%] left-[25%] w-[50%] h-[15%] cursor-pointer z-50 rounded-[2rem] transition-colors hover:bg-white/5 active:bg-pink-300/20" />
          <div onClick={() => onInteract('thigh')} className="absolute top-[50%] left-[15%] w-[70%] h-[35%] cursor-pointer z-50 rounded-[3rem] transition-colors hover:bg-white/5 active:bg-pink-300/20" />
        </div>
      </div>
    </>
  );
}
