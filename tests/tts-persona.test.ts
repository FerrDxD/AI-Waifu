import { describe, it, expect } from 'vitest';
import {
  MOODS,
  MOOD_PLAYBACK_RATE,
  MOOD_VOICE_SETTINGS,
  detectMood,
  playbackRateForMood,
  voiceSettingsForMood,
  type Mood,
} from '@/lib/tts/persona';

/**
 * Unit test persona suara dinamis (M6.5).
 *
 * Semua fungsi di sini PURE — deterministik, tanpa DB/jaringan. Yang
 * dipatok oleh test:
 *  - perilaku deteksi (keyword, kata-utuh, prioritas, tie-break);
 *  - bentuk & rentang parameter (0..1) agar tidak mengirim nilai ilegal
 *    ke ElevenLabs;
 *  - `neutral` SAMA PERSIS dengan baseline M6.1/M6.4 (regresi: kalimat
 *    netral harus terdengar seperti sebelum M6.5).
 */

describe('detectMood', () => {
  it('setiap mood bisa terdeteksi dari kalimat khasnya', () => {
    const cases: Array<[string, Mood]> = [
      ['Yeyy, hore! Aku senang banget!', 'happy'],
      ['Wooo gila! Beneran?!', 'excited'],
      ['Kamu bego banget, berisik!', 'angry'],
      ['Aku sedih dan kecewa sama kamu hari ini.', 'sad'],
      ['Aduh seram, aku takut sekali!', 'scared'],
      ['Aku kangen kamu, peluk ya sayang.', 'tender'],
    ];
    for (const [text, mood] of cases) {
      expect(detectMood(text), text).toBe(mood);
    }
  });

  it('teks tanpa keyword → neutral', () => {
    expect(detectMood('Halo, apa kabar hari ini?')).toBe('neutral');
    expect(detectMood('Buka pintunya tolong.')).toBe('neutral');
  });

  it('kosong / cuma spasi → neutral', () => {
    expect(detectMood('')).toBe('neutral');
    expect(detectMood('   ')).toBe('neutral');
  });

  it('case-insensitif', () => {
    expect(detectMood('SENANG BANGET')).toBe('happy');
    expect(detectMood('Kamu Bego!')).toBe('angry');
  });

  it('cocok kata UTUH — "maaf" tidak terhitung di "maafkan"', () => {
    // "maaf" = keyword sad; "maafkan" seharusnya netral.
    expect(detectMood('Maafkan aku ya.')).toBe('neutral');
    expect(detectMood('Maaf aku telat.')).toBe('sad');
  });

  it('jumlah keyword lebih besar menang dari prioritas', () => {
    // angry (3 keyword berbeda) mengalahkan scared (1) walau scared lebih
    // "mendesak" di prioritas. (Hitung per KEYWORD, bukan per kemunculan.)
    expect(detectMood('Aku takut! Kamu marah, bodoh, berisik.')).toBe('angry');
  });

  it('tie jumlah keyword → mood lebih mendesak menang (scared > sad)', () => {
    expect(detectMood('Aku takut dan sedih.')).toBe('scared');
  });

  it('emoji dihitung sebagai keyword', () => {
    expect(detectMood('Hore 😊')).toBe('happy');
  });
});

describe('MOOD_VOICE_SETTINGS', () => {
  it('setiap mood punya settings lengkap', () => {
    for (const mood of MOODS) {
      expect(MOOD_VOICE_SETTINGS[mood], mood).toBeDefined();
    }
  });

  it('semua nilai numerik dalam rentang legal ElevenLabs [0, 1]', () => {
    for (const mood of MOODS) {
      const s = MOOD_VOICE_SETTINGS[mood];
      for (const key of ['stability', 'similarity_boost', 'style'] as const) {
        expect(s[key], `${mood}.${key}`).toBeGreaterThanOrEqual(0);
        expect(s[key], `${mood}.${key}`).toBeLessThanOrEqual(1);
      }
      expect(typeof s.use_speaker_boost, mood).toBe('boolean');
    }
  });

  it('neutral = baseline lama M6.1 (regresi — tidak boleh drift)', () => {
    expect(MOOD_VOICE_SETTINGS.neutral).toEqual({
      stability: 0.4,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    });
  });

  it('happy lebih ekspresif (style) dari neutral — "energik"', () => {
    expect(MOOD_VOICE_SETTINGS.happy.style).toBeGreaterThan(MOOD_VOICE_SETTINGS.neutral.style);
  });

  it('scared lebih dinamis (stability lebih rendah) dari neutral — "cepat"', () => {
    expect(MOOD_VOICE_SETTINGS.scared.stability).toBeLessThan(MOOD_VOICE_SETTINGS.neutral.stability);
  });

  it('sad lebih stabil/lembut (stability lebih tinggi) dari neutral', () => {
    expect(MOOD_VOICE_SETTINGS.sad.stability).toBeGreaterThan(MOOD_VOICE_SETTINGS.neutral.stability);
  });

  it('voiceSettingsForMood mengembalikan entry sesuai mood', () => {
    expect(voiceSettingsForMood('happy')).toEqual(MOOD_VOICE_SETTINGS.happy);
    expect(voiceSettingsForMood('neutral')).toEqual(MOOD_VOICE_SETTINGS.neutral);
  });
});

describe('MOOD_PLAYBACK_RATE', () => {
  it('setiap mood punya rate positif & wajar (0.5–1.5)', () => {
    for (const mood of MOODS) {
      const rate = MOOD_PLAYBACK_RATE[mood];
      expect(rate, mood).toBeGreaterThan(0.5);
      expect(rate, mood).toBeLessThan(1.5);
    }
  });

  it('neutral = 1.0 (regresi — tempo tidak berubah)', () => {
    expect(MOOD_PLAYBACK_RATE.neutral).toBe(1.0);
    expect(playbackRateForMood('neutral')).toBe(1.0);
  });

  it('scared lebih cepat, sad lebih lambat dari netral', () => {
    expect(MOOD_PLAYBACK_RATE.scared).toBeGreaterThan(1);
    expect(MOOD_PLAYBACK_RATE.sad).toBeLessThan(1);
  });

  it('happy & excited sedikit lebih cepat; tender lebih lambat', () => {
    expect(MOOD_PLAYBACK_RATE.happy).toBeGreaterThan(1);
    expect(MOOD_PLAYBACK_RATE.excited).toBeGreaterThan(1);
    expect(MOOD_PLAYBACK_RATE.tender).toBeLessThan(1);
  });
});

describe('konsistensi mood ↔ teks', () => {
  it('deteksi deterministik (teks sama → mood sama)', () => {
    const text = 'Aku senang banget hari ini!';
    expect(detectMood(text)).toBe(detectMood(text));
  });

  it('setiap mood di MOODS terdeteksi oleh paling sedikit satu kalimat', () => {
    // Guard anti-regresi: keyword list tidak boleh jadi kosong/mandek.
    const samples: Record<Mood, string> = {
      neutral: 'Halo, apa kabar?',
      happy: 'Aku senang!',
      excited: 'Wooo, beneran?!',
      angry: 'Bego!',
      sad: 'Aku sedih.',
      scared: 'Aku takut.',
      tender: 'Aku kangen kamu.',
    };
    for (const mood of MOODS) {
      expect(detectMood(samples[mood]), mood).toBe(mood);
    }
  });
});
