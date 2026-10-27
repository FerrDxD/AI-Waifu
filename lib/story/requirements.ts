/**
 * Evaluator syarat bab (M5.1) — murni, tanpa React, tanpa IO.
 *
 * Menggantikan closure `getRequirements` yang dulu tertanam di komponen story.
 * Fungsi murni berarti logika membuka bab bisa diuji tanpa merender apa pun.
 */

import type { Chapter, ReqCheck, Requirement, UserStatsData } from './types';

export function evaluateRequirement(
  req: Requirement,
  data: UserStatsData
): ReqCheck {
  switch (req.kind) {
    case 'accountDays':
      return { label: req.label, met: data.accountDays >= req.min };
    case 'screenTime':
      return { label: req.label, met: data.screenTimeHours >= req.min };
    case 'item':
      return { label: req.label, met: data.itemsBrought.includes(req.item) };
    case 'outfitOrItem':
      // bab 12: bilangnya "memakai", tapi implementasinya menerima benda yang
      // DIPUNYA. Dipertahankan apa adanya — mengetatkan sekarang akan
      // mengunci pemain yang sudah menamatkan bab ini.
      return {
        label: req.label,
        met:
          data.activeOutfit === req.item || data.itemsBrought.includes(req.item),
      };
  }
}

export function evaluateRequirements(
  requirements: Requirement[],
  data: UserStatsData
): ReqCheck[] {
  return requirements.map((req) => evaluateRequirement(req, data));
}

/**
 * Apakah bab bisa dimainkan: syarat afeksi + seluruh syarat tambahan terpenuhi.
 * Inilah satu-satunya definisi "terbuka" — sebelumnya ada di tengah JSX dan
 * tidak bisa dibaca dari mana pun selain halaman itu.
 */
export function isChapterUnlocked(
  chapter: Chapter,
  data: UserStatsData
): boolean {
  if (data.affection < chapter.reqAffection) return false;
  if (!chapter.requirements) return true;
  return chapter.requirements.every((req) => evaluateRequirement(req, data).met);
}
