/**
 * Tipe & skema data cerita (M5.1).
 *
 * Sumber kebenaran konten cerita adalah file JSON di content/story/chapters/.
 * File itu diedit penulis cerita — bukan orang yang sedang menyentuh JSX —
 * jadi strukturnya harus divalidasi saat module load: satu typo di JSON tidak
 * boleh meledak di tengah sesi pemain.
 */

import { z } from 'zod';

export type Choice = {
  text: string;
  nextIndex: number;
};

export type Scene = {
  speaker: string;
  text: string;
  expression?: string;
  choices?: Choice[];
  /** indeks scene berikutnya; >= jumlah scene berarti akhir bab */
  nextIndex?: number;
  /** nomor background, mis. "6.2" → /bg_story-6.2.webp */
  bg?: string;
  hideSprite?: boolean;
};

/** Data yang dibutuhkan untuk menilai syarat terbuka sebuah bab. */
export type UserStatsData = {
  affection: number;
  accountDays: number;
  screenTimeHours: number;
  itemsBrought: string[];
  activeOutfit?: string;
};

export type ReqCheck = {
  label: string;
  met: boolean;
};

/**
 * Syarat tambahan bab, dalam bentuk data — bukan fungsi.
 *
 * Versi lama menyimpan closure `getRequirements(data)` langsung di file
 * komponen, sehingga konten musti hidup di dalam JSX dan tidak bisa dipindah
 * ke JSON. Dari kumpulan sembilan bab yang memakainya, ternyata hanya ada
 * empat jenis predikat. Empat jenis itu jadi diskriminan di bawah.
 */
export type Requirement =
  | { kind: 'accountDays'; min: number; label: string }
  | { kind: 'screenTime'; min: number; label: string }
  | { kind: 'item'; item: string; label: string }
  | { kind: 'outfitOrItem'; item: string; label: string };

export type Chapter = {
  id: number;
  title: string;
  reqAffection: number;
  reqLevel: number;
  requirements?: Requirement[];
  scenes: Scene[];
};

/* ---- skema zod untuk validasi JSON ---- */

const choiceSchema = z.object({
  text: z.string().min(1),
  nextIndex: z.number().int().min(0),
});

const sceneSchema = z.object({
  speaker: z.string().min(1),
  text: z.string(),
  expression: z.string().optional(),
  choices: z.array(choiceSchema).optional(),
  nextIndex: z.number().int().min(0).optional(),
  bg: z.string().optional(),
  hideSprite: z.boolean().optional(),
});

const requirementSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('accountDays'), min: z.number().int().min(0), label: z.string().min(1) }),
  z.object({ kind: z.literal('screenTime'), min: z.number().int().min(0), label: z.string().min(1) }),
  z.object({ kind: z.literal('item'), item: z.string().min(1), label: z.string().min(1) }),
  z.object({ kind: z.literal('outfitOrItem'), item: z.string().min(1), label: z.string().min(1) }),
]);

export const chapterSchema = z.object({
  id: z.number().int().min(0),
  title: z.string().min(1),
  reqAffection: z.number().int().min(0),
  reqLevel: z.number().int().min(0),
  requirements: z.array(requirementSchema).optional(),
  scenes: z.array(sceneSchema).min(1),
});
