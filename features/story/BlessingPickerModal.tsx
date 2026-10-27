'use client';

import { Sparkles, Loader2 } from 'lucide-react';

/**
 * Pemilih berkah kuil (bab 12) (M5.1).
 *
 * Konten opsi pindah dari JSX halaman ke konstanta di sini. State seleksi
 * tetap di halaman karena hasilnya dipakai untuk panggilan API.
 */

export type BlessingOption = {
  id: string;
  name: string;
  icon: string;
  desc: string;
};

export const BLESSING_OPTIONS: BlessingOption[] = [
  {
    id: 'berkah_kesuburan',
    name: 'Kesuburan',
    icon: '👶',
    desc: 'Membawa kehidupan baru ke dalam keluarga. Menganugerahi kalian dengan buah hati yang manis.',
  },
  {
    id: 'berkah_kesehatan',
    name: 'Kesehatan',
    icon: '🏃‍♀️',
    desc: 'Fisik bugar dan umur yang panjang. Memberikan stamina tak terbatas di setiap harinya.',
  },
  {
    id: 'berkah_kekayaan',
    name: 'Kekayaan',
    icon: '💰',
    desc: 'Kemudahan rezeki dan karir yang meroket. Membuka jalan menuju kebebasan finansial.',
  },
];

type Props = {
  selected: string | null;
  submitting: boolean;
  onSelect: (id: string) => void;
  onSubmit: () => void;
};

export default function BlessingPickerModal({ selected, submitting, onSelect, onSubmit }: Props) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col items-center">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="h-px w-12 md:w-24 bg-gradient-to-l from-yellow-400 to-transparent" />
            <Sparkles className="w-8 h-8 text-yellow-400" />
            <div className="h-px w-12 md:w-24 bg-gradient-to-r from-yellow-400 to-transparent" />
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-widest drop-shadow-[0_2px_10px_rgba(250,204,21,0.5)]">
            BERKAH KUIL SUCI
          </h2>
          <p className="text-gray-200 mt-3 text-sm md:text-base font-medium">
            Pilihlah satu takdir untuk membimbing jalan kalian (Bab 13-15).
          </p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-4 md:px-0 mb-10">
          {BLESSING_OPTIONS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`group relative h-[320px] rounded-lg transition-all duration-300 flex flex-col items-center p-1 overflow-hidden ${
                selected === item.id
                  ? 'bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-[0_0_30px_rgba(250,204,21,0.5)] scale-105 z-10'
                  : 'bg-white/10 hover:bg-white/20 hover:scale-[1.02]'
              }`}
            >
              {/* Kartu bagian dalam */}
              <div
                className={`w-full h-full flex flex-col items-center bg-[#fdfbf7] rounded flex-1 py-8 px-6 relative z-10 transition-colors ${
                  selected === item.id ? 'bg-[#fffdf0]' : ''
                }`}
              >
                {/* Lingkaran ikon */}
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center border-4 mb-4 transition-all ${
                    selected === item.id
                      ? 'border-yellow-400 bg-yellow-100 shadow-[0_0_15px_rgba(250,204,21,0.4)]'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-4xl drop-shadow-sm">{item.icon}</span>
                </div>

                <h3
                  className={`font-display font-black text-xl mb-2 text-center uppercase tracking-wider ${
                    selected === item.id ? 'text-yellow-700' : 'text-[#5c4d47]'
                  }`}
                >
                  {item.name}
                </h3>

                {/* Pembatas dekoratif */}
                <div className="flex items-center justify-center w-full my-3 opacity-60">
                  <div className="h-px w-1/3 bg-gradient-to-l from-yellow-400 to-transparent" />
                  <div className="w-1.5 h-1.5 rotate-45 bg-yellow-400 mx-2" />
                  <div className="h-px w-1/3 bg-gradient-to-r from-yellow-400 to-transparent" />
                </div>

                <p
                  className={`text-sm text-center leading-relaxed mt-2 ${
                    selected === item.id ? 'text-yellow-900 font-medium' : 'text-gray-500'
                  }`}
                >
                  {item.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onSubmit}
          disabled={!selected || submitting}
          className={`relative overflow-hidden group px-12 py-4 rounded-full font-black tracking-widest text-lg transition-all ${
            selected
              ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] hover:-translate-y-1'
              : 'bg-gray-500/50 text-gray-300 cursor-not-allowed border border-gray-400/50'
          }`}
        >
          <div className="flex items-center gap-3 relative z-10">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            TERIMA BERKAH
          </div>
          {selected && (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          )}
        </button>
      </div>
    </div>
  );
}
