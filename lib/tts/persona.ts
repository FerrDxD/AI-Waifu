/**
 * Persona suara dinamis (M6.5) — voice settings ElevenLabs menyesuaikan
 * suasana (mood) kalimat.
 *
 * **Kenapa dari teks, bukan `expression` turn-level?**
 * Di voice call (M6.1), kalimat disintesis & diputar SEWAKTU stream `delta`
 * masih mengalir — jauh sebelum event `done` (yang membawa `expression`)
 * tiba. Pakai `expression` untuk TTS streaming = audio sudah keburu keluar
 * dengan suara netral. Maka mood dideteksi dari TEKS kalimatnya sendiri,
 * yang berkorelasi dengan ekspresi yang dimaksud Livia.
 *
 * **Scope**: `detectMood` + `voiceSettingsForMood` adalah fungsi PURE &
 * isomorphic (tanpa DB/crypto) — bisa diuji deterministik dan dipakai di
 * route. Parameter-nya heuristik & tunable; angka persisnya bukan kontrak.
 *
 * **Catatan cache**: mood adalah fungsi deterministik dari teks, jadi key
 * cache `ttsCacheKey(text, voice, model, mood)` tetap unik per (teks, mood)
 * tanpa bergantung urutan — detail di `lib/tts/cache.ts`.
 */

/** Suasana yang bisa dideteksi dari teks (subset yang memengaruhi suara). */
export type Mood =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'angry'
  | 'sad'
  | 'scared'
  | 'tender';

export const MOODS: readonly Mood[] = [
  'neutral',
  'happy',
  'excited',
  'angry',
  'sad',
  'scared',
  'tender',
];

/** `voice_settings` ElevenLabs (semua numerik dalam rentang [0, 1]). */
export type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
};

/**
 * Pemetaan mood → `voice_settings`.
 *
 * Heuristik (tunable):
 *  - `style` tinggi = lebih ekspresif/energik (happy, excited).
 *  - `stability` rendah = lebih dinamis/terburu (excited, scared → "cepat").
 *  - `stability` tinggi = lebih stabil/lembut (sad, tender, neutral).
 *  - `similarity_boost` tinggi = lebih mirip voice dasar.
 *
 * `neutral` disengaja SAMA PERSIS dengan setting lama (M6.1/M6.4) supaya
 * kalimat netral terdengar persis seperti sebelum M6.5.
 */
export const MOOD_VOICE_SETTINGS: Record<Mood, VoiceSettings> = {
  neutral: { stability: 0.4, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
  happy: { stability: 0.25, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true },
  excited: { stability: 0.1, similarity_boost: 0.75, style: 0.7, use_speaker_boost: true },
  angry: { stability: 0.2, similarity_boost: 0.85, style: 0.5, use_speaker_boost: true },
  sad: { stability: 0.7, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true },
  scared: { stability: 0.3, similarity_boost: 0.7, style: 0.5, use_speaker_boost: true },
  tender: { stability: 0.55, similarity_boost: 0.9, style: 0.25, use_speaker_boost: true },
};

/** Ambil `voice_settings` untuk sebuah mood (fallback `neutral`). */
export function voiceSettingsForMood(mood: Mood): VoiceSettings {
  return MOOD_VOICE_SETTINGS[mood] ?? MOOD_VOICE_SETTINGS.neutral;
}

/**
 * Kecepatan playback per mood (diterapkan di client, `lib/tts/pipeline.ts`).
 *
 * ElevenLabs `voice_settings` tidak punya parameter kecepatan — cara tunggal
 * mengubah tempo adalah `HTMLAudioElement.playbackRate`. `preservesPitch =
 * true` (di pipeline) membuat hanya tempo yang berubah, bukan nada.
 * `neutral` = 1.0 (persis perilaku M6.1–M6.4).
 */
export const MOOD_PLAYBACK_RATE: Record<Mood, number> = {
  neutral: 1.0,
  happy: 1.02,
  excited: 1.08,
  angry: 1.05,
  sad: 0.92,
  scared: 1.15,
  tender: 0.96,
};

/** Ambil kecepatan playback untuk sebuah mood (fallback `neutral`). */
export function playbackRateForMood(mood: Mood): number {
  const rate = MOOD_PLAYBACK_RATE[mood] ?? MOOD_PLAYBACK_RATE.neutral;
  return Number.isFinite(rate) && rate > 0 ? rate : 1.0;
}

/**
 * Kata kunci per mood (bahasa Indonesia + emoji). Dicocokkan case-insensitif
 * sebagai substring kata (lihat `countMoodHits`). Daftar sengaja sederhana &
 * dapat ditambah — ini heuristik, bukan NLP.
 */
const MOOD_KEYWORDS: Record<Exclude<Mood, 'neutral'>, string[]> = {
  happy: [
    'senang', 'bahagia', 'yey', 'yay', 'hore', 'hebat', 'bagus', 'terima kasih',
    'makasih', 'puas', 'asik', 'seru', 'hehe', 'wkwk', '😊', '🥰', '😄',
  ],
  excited: [
    'wooo', 'wow', 'gila', 'beneran', 'serius?', 'ga nyangka', 'nggak nyangka',
    'kaget', '🎉', '🤩',
  ],
  angry: [
    'marah', 'bego', 'bodoh', 'berisik', 'sabar', 'caper', 'jijik', 'sial',
    'kesel', 'bete', 'sebal', 'jangan', 'udah dong', '😠', '💢',
  ],
  sad: ['sedih', 'kecewa', 'maaf', 'sorry', 'pilu', 'galau', 'sendiri', 'lelah', 'sepi', '😢', '💔'],
  scared: ['takut', 'seram', 'ngeri', 'was-was', 'deg-degan', 'panik', '😱', '🫣'],
  tender: ['sayang', 'cinta', 'kangen', 'peluk', 'aku di sini', '💕', '🫶'],
};

/** Urut prioritas saat dua mood sama-sama terdeteksi (lebih "mendesak" duluan). */
const MOOD_PRIORITY: readonly Mood[] = [
  'scared',
  'angry',
  'excited',
  'sad',
  'tender',
  'happy',
];

/**
 * Deteksi mood dari teks. Deterministik:
 *  - Tidak ada keyword → `neutral`.
 *  - Satu mood → mood itu.
 *  - Beberapa mood (jumlah keyword setara) → yang paling atas di `MOOD_PRIORITY`.
 */
export function detectMood(text: string): Mood {
  const normalized = text.toLowerCase();
  if (!normalized.trim()) return 'neutral';

  let best: Mood = 'neutral';
  let bestCount = 0;

  for (const mood of MOOD_PRIORITY) {
    const keywords = MOOD_KEYWORDS[mood as Exclude<Mood, 'neutral'>];
    let count = 0;
    for (const kw of keywords) {
      // Cocokkan sebagai kata utuh (diapit non-huruf) supaya "maaf" tidak
      // terhitung di "maafkan" dst. — substring longgar justru menimbulkan
      // false positive. Emoji dikecualikan dari aturan kata-utuh.
      if (isEmoji(kw)) {
        if (normalized.includes(kw)) count += 1;
      } else if (wordBoundaryMatch(normalized, kw)) {
        count += 1;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      best = mood;
    }
  }

  return best;
}

/** Apakah token ini emoji (bukan kata) → dicocokkan sebagai substring. */
function isEmoji(token: string): boolean {
  // Token keyword non-ASCII (emoji) — kata Indonesia selalu ASCII.
  return /[^\x00-\x7F]/.test(token);
}

/**
 * Cocokkan `keyword` sebagai KATA UTUH di `text` (case-insensitif, sudah
 * dinormalisasi). Kata boleh mengandung spasi/ tanda (mis. "terima kasih",
 * "serius?").
 */
function wordBoundaryMatch(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Batas kata: awal/string, atau karakter non-huruf-angka di kiri;
  // dan akhir/string, atau non-huruf-angka di kanan.
  const re = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`);
  return re.test(text);
}
