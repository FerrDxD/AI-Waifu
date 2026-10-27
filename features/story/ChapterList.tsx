'use client';

import { Lock } from 'lucide-react';
import { isChapterUnlocked } from '@/lib/story/requirements';
import type { Chapter, UserStatsData } from '@/lib/story/types';

/**
 * Daftar bab di menu cerita (M5.1).
 *
 * Keputusan "bab ini terbuka atau bukan" memakai `isChapterUnlocked()` dari
 * lib/story — satu definisi yang sama dipakai menu dan modal terkunci. Dulu
 * logikanya ditulis inline di JSX sehingga tidak bisa diuji dan mudah
 * berbeda antar tempat.
 */

type Props = {
  chapters: Chapter[];
  userStats: UserStatsData | null;
  hoveredChapterId: number;
  onHover: (id: number) => void;
  onOpen: (chapter: Chapter) => void;
  onShowLocked: (chapter: Chapter) => void;
};

export default function ChapterList({
  chapters,
  userStats,
  hoveredChapterId,
  onHover,
  onOpen,
  onShowLocked,
}: Props) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-[450px] max-h-[65vh] overflow-y-auto overflow-x-hidden pr-4 pb-20 scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent">
      {chapters.map((chap) => {
        const isUnlocked = userStats ? isChapterUnlocked(chap, userStats) : false;
        const isHovered = hoveredChapterId === chap.id;

        return (
          <div
            key={chap.id}
            onMouseEnter={() => onHover(chap.id)}
            onClick={() => (isUnlocked ? onOpen(chap) : onShowLocked(chap))}
            className={`relative py-4 px-6 cursor-pointer transition-all duration-300 ease-out flex flex-col justify-center border-l-[6px] ${
              isUnlocked
                ? isHovered
                  ? 'border-[#ff758c] bg-gradient-to-r from-[#ff758c]/10 to-transparent translate-x-4'
                  : 'border-transparent hover:bg-white/40'
                : 'border-transparent opacity-40 hover:opacity-60'
            }`}
          >
            <div className="relative z-10 flex flex-col">
              <div className="flex items-center gap-3 mb-1">
                <span
                  className={`text-xs font-mono tracking-[0.15em] font-bold uppercase transition-colors duration-300 ${
                    isHovered && isUnlocked ? 'text-[#ff758c]' : 'text-amber-500'
                  }`}
                >
                  BAB {String(chap.id).padStart(2, '0')}
                </span>
                {!isUnlocked && <Lock className="w-3 h-3 text-gray-400" />}
              </div>

              <h3
                className={`text-2xl md:text-3xl font-black font-display uppercase tracking-wider transition-all duration-300 ${
                  isHovered && isUnlocked ? 'text-[#5c4d47]' : 'text-[#8C7B6B]'
                }`}
              >
                {chap.title}
              </h3>

              <div
                className={`text-sm md:text-[15px] mt-1 transition-colors duration-300 ${
                  isHovered && isUnlocked ? 'text-[#5c4d47]' : 'text-gray-500'
                }`}
              >
                {isUnlocked ? (
                  <p className="line-clamp-1">{chap.scenes[0]?.text || ''}</p>
                ) : (
                  <p className="font-semibold italic text-[#8C7B6B]">Belum Terbuka</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
