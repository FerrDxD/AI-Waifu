import { describe, it, expect } from 'vitest';
import { characters, getCharacter } from '@/lib/characters/registry';
import { hasFeature } from '@/lib/characters/registry';
import { assertFeature } from '@/lib/characters/gates';
import {
  buildSummaryInstructions,
} from '@/lib/livia/summary';
import { buildConsolidationInstructions } from '@/lib/livia/memory';
import {
  getCompanionGreeting,
} from '@/features/home/greeting';
import { AppError } from '@/lib/errors';

/**
 * M8.2 Phase B: kontrak fitur per karakter.
 *
 * Karakter selain Livia adalah companion (chat, kencan, afeksi, memori).
 * Sistem life-sim, bab cerita, dan panggilan suara hanya Livia. Uji ini
 * menjaga keputusan itu tetap data-driven — kalau owner menambah karakter
 * baru dengan lifeSim: true, uji ini sengaja gagal supaya konten dipastikan
 * ada dulu.
 */
describe('fitur per karakter (data-driven)', () => {
  it('hanya Livia yang punya lifeSim, story, dan voiceCall', () => {
    for (const character of characters) {
      const lifeSim = hasFeature(character, 'lifeSim');
      const story = hasFeature(character, 'story');
      const voiceCall = hasFeature(character, 'voiceCall');
      if (character.id === 'livia') {
        expect(lifeSim).toBe(true);
        expect(story).toBe(true);
        expect(voiceCall).toBe(true);
      } else {
        expect(lifeSim).toBe(false);
        expect(story).toBe(false);
        expect(voiceCall).toBe(false);
      }
    }
  });

  it('setiap karakter punya blok memory + dating yang lengkap', () => {
    for (const character of characters) {
      expect(character.memory.consolidationPersona.length).toBeGreaterThan(0);
      expect(character.memory.summaryIdentity.length).toBeGreaterThan(0);
      expect(character.memory.summaryPerspective.length).toBeGreaterThan(0);
      expect(character.memory.speakerLabel.length).toBeGreaterThan(0);
      expect(character.dating.intro.length).toBeGreaterThan(0);
      expect(character.dating.enPersonalityPhrase.length).toBeGreaterThan(0);
    }
  });

  it('setiap karakter punya sprite folder + ekspresi default', () => {
    for (const character of characters) {
      expect(character.sprite.folder.length).toBeGreaterThan(0);
      expect(character.sprite.defaultExpression.length).toBeGreaterThan(0);
    }
  });
});

describe('gerbang fitur (assertFeature)', () => {
  it('Livia lolos semua gerbang', () => {
    const livia = getCharacter('livia');
    expect(() => assertFeature(livia, 'lifeSim')).not.toThrow();
    expect(() => assertFeature(livia, 'story')).not.toThrow();
    expect(() => assertFeature(livia, 'voiceCall')).not.toThrow();
  });

  it('karakter companion ditolak di gerbang lifeSim/story/voiceCall', () => {
    for (const character of characters) {
      if (character.id === 'livia') continue;
      for (const feature of ['lifeSim', 'story', 'voiceCall'] as const) {
        try {
          assertFeature(character, feature);
          throw new Error(`harusnya ditolak: ${character.id}/${feature}`);
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          const appError = error as AppError;
          expect(appError.code).toBe('FEATURE_LOCKED');
          expect(appError.statusCode).toBe(403);
          expect(appError.expose).toBe(true);
        }
      }
    }
  });

  it('pesan penolakan menyebut Livia dan bisa diajak chat/kencan', () => {
    const ayame = getCharacter('ayame');
    try {
      assertFeature(ayame, 'story');
    } catch (error) {
      const message = (error as AppError).message;
      expect(message).toContain('Livia');
      expect(message).toContain('chat');
      expect(message).toContain('kencan');
    }
  });
});

/**
 * Regression: instruksi summarizer & konsolidasi untuk Livia harus tetap
 * identik dengan teks hardcode lama (evals memeriksa marker persona).
 */
describe('instruksi memori Livia tidak berubah', () => {
  it('buildSummaryInstructions(livia) identik dengan instruksi lama', () => {
    const text = buildSummaryInstructions(getCharacter('livia'));
    const expected = `
Kamu adalah pencatat memori jangka panjang untuk karakter wanita bernama Livia
yang menjalani hubungan jangka panjang dengan satu user. Rekap percakapan
berikut menjadi catatan 3-5 kalimat Bahasa Indonesia DARI SUDUT PANDANG LIVIA.
Fokus pada:
- fakta tentang user (nama panggilan, hobi, kerjaan, makanan kesukaan)
- janji atau rencana bersama (sudah / belum selesai)
- konflik atau perasaan yang masih menggantung
JANGAN menceritakan ulang obrolan detik per detik. Hanya kembalikan JSON
{"summary":"..."}`;
    expect(text).toBe(expected);
  });

  it('buildConsolidationInstructions(livia) identik dengan instruksi lama', () => {
    const text = buildConsolidationInstructions(getCharacter('livia'));
    const expected = `
Kamu adalah Livia, perempuan tsundere yang menjalani hubungan jangka panjang
dengan satu user. Kamu sedang "merenung" sendirian, memikirkan hal-hal yang
kamu ingat tentang User.

Di bawah ini beberapa catatan memori lama tentang User. Padatkan menjadi SATU
ingatan yang utuh dari sudut pandangmu sendiri:
- pertahankan fakta penting (nama, kebiasaan, alergi, janji yang belum selesai)
- boleh menyebut perasaanmu tentang fakta itu, tetap dalam suara Livia
- jangan mengarang fakta yang tidak ada di catatan
- 2-4 kalimat Bahasa Indonesia

Kembalikan HANYA JSON {"memory":"..."}`;
    expect(text).toBe(expected);
  });

  it('instruksi non-Livia memakai identitas karakternya, bukan Livia', () => {
    const ayame = getCharacter('ayame');
    expect(buildSummaryInstructions(ayame)).toContain('Ayame');
    expect(buildSummaryInstructions(ayame)).not.toContain('Livia');
    expect(buildConsolidationInstructions(ayame)).toContain('Ayame');
    expect(buildConsolidationInstructions(ayame)).not.toContain('Livia');
  });
});

describe('sapaan companion (fallback non-Livia)', () => {
  it('menyebut nama karakter, bukan kepribadian Livia', () => {
    const ayame = getCharacter('ayame');
    // Afeksi tinggi → semua cabang jam memakai nama karakter (close=true).
    const greeting = getCompanionGreeting(ayame, 80, 'Pemain');
    expect(greeting.text).toContain('Ayame');
    expect(greeting.text).not.toContain('aku lagi berenergi'); // jadwal Livia
  });

  it('mengikuti waktu saat ini dan mengembalikan ekspresi valid', () => {
    const naomi = getCharacter('naomi');
    const greeting = getCompanionGreeting(naomi, 60, 'Pemain');
    expect(typeof greeting.text).toBe('string');
    expect(greeting.text.length).toBeGreaterThan(0);
    expect(['normal', 'happy', 'blushing', 'clingy', 'angry']).toContain(
      greeting.expression
    );
  });
});
