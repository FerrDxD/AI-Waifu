'use client';

import { useState, useEffect } from 'react';
import DialogBox from '@/components/livia/DialogBox';
import LiviaSprite from '@/components/livia/LiviaSprite';
import type { LiviaExpression } from '@/lib/gemini';
import StoryNPCSprite from './StoryNPCSprite';
import { NPC_STYLES, NPC_SPEAKERS } from './npc-config';
import type { Chapter, Scene } from '@/lib/story/types';

/**
 * Panggung pemutaran satu bab cerita (M5.1).
 *
 * Menerima bab + scene aktif dari halaman, dan bertanggung jawab atas semua
 * yang visual: background cross-fade, layer sprite, preload, pilihan, dan
 * kotak dialog. Logika maju-mundur scene dan panggilan API tetap di halaman —
 * komponen ini tidak boleh tahu soal `fetch`.
 */

type Props = {
  chapter: Chapter;
  scenes: Scene[];
  sceneIndex: number;
  activeOutfit: string;
  onChoice: (nextIndex: number) => void;
  onNext: () => void;
  onClose: () => void;
};

export default function StoryStage({
  chapter,
  scenes,
  sceneIndex,
  activeOutfit,
  onChoice,
  onNext,
  onClose,
}: Props) {
  const scene = scenes[sceneIndex] as Scene | undefined;

  // kelola background aktif (maksimum 2 di DOM) untuk cross-fade mulus tanpa
  // membanjiri jaringan dengan permintaan gambar baru setiap pindah scene.
  const [activeBgs, setActiveBgs] = useState<string[]>([]);
  const targetBg = String(
    scene?.bg ||
      (activeBgs.length > 0 ? activeBgs[activeBgs.length - 1] : chapter.id)
  );

  useEffect(() => {
    setActiveBgs((prev) => {
      if (prev.includes(targetBg)) return prev;
      return prev.length > 0 ? [prev[prev.length - 1], targetBg] : [targetBg];
    });
  }, [targetBg]);

  // preload semua sprite bab saat bab dibuka supaya pergantian instan
  useEffect(() => {
    if (!scenes.length) return;

    const firstBg = scenes[0]?.bg || chapter.id;
    const bgImg = new window.Image();
    bgImg.src = `/bg_story-${firstBg}.webp`;

    const loaded = new Set<string>();
    scenes.forEach((s) => {
      const key = `${s.speaker}:${s.expression || 'normal'}`;
      if (loaded.has(key)) return;
      loaded.add(key);

      let url = '';
      if (s.speaker === 'Livia') {
        url = `/livia/Story-bab/${s.expression || 'normal'}.webp`;
      } else if (NPC_STYLES[s.speaker]) {
        url = NPC_STYLES[s.speaker].url(s.expression);
      }

      if (url) {
        const img = new window.Image();
        img.src = url;
      }
    });
  }, [chapter.id, scenes, activeOutfit]);

  // preload background scene berikutnya just-in-time
  useEffect(() => {
    const nextScene = scenes[sceneIndex + 1];
    if (nextScene?.bg) {
      const nextBg = new window.Image();
      nextBg.src = `/bg_story-${nextScene.bg}.webp`;
    }
  }, [sceneIndex, scenes]);

  // bab 1-15 memakai folder sprite story; bukan 1-15 versi lama pakai
  // pembeda `<= 15` yang dijamin selalu benar karena bab maksimum memang 15.
  const isStoryVariant = chapter.id <= 15;

  return (
    <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-between py-2 md:py-12 landscape:py-2 px-4 md:px-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Background dengan cross-fade (maksimum 2 di DOM) */}
      {activeBgs.map((bg) => {
        const isCurrent = targetBg === bg;
        return (
          <img
            key={bg}
            src={`/bg_story-${bg}.webp`}
            alt="Chapter Background"
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-all duration-[1000ms] ease-in-out ${
              isCurrent
                ? scene?.speaker === 'Narator'
                  ? 'scale-105 blur-[3px] opacity-40'
                  : 'scale-100 blur-0 opacity-60'
                : 'scale-105 blur-[5px] opacity-0 pointer-events-none'
            }`}
            onError={(e) => {
              e.currentTarget.style.opacity = '0';
            }}
          />
        );
      })}
      {/* Vignette agar teks tetap terbaca */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-[#fdfbf7]/50 pointer-events-none" />

      <div className="w-full max-w-5xl flex justify-between px-2 md:px-8 z-20 mt-8 md:mt-0">
        <span className="font-display font-bold text-sm md:text-base text-[#ff758c] bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-[0_5px_15px_rgba(255,117,140,0.15)] border border-pink-50">
          {chapter.title}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-[#ff758c] text-sm md:text-base font-bold bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          Tutup X
        </button>
      </div>

      <div className="flex-1 w-full max-w-4xl grid grid-cols-1 grid-rows-1 justify-items-center items-end z-10 min-h-[40vh] md:min-h-0">
        {/* Livia */}
        <div
          className="col-start-1 row-start-1 h-[55vh] md:h-[60vh] landscape:h-[70vh] aspect-[2/3] drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)] animate-[float_4s_ease-in-out_infinite]"
          style={{
            opacity:
              scene?.speaker === 'Livia' && !scene?.hideSprite ? 1 : 0,
            pointerEvents:
              scene?.speaker === 'Livia' && !scene?.hideSprite ? 'auto' : 'none',
          }}
        >
          <LiviaSprite
            expression={
              // Scene cerita memakai nama ekspresi yang sama + akhiran bab
              // (mis. "angry-6"); LiviaSprite yang mengubahnya jadi URL gambar.
              // `?? 'normal'` menjaga kontrak tipe kalau scene tidak set ekspresi.
              ((scene?.speaker === 'Livia' ? scene.expression : 'normal') ??
                'normal') as LiviaExpression
            }
            outfit={activeOutfit}
            variant={isStoryVariant ? 'story' : 'home'}
            chapterId={chapter.id}
            className="h-full w-full max-w-[600px]"
            imgClassName="object-contain object-bottom scale-[1.5] md:scale-[1.75] translate-y-[25%] md:translate-y-[35%]"
          />
        </div>

        {/* Karakter pendukung — lima blok JSX identik dulu, sekarang satu loop */}
        {NPC_SPEAKERS.map((speaker) => {
          const style = NPC_STYLES[speaker];
          const isActive = scene?.speaker === speaker && !scene?.hideSprite;
          const spriteSrc = isActive
            ? style.url(scene?.expression)
            : style.url('normal');

          const sprite = (
            <StoryNPCSprite
              src={spriteSrc}
              fallbackSrc={style.fallbackUrl}
              alt={speaker}
              className={style.imgClassName}
            />
          );

          return (
            <div
              key={speaker}
              className={style.containerClassName}
              style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }}
            >
              {style.bounded ? (
                <div className="relative flex items-end justify-center h-full w-full max-w-[600px] animate-[float_3s_ease-in-out_infinite]">
                  {sprite}
                </div>
              ) : (
                sprite
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-4xl z-20 drop-shadow-2xl relative flex flex-col items-center">
        {scene?.choices && (
          <div className="absolute bottom-[100%] w-[90%] md:w-full flex flex-col items-center gap-1.5 md:gap-3 landscape:gap-1.5 mb-2 md:mb-6 landscape:mb-2 animate-[fadeIn_0.4s_ease-out_forwards]">
            {scene.choices.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => onChoice(choice.nextIndex)}
                className="w-full max-w-lg bg-white/95 backdrop-blur-md border-2 border-pink-100 py-2.5 md:py-4 landscape:py-2 px-4 md:px-6 rounded-2xl md:rounded-[1.5rem] shadow-[0_10px_25px_rgba(255,117,140,0.15)] text-[#5c4d47] font-bold font-display hover:border-[#ff758c] hover:text-[#ff758c] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(255,117,140,0.2)] transition-all duration-300 text-center text-[13px] md:text-lg active:scale-95"
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}

        <div className="w-full">
          <DialogBox
            text={scene?.text || ''}
            speaker={scene?.speaker === 'Narator' ? '' : scene?.speaker || ''}
            onNext={scene?.choices ? () => {} : onNext}
          />
        </div>
      </div>
    </div>
  );
}
