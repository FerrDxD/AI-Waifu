'use client';

import { useState } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { getHomeBackground } from './cycle';
import type { BodyPart } from './touch-interactions';
import type { LiviaExpression } from '@/lib/gemini';
import { Heart, Sparkles } from 'lucide-react';

/**
 * Latar + Panggung Livia 16:9 + Hitbox Sentuh Presisi (M5.1).
 *
 * Mengunci proporsi 16:9 sprite Livia agar selalu terpusat sempurna di mobile & desktop,
 * tanpa pergeseran horizontal (no hacky object-[60%_center]), bebas distorsi, dan
 * hitbox sentuh terkunci 1:1 pada koordinat tubuh karakter.
 */

const VFX_BY_EXPRESSION: Record<string, string> = {
  angry: 'radial-gradient(ellipse at 50% 85%, rgba(255,8,68,0.35) 0%, transparent 65%)',
  blushing: 'radial-gradient(ellipse at 50% 85%, rgba(255,117,140,0.4) 0%, transparent 65%)',
  happy: 'radial-gradient(ellipse at 50% 85%, rgba(245,158,11,0.35) 0%, transparent 65%)',
  clingy: 'radial-gradient(ellipse at 50% 85%, rgba(255,154,158,0.4) 0%, transparent 65%)',
  normal: 'radial-gradient(ellipse at 50% 85%, rgba(255,255,255,0.25) 0%, transparent 65%)',
};

interface RipplePoint {
  id: number;
  x: number;
  y: number;
  part: BodyPart;
}

export default function HomeBackdrop({
  displayExpression,
  outfit,
  onInteract,
}: {
  displayExpression: LiviaExpression;
  outfit: string;
  onInteract: (part: BodyPart) => void;
}) {
  const [ripples, setRipples] = useState<RipplePoint[]>([]);

  const handleTouch = (part: BodyPart, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newId = Date.now();

    setRipples((prev) => [...prev.slice(-3), { id: newId, x, y, part }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newId));
    }, 900);

    onInteract(part);
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* ── Latar Belakang Kamar Kos (Waktu-Aktif) ── */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 md:opacity-40 transition-all duration-1000 transform scale-105"
        style={{ backgroundImage: `url('${getHomeBackground(new Date().getHours())}')` }}
      />

      {/* ── Lapisan Kehangatan Kertas Kos (#fdfbf7) ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/10 mix-blend-multiply opacity-80" />

      {/* ── VFX Lampu Mengikuti Ekspresi Livia ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 mix-blend-screen opacity-70"
        style={{ background: VFX_BY_EXPRESSION[displayExpression] ?? VFX_BY_EXPRESSION.normal }}
      />

      {/* ── Tactical Game Frame: Corner Brackets (Gaya Landing Page) ── */}
      <div
        aria-hidden
        className="hidden md:block absolute left-6 top-6 z-10 h-6 w-6 border-l-2 border-t-2 border-pink-300/40 pointer-events-none"
      />
      <div
        aria-hidden
        className="hidden md:block absolute right-6 top-6 z-10 h-6 w-6 border-r-2 border-t-2 border-pink-300/40 pointer-events-none"
      />
      <div
        aria-hidden
        className="hidden md:block absolute bottom-6 left-6 z-10 h-6 w-6 border-b-2 border-l-2 border-pink-300/40 pointer-events-none"
      />
      <div
        aria-hidden
        className="hidden md:block absolute bottom-6 right-6 z-10 h-6 w-6 border-b-2 border-r-2 border-pink-300/40 pointer-events-none"
      />

      {/* ── Panggung Livia Terpusat (Widescreen 16:9 Anti-Geser) ── */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none pb-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full w-[177.78vh] flex items-end justify-center pointer-events-none">
          {/* Sprite Livia Mengisi Panggung 16:9 Proporsional */}
          <div className="w-full h-full flex items-end justify-center pointer-events-none">
            <LiviaSprite
              expression={displayExpression}
              outfit={outfit}
              disableFloat={true}
              className="w-full h-full"
              imgClassName="w-full h-full object-contain object-bottom pointer-events-none"
            />
          </div>

          {/* ── Hitbox Sentuh Terkunci Pada Koordinat Tubuh (X: 38%-62%) ── */}
          <div className="absolute bottom-0 left-[38%] w-[24%] h-[92%] pointer-events-auto flex flex-col items-center z-30">
            {/* Kepala (Head): Elusan & Belaian */}
            <button
              type="button"
              onClick={(e) => handleTouch('head', e)}
              title="Elus Kepala Livia"
              aria-label="Elus Kepala Livia"
              className="relative w-[64%] h-[18%] rounded-full cursor-pointer group transition-all hover:bg-pink-400/10 active:bg-pink-500/25 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              <span className="sr-only">Elus Kepala Livia</span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-pink-100 shadow-xs flex items-center gap-1 pointer-events-none">
                <Sparkles size={11} className="text-pink-500" />
                <span className="font-mono text-[9px] font-bold text-[#5c4d47]">Elus</span>
              </div>
            </button>

            {/* Dada (Chest): Sentuhan Dekat */}
            <button
              type="button"
              onClick={(e) => handleTouch('chest', e)}
              title="Sentuh Dada Livia"
              aria-label="Sentuh Dada Livia"
              className="relative w-[70%] h-[15%] rounded-2xl cursor-pointer group transition-all hover:bg-pink-400/10 active:bg-pink-500/25 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 mt-1"
            >
              <span className="sr-only">Sentuh Dada Livia</span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-pink-100 shadow-xs flex items-center gap-1 pointer-events-none">
                <Heart size={11} className="text-pink-500 fill-pink-500" />
                <span className="font-mono text-[9px] font-bold text-[#5c4d47]">Sentuh</span>
              </div>
            </button>

            {/* Perut (Belly): Geli & Kehangatan */}
            <button
              type="button"
              onClick={(e) => handleTouch('belly', e)}
              title="Elus Perut Livia"
              aria-label="Elus Perut Livia"
              className="relative w-[65%] h-[16%] rounded-2xl cursor-pointer group transition-all hover:bg-pink-400/10 active:bg-pink-500/25 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 mt-1"
            >
              <span className="sr-only">Elus Perut Livia</span>
            </button>

            {/* Paha (Thigh): Paha & Kaki */}
            <button
              type="button"
              onClick={(e) => handleTouch('thigh', e)}
              title="Sentuh Paha Livia"
              aria-label="Sentuh Paha Livia"
              className="relative w-[80%] h-[40%] rounded-3xl cursor-pointer group transition-all hover:bg-pink-400/10 active:bg-pink-500/25 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 mt-1"
            >
              <span className="sr-only">Sentuh Paha Livia</span>
            </button>

            {/* Efek Sentuhan Visual (Floating Hearts) */}
            {ripples.map((r) => (
              <div
                key={r.id}
                className="absolute pointer-events-none flex items-center gap-1 animate-[bounce_0.6s_ease-out_infinite]"
                style={{
                  left: `${r.x}px`,
                  top: `${r.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Heart size={18} className="text-pink-500 fill-pink-500 animate-ping" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
