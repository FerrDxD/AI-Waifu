/**
 * Gerbang fitur per karakter (M8.2 Phase B).
 *
 * Karakter selain Livia adalah karakter **companion**: chat, kencan, afeksi,
 * dan memori. Sistem life-sim (koper, dapur, kebun, toko, lemari, quest) dan
 * bab cerita hanya dimiliki Livia — konten karakter lain memang belum ada.
 *
 * Gerbang ini dipakai di **server** (route API) supaya client yang diretas
 * tidak bisa memicu sistem Livia untuk karakter lain; UI memakai `hasFeature`
 * untuk menyembunyikan/menonaktifkan kontrol yang sama.
 */
import { AppError } from '@/lib/errors';
import { hasFeature, type Character, type CharacterFeature } from './registry';

export function assertFeature(character: Character, feature: CharacterFeature): void {
  if (hasFeature(character, feature)) return;

  const label =
    feature === 'story'
      ? 'Cerita bab'
      : feature === 'voiceCall'
        ? 'Panggilan suara'
        : 'Fitur ini';
  // Pesan mention Livia sebab Dia satu-satunya karakter dengan konten ini.
  throw new AppError(
    'FEATURE_LOCKED',
    `${label} saat ini hanya tersedia untuk Livia. Karakter lain bisa diajak chat dan kencan.`,
    403,
    true
  );
}
