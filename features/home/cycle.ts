/**
 * Siklus haid & statistik turunan Livia (M5.1).
 *
 * Dipindah apa adanya dari HomeClient agar komponen hanya mengkomposisikan
 * UI. Fungsi murni = bisa diuji tanpa browser.
 */

export type CyclePhase = 'Menstruasi' | 'Folikuler' | 'Ovulasi' | 'Luteal';

/** Hari siklus 1–28 dari tanggal anchor (verbatim dari versi lama). */
export function calculateCycleDay(anchorString: string): number {
  if (!anchorString) return 1;
  const anchorDate = new Date(anchorString);
  anchorDate.setHours(0, 0, 0, 0);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor(
    (nowDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return ((daysDiff % 28) + 28) % 28 + 1;
}

export function getCyclePhase(cycleAnchor: string): CyclePhase {
  const dayOfCycle = calculateCycleDay(cycleAnchor);
  if (dayOfCycle <= 5) return 'Menstruasi';
  if (dayOfCycle <= 14) return 'Folikuler';
  if (dayOfCycle <= 17) return 'Ovulasi';
  return 'Luteal';
}

export type CycleInfo = {
  phase: CyclePhase;
  color: string;
  day: number;
};

export function getCycleInfo(cycleAnchor: string): CycleInfo {
  const day = calculateCycleDay(cycleAnchor);
  switch (getCyclePhase(cycleAnchor)) {
    case 'Menstruasi':
      return { phase: 'Menstruasi', color: 'text-red-500 bg-red-50 border-red-200', day };
    case 'Folikuler':
      return { phase: 'Folikuler', color: 'text-pink-500 bg-pink-50 border-pink-200', day };
    case 'Ovulasi':
      return { phase: 'Ovulasi', color: 'text-purple-500 bg-purple-50 border-purple-200', day };
    default:
      return { phase: 'Luteal', color: 'text-amber-500 bg-amber-50 border-amber-200', day };
  }
}

export type LiviaStats = {
  hunger: number;
  energy: number;
  hydration: number;
  cycleAnchor: string;
};

/**
 * Rumus stres/mood/sabar — angka dipertahankan persis dari versi lama karena
 * menentukan rasa interaksi harian.
 */
export function computePsychStats(
  liviaStats: LiviaStats,
  affection: number,
  cycle: CycleInfo
): { stress: number; mood: number; tolerance: number } {
  const stress = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (100 - liviaStats.hunger) * 0.35 +
          (100 - liviaStats.energy) * 0.35 +
          (100 - liviaStats.hydration) * 0.3 +
          (cycle.phase === 'Menstruasi' ? 25 : cycle.phase === 'Luteal' ? 15 : cycle.phase === 'Ovulasi' ? -10 : -5)
      )
    )
  );

  const mood = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        100 -
          stress * 0.5 +
          affection * 0.3 +
          (cycle.phase === 'Ovulasi' ? 20 : cycle.phase === 'Folikuler' ? 10 : cycle.phase === 'Menstruasi' ? -20 : -10)
      )
    )
  );

  const tolerance = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        affection * 0.6 +
          (100 - stress) * 0.35 +
          (cycle.phase === 'Ovulasi' ? 30 : cycle.phase === 'Menstruasi' ? -35 : cycle.phase === 'Luteal' ? -15 : 10)
      )
    )
  );

  return { stress, mood, tolerance };
}

/** Latar belakang home sesuai jam (verbatim). */
export function getHomeBackground(hour: number): string {
  if (hour >= 5 && hour < 15) return '/bg/home screen/home_morning.webp';
  if (hour >= 15 && hour < 18) return '/bg/home screen/home_afternoon.webp';
  return '/bg/home screen/home_night.webp';
}
