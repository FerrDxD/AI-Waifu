/**
 * Akumulasi transkrip Web Speech API (M6.3).
 *
 * Pure & isomorphic — dipakai dua konsumen:
 *  - `CallSession` (lib/call) — continuous listening di voice call.
 *  - `useSpeechRecognition` (lib/speech) — diktasi di halaman chat.
 *
 * Aturan akumulasi tidak sepele: `event.results` berisi SELURUH hasil sesi
 * recognition (bukan delta), dan interim terus diperbarui di tempat. Maka
 * tiap event transkrip di-REBUILD dari nol — append per event akan
 * mendouble hitung.
 */

/** Bentuk event `onresult` Web Speech API (subset yang dipakai). */
export type RecognitionResultEvent = {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  resultIndex: number;
};

export type TranscriptSnapshot = {
  /** Hasil final (sudah pasti) dari sesi recognition ini. */
  final: string;
  /** Hasil interim (masih bisa berubah). */
  interim: string;
  /** `final + interim` dirapikan — isi transkrip saat ini. */
  full: string;
};

export function collectTranscript(
  event: RecognitionResultEvent
): TranscriptSnapshot {
  let final = '';
  let interim = '';
  for (let i = 0; i < event.results.length; i++) {
    const r = event.results[i];
    const t = r?.[0]?.transcript ?? '';
    if (r?.isFinal) final += t;
    else interim += t;
  }
  return { final, interim, full: (final + interim).trim() };
}
