'use client';

import { Lock } from 'lucide-react';
import { evaluateRequirements } from '@/lib/story/requirements';
import type { Chapter, UserStatsData } from '@/lib/story/types';

/**
 * Modal bab terkunci (M5.1) — tampilkan semua syarat + statusnya.
 */

type Props = {
  chapter: Chapter;
  affection: number;
  userStats: UserStatsData | null;
  onClose: () => void;
};

export default function LockedChapterModal({ chapter, affection, userStats, onClose }: Props) {
  const reqs = userStats && chapter.requirements ? evaluateRequirements(chapter.requirements, userStats) : [];

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 md:p-8 shadow-2xl border border-pink-100 flex flex-col gap-6 animate-[slideUp_0.3s_ease-out]">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-pink-400" />
          </div>
          <h3 className="font-display font-black text-2xl text-[#5c4d47] leading-none">{chapter.title}</h3>
          <p className="text-sm text-gray-500">Penuhi semua syarat berikut untuk membuka bab ini.</p>
        </div>

        <div className="flex flex-col gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3 text-sm font-medium">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full ${
                affection >= chapter.reqAffection ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
              }`}
            >
              {affection >= chapter.reqAffection ? '✓' : '✗'}
            </span>
            <span className={affection >= chapter.reqAffection ? 'text-gray-800' : 'text-gray-500'}>
              Afeksi {chapter.reqAffection}
            </span>
          </div>

          {reqs.map((r, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm font-medium">
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full ${
                  r.met ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                }`}
              >
                {r.met ? '✓' : '✗'}
              </span>
              <span className={r.met ? 'text-gray-800' : 'text-gray-500'}>{r.label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors mt-2"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
