'use client';

import { useState } from 'react';
import { Package, Sparkles, Loader2 } from 'lucide-react';
import { ITEMS } from '@/lib/livia/items';

/**
 * Pemilih barang pulang kampung (bab 8) (M5.1).
 *
 * State seleksi hidup di dalam modal ini — dulu lima state terkait tersebar
 * di halaman sehingga halaman jadi tahu terlalu banyak soal UI pemilih.
 * Halaman hanya menerima hasil akhir lewat `onSubmit(items)`.
 */

type Props = {
  ownedItemIds: string[];
  submitting: boolean;
  onSubmit: (selectedIds: string[]) => void;
};

const MAX_PICKS = 3;

export default function HometownPickerModal({ ownedItemIds, submitting, onSubmit }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, id];
    });
  };

  const isReady = selected.length === MAX_PICKS && !submitting;

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-[#fdfbf7] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-[#ff758c] to-[#ff0844] p-6 text-center shadow-md relative z-10">
          <h2 className="text-2xl md:text-3xl font-display font-black text-white flex items-center justify-center gap-2">
            <Package size={28} /> Kunjungan ke Kamar Livia
          </h2>
          <p className="text-pink-100 font-medium mt-1">Pilih 3 barang yang ingin kamu bawa kembali ke kos.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {ITEMS.filter((i) => !ownedItemIds.includes(i.id)).map((item) => {
              const isSelected = selected.includes(item.id);
              const isMaxed = selected.length >= MAX_PICKS && !isSelected;

              return (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`relative p-3 md:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'border-[#ff758c] bg-pink-50 shadow-[0_4px_15px_rgba(255,117,140,0.2)] -translate-y-1'
                      : isMaxed
                        ? 'border-gray-100 bg-gray-50 opacity-50 grayscale cursor-not-allowed'
                        : 'border-pink-100 bg-white hover:border-pink-300 hover:shadow-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 bg-[#ff758c] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm">
                      ✓
                    </div>
                  )}
                  <div className="text-3xl md:text-4xl text-center bg-gray-50/50 rounded-xl py-2">{item.emoji}</div>
                  <h3 className="font-bold text-[#5c4d47] text-sm leading-tight line-clamp-2 text-center">{item.name}</h3>
                  <p className="text-[10px] md:text-xs text-gray-500 line-clamp-2 text-center hidden md:block">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 md:p-6 bg-white border-t border-pink-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
            <span className="font-bold text-gray-500">Terpilih:</span>
            <div className="flex gap-2">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    idx < selected.length
                      ? 'bg-pink-100 border-2 border-pink-300'
                      : 'bg-gray-100 border-2 border-dashed border-gray-300'
                  }`}
                >
                  {idx < selected.length ? ITEMS.find((i) => i.id === selected[idx])?.emoji : '?'}
                </div>
              ))}
            </div>
          </div>

          <button
            disabled={!isReady}
            onClick={() => onSubmit(selected)}
            className={`w-full md:w-auto px-8 py-3.5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all ${
              isReady
                ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white shadow-[0_5px_15px_rgba(255,117,140,0.3)] hover:-translate-y-0.5'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> Bawa Pulang</>}
          </button>
        </div>
      </div>
    </div>
  );
}
