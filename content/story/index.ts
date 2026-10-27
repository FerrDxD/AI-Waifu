/**
 * Agregator konten cerita (M5.1).
 *
 * Konten bab hidup di content/story/chapters/ch-XX.json — satu file per bab.
 * Penulis cerita mengedit JSON itu tanpa membuka satu baris JSX pun, dan
 * review diff cerita jadi bisa dibaca (satu bab = satu file = satu diff).
 *
 * Semua file divalidasi dengan skema zod saat module load. Kalau ada file
 * yang rusak, aplikasi gagal cepat di build/import — bukan meledak di
 * tengah sesi pemain yang sudah menabung afeksi berminggu-minggu.
 *
 * Kenapa tidak server-first / unstable_cache: JSON ini ikut bundle client —
 * halaman cerita dirender di browser, tanpa fetch tambahan, tanpa water barrel
 * request. Cache server tidak relevan untuk data yang statik sejak build.
 */

import { chapterSchema, type Chapter } from '@/lib/story/types';
import ch00 from './chapters/ch-00.json';
import ch01 from './chapters/ch-01.json';
import ch02 from './chapters/ch-02.json';
import ch03 from './chapters/ch-03.json';
import ch04 from './chapters/ch-04.json';
import ch05 from './chapters/ch-05.json';
import ch06 from './chapters/ch-06.json';
import ch07 from './chapters/ch-07.json';
import ch08 from './chapters/ch-08.json';
import ch09 from './chapters/ch-09.json';
import ch10 from './chapters/ch-10.json';
import ch11 from './chapters/ch-11.json';
import ch12 from './chapters/ch-12.json';
import ch13 from './chapters/ch-13.json';
import ch14 from './chapters/ch-14.json';
import ch15 from './chapters/ch-15.json';

const RAW_CHAPTERS = [
  ch00, ch01, ch02, ch03, ch04, ch05,
  ch06, ch07, ch08, ch09, ch10, ch11,
  ch12, ch13, ch14, ch15,
];

export const CHAPTERS: Chapter[] = RAW_CHAPTERS.map((raw, i) => {
  const parsed = chapterSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `content/story/chapters file #${i} (id mentah ${JSON.stringify((raw as { id?: unknown }).id)}) tidak valid: ${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}`
    );
  }
  return parsed.data as Chapter;
}).sort((a, b) => a.id - b.id);

export function getChapter(id: number): Chapter | undefined {
  return CHAPTERS.find((ch) => ch.id === id);
}

/** Item id yang menandai bab sudah ditamatkan (dipakai logika khusus bab 8/12). */
export const CHAPTER_COMPLETED_ITEM_PREFIX = 'chapter_';
