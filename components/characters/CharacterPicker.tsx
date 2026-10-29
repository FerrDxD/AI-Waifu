'use client';

import { useState } from 'react';
import { Check, Loader2, Users } from 'lucide-react';
import { useActiveCharacter, type CharacterOption } from '@/lib/client/character';

/**
 * Pemilih karakter (M8.2 Phase B).
 *
 * Daftar karakter berasal dari registry server (`GET /api/user/character`), 
 * bukan hardcode client. Progres tiap karakter terpisah — afeksi, memori,
 * riwayat chat, dan bab cerita tidak ikut pindah saat berganti.
 *
 * Dua pemakaian:
 *  - `<CharacterPickerSection />` di Settings (kartu inline).
 *  - `<CharacterSwitchModal onClose />` di home (overlay).
 */

function CharacterGrid({
  characterId,
  characters,
  busyId,
  onSelect,
}: {
  characterId: string;
  characters: CharacterOption[];
  busyId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {characters.map((option) => {
        const active = option.id === characterId;
        return (
          <button
            key={option.id}
            type="button"
            disabled={active || busyId !== null}
            onClick={() => onSelect(option.id)}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 disabled:cursor-default ${
              active
                ? 'border-pink-400 bg-pink-50/70 shadow-sm'
                : 'border-gray-100 bg-white hover:border-pink-200 hover:-translate-y-0.5 active:translate-y-0'
            }`}
            aria-pressed={active}
          >
            {active && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-sm">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={option.previewSprite}
              alt={option.name}
              className="w-20 h-24 object-contain pointer-events-none"
              loading="lazy"
            />
            <span className="font-display font-bold text-sm text-[#5c4d47] leading-tight text-center">
              {option.name}
            </span>
            <span className="text-[10px] text-gray-400 leading-tight text-center line-clamp-2">
              {option.tagline}
            </span>
            {active ? (
              <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">
                Aktif
              </span>
            ) : (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Pilih
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Kartu pemilih untuk halaman Settings. */
export function CharacterPickerSection() {
  const { characterId, characters, loading, error, save } = useActiveCharacter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleSelect = async (id: string) => {
    setBusyId(id);
    try {
      await save(id);
    } catch {
      // error sudah masuk state hook (ditampilkan di bawah).
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-bold text-sm text-[#5c4d47] flex items-center gap-2">
          <Users size={16} className="text-amber-500" /> Karakter
        </span>
        <p className="text-xs text-gray-500 leading-relaxed">
          Pilih karakter yang menemanimu. Progres tiap karakter terpisah — afeksi,
          memori, dan riwayat chat tidak ikut pindah saat berganti. Sistem kisah
          (cerita, lemari, dapur, kebun) saat ini hanya dimiliki Livia.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <Loader2 size={14} className="animate-spin" /> Memuat daftar karakter...
        </div>
      ) : (
        <CharacterGrid
          characterId={characterId}
          characters={characters}
          busyId={busyId}
          onSelect={handleSelect}
        />
      )}

      {busyId && (
        <div className="flex items-center gap-2 text-xs text-pink-500 font-medium">
          <Loader2 size={14} className="animate-spin" /> Mengganti karakter...
        </div>
      )}
      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
    </div>
  );
}

/** Overlay pemilih untuk home screen. */
export function CharacterSwitchModal({ onClose }: { onClose: () => void }) {
  const { characterId, characters, loading, error, save } = useActiveCharacter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleSelect = async (id: string) => {
    setBusyId(id);
    try {
      await save(id);
      // Progres berganti total (afeksi, sprite, memori) — reload menjamin
      // seluruh state client diputar dari server, bukan setengah-hidup.
      window.location.reload();
    } catch {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#fdfbf7] rounded-[2rem] w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-lg text-[#5c4d47]">Pilih Karakter</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busyId !== null}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-all disabled:opacity-50"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Progres tiap karakter terpisah — afeksi, memori, dan riwayat chat tidak
          ikut pindah. Sistem kisah (cerita, lemari, dapur, kebun) saat ini hanya
          dimiliki Livia.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <Loader2 size={14} className="animate-spin" /> Memuat daftar karakter...
          </div>
        ) : (
          <CharacterGrid
            characterId={characterId}
            characters={characters}
            busyId={busyId}
            onSelect={handleSelect}
          />
        )}

        {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
      </div>
    </div>
  );
}
