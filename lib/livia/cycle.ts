/**
 * Siklus menstruasi Livia — satu-satunya sumber logika (M2.3).
 *
 * Dulu logika ini di-**copy-paste identik di 3 route** (`app/api/chat`,
 * `app/api/date`, `app/api/date/chat`). Kalau aturan berubah (mis. siklus
 * 30 hari), harus diingat di 3 tempat. Sekarang satu fungsi murni supaya
 * bisa diuji dan dihitung ulang konsisten.
 */

export const CYCLE_LENGTH_DAYS = 28;

export type CyclePhase = 'Menstruasi' | 'Folikuler' | 'Ovulasi' | 'Luteal';

export interface CycleInfo {
  /** 1..28 (hari ke-1 = hari pertama haid). */
  dayOfCycle: number;
  phase: CyclePhase;
}

/**
 * Hitung hari ke-siklus dari `liviaCycleAnchor`.
 *
 * `anchor` boleh null/kosong → hitung dari sekarang (hari ke-1).
 * Perhitungan pakai `Math.floor`, sama seperti sebelumnya, supaya tidak ada
 * perubahan perilaku. Hasil selalu 1..28.
 */
export function getCycleInfo(anchor?: Date | string | null, now: Date = new Date()): CycleInfo {
  const anchorTime = anchor ? new Date(anchor).getTime() : now.getTime();
  if (Number.isNaN(anchorTime)) {
    return { dayOfCycle: 1, phase: 'Menstruasi' };
  }

  const daysDiff = Math.floor((now.getTime() - anchorTime) / (1000 * 60 * 60 * 24));
  const dayOfCycle = (((daysDiff % CYCLE_LENGTH_DAYS) + CYCLE_LENGTH_DAYS) % CYCLE_LENGTH_DAYS) + 1;

  let phase: CyclePhase = 'Luteal';
  if (dayOfCycle <= 5) phase = 'Menstruasi';
  else if (dayOfCycle <= 14) phase = 'Folikuler';
  else if (dayOfCycle <= 17) phase = 'Ovulasi';

  return { dayOfCycle, phase };
}

/**
 * Konteks fisiologis untuk prompt (dipakai `lib/ai/persona.ts`).
 * Statistik hunger/energy/hydration dipetakan jadi kata sifat + teks yang
 * memengaruhi nada karakter. Nama karakter dipasang dari registry (M8.2
 * Phase A); default "Livia" mempertahankan output lama.
 */
export function describePhysiologicalState(input: {
  stats: { hunger: number; energy: number; hydration: number; cyclePhase: string; cycleDay: number };
  voiceCall?: boolean;
  includeBehaviorHint?: boolean;
  name?: string;
}): string {
  const { stats } = input;
  const name = input.name ?? 'Livia';
  const hungerState =
    stats.hunger < 20 ? 'SANGAT KELAPARAN' : stats.hunger < 50 ? 'Lapar' : 'Kenyang';
  const energyState =
    stats.energy < 20 ? 'SANGAT KELELAHAN' : stats.energy < 50 ? 'Capek' : 'Berenergi';
  const hydrationState =
    stats.hydration < 20 ? 'SANGAT DEHIDRASI/HAUS' : stats.hydration < 50 ? 'Haus' : 'Cukup Minum';
  const cycleState =
    stats.cyclePhase === 'Menstruasi'
      ? 'Sedang HAID (perut kram, mood sangat buruk, mudah marah)'
      : stats.cyclePhase === 'Luteal'
        ? 'Sedang PMS (sensitif, mood swing parah, gampang emosi)'
        : stats.cyclePhase === 'Ovulasi'
          ? 'Masa Ovulasi (lebih clingy dan cari perhatian)'
          : 'Siklus Normal';

  let context = `\nKondisi Fisik & Biologis ${name} Saat Ini:
- Siklus Menstruasi: ${cycleState} (Hari ke-${stats.cycleDay})
- Tingkat Lapar: ${hungerState} (${stats.hunger}/100)
- Tingkat Energi: ${energyState} (${stats.energy}/100)
- Tingkat Hidrasi: ${hydrationState} (${stats.hydration}/100)`;

  if (input.includeBehaviorHint !== false) {
    context += `\nPENTING: Kondisi fisik ini HARUS sangat mempengaruhi nada bicara ${name}! Jika ia lapar/haus/capek atau sedang PMS/Haid, ia akan JAUH LEBIH galak, ketus, marah-marah, mengeluh, atau bahkan mendiamkan user. Jika ia sedang Ovulasi, ia lebih manja.`;
  }

  if (input.voiceCall) {
    context += `\nINI PANGGILAN TELEPON SUARA — gunakan kata-kata lisan ("Hahaha", "Eh?!", "Ck", "Huft"), JANGAN tanda bintang untuk aksi fisik, karena teks akan dibaca mesin Text-to-Speech.`;
  }

  return context;
}
