'use client';

import { Lock } from 'lucide-react';
import { useActiveCharacter } from '@/lib/client/character';
import { getCharacter, hasFeature, type CharacterFeature } from '@/lib/characters/registry';

/**
 * Gerbang fitur sisi client (M8.2 Phase B).
 *
 * Sistem life-sim (koper, dapur, kebun, toko, lemari) dan bab cerita hanya
 * dimiliki Livia. Halaman-halaman itu membungkus kontennya dengan komponen
 * ini: karakter lain melihat pemberitahuan, bukan konten Livia yang aneh.
 *
 * Gerbang SERVER tetap ada di tiap route (`assertFeature`) — komponen ini
 * hanya UX, bukan pengaman.
 */
export default function CharacterGate({
  feature,
  children,
}: {
  feature: CharacterFeature;
  children: React.ReactNode;
}) {
  const { characterId, characters, loading } = useActiveCharacter();

  // Sedang memuat: asumsikan boleh (default Livia) supaya layar tidak
  // berkedip kosong bagi user Livia. Karakter non-Livia melihat notice
  // begitu daftar selesai dimuat.
  if (loading) return <>{children}</>;

  const option = characters.find((c) => c.id === characterId);
  const allowed = hasFeature(getCharacter(characterId), feature);

  if (allowed) return <>{children}</>;

  const featureLabel =
    feature === 'story'
      ? 'Cerita bab'
      : feature === 'voiceCall'
        ? 'Panggilan suara'
        : 'Fitur ini';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md bg-white rounded-[2rem] p-8 shadow-sm border border-pink-100 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center">
          <Lock className="text-pink-400" size={24} />
        </div>
        <h2 className="font-display font-black text-lg text-[#5c4d47]">
          {featureLabel} saat ini hanya untuk Livia
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          {option?.name ?? 'Karakter ini'} adalah karakter companion — dia bisa
          diajak ngobrol, kencan, dan tumbuh afeksinya. Sistem kisah (cerita,
          lemari, dapur, kebun, toko) masih milik Livia.
        </p>
      </div>
    </div>
  );
}
