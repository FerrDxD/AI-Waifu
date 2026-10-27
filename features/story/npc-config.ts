'use client';

/**
 * Peta sprite karakter pendukung di scene cerita (M5.1).
 *
 * Dulu lima blok JSX hampir identik (Laura, Enji, Ayame, Rikuto, Naomi)
 * ditulis berulang di halaman story, plus fungsi URL Naomi. Semua sekarang
 * jadi data + satu komponen renderer — menambah NPC baru berarti menambah
 * satu entri di NPC_STYLES, bukan menyalin 20 baris JSX.
 *
 * Nilai class disalin verbatim dari versi lama: posisi sprite ini dituning
 * manual per karakter (karakter dengan art beda tingginya beda), jadi
 * "digeneralisasi" justru berisiko menggeser visual yang sudah pas.
 */

export type NpcStyle = {
  /** URL sprite dari expression mentah (pembersihan akhiran -6 di dalam). */
  url: (expression?: string) => string;
  fallbackUrl?: string;
  /** kelas container layer */
  containerClassName: string;
  /** bila true, sprite dibungkus wrapper terbatas 600px (Laura/Enji) */
  bounded?: boolean;
  /** kelas elemen <img> */
  imgClassName: string;
};

export function cleanExpression(expression?: string): string {
  return expression?.replace(/-[0-9]+$/, '') ?? 'normal';
}

export function getNaomiSpriteUrl(expr?: string): string {
  const cleanExpr = cleanExpression(expr);

  const exactAvailable = ['normal', 'happy', 'confused', 'pleased', 'touched'];
  if (exactAvailable.includes(cleanExpr)) {
    return `/naomi/${cleanExpr}.webp`;
  }

  if (cleanExpr === 'crying' || cleanExpr === 'sad' || cleanExpr === 'pain') return '/naomi/touched.webp';
  if (cleanExpr === 'surprised' || cleanExpr === 'scared' || cleanExpr === 'angry' || cleanExpr === 'tired') return '/naomi/confused.webp';
  if (cleanExpr === 'blushing' || cleanExpr === 'excited' || cleanExpr === 'proud' || cleanExpr === 'flirty' || cleanExpr === 'silly') return '/naomi/pleased.webp';

  return '/naomi/normal.webp';
}

const FULLSCREEN_LAYER =
  'col-start-1 row-start-1 absolute inset-0 w-full h-full z-10 animate-[float_3s_ease-in-out_infinite]';
const FULLSCREEN_IMG =
  'w-full h-full object-cover md:object-contain scale-[1.55] md:scale-[1.65] translate-y-[25%] md:translate-y-[30%]';

export const NPC_STYLES: Record<string, NpcStyle> = {
  Laura: {
    url: (expr) => `/laura/story-bab/${cleanExpression(expr)}.webp`,
    fallbackUrl: '/laura/story-bab/normal.webp',
    containerClassName:
      'col-start-1 row-start-1 h-[55vh] md:h-[60vh] landscape:h-[70vh] aspect-[2/3] drop-shadow-[0_20px_40px_rgba(150,150,200,0.3)] animate-[float_3s_ease-in-out_infinite]',
    bounded: true,
    imgClassName:
      'absolute inset-0 w-full h-full object-contain object-bottom origin-bottom mx-auto scale-[1.75] md:scale-[1.95] translate-y-[40%] md:translate-y-[50%]',
  },
  Enji: {
    url: (expr) => `/enji/${cleanExpression(expr)}.webp`,
    fallbackUrl: '/enji/normal.webp',
    containerClassName:
      'col-start-1 row-start-1 h-[55vh] md:h-[60vh] landscape:h-[70vh] aspect-[2/3] drop-shadow-[0_20px_40px_rgba(100,120,150,0.3)] animate-[float_3s_ease-in-out_infinite]',
    bounded: true,
    imgClassName:
      'absolute inset-0 w-full h-full object-contain object-bottom scale-[1.75] md:scale-[1.95] translate-y-[8%] md:translate-y-[11%]',
  },
  Ayame: {
    url: (expr) => `/ayame/${cleanExpression(expr)}.webp`,
    fallbackUrl: '/ayame/normal.webp',
    containerClassName: FULLSCREEN_LAYER,
    imgClassName: FULLSCREEN_IMG,
  },
  Rikuto: {
    url: () => '/ayame/rikuto.webp',
    containerClassName: FULLSCREEN_LAYER,
    imgClassName: FULLSCREEN_IMG,
  },
  Naomi: {
    url: (expr) => getNaomiSpriteUrl(expr),
    fallbackUrl: '/naomi/normal.webp',
    containerClassName: FULLSCREEN_LAYER,
    imgClassName: FULLSCREEN_IMG,
  },
};

export const NPC_SPEAKERS = Object.keys(NPC_STYLES);
