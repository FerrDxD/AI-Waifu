/**
 * Reaksi Livia saat disentuh per-tubuh (M5.1).
 *
 * Dipindah verbatim dari handler HomeClient. Tabel ini adalah sebagian besar
 * kepribadian interaksi sentuh — harus tetap persis: teks, ekspresi, dan
 * perubahan afeksi (positif saat ovulasi, negatif di fase lain).
 */

import type { LiviaExpression } from '@/lib/gemini';
import type { Character } from '@/lib/characters/registry';
import { pickRandom } from './greeting';

export type BodyPart = 'head' | 'chest' | 'belly' | 'thigh';

export type TouchReaction = {
  text: string;
  expression: LiviaExpression;
  affectionChange: number;
};

export function getTouchReaction(
  cyclePhase: string,
  part: BodyPart,
  userName: string
): TouchReaction {
  const u = userName;

  if (cyclePhase === 'Ovulasi') {
    if (part === 'head') {
      const texts = [
        `Nnn... enak banget elusanmu... elus kepalaku lagi dong, ${u}...`,
        `A-ahh... tanganmu hangat banget... jangan berhenti ya...`,
        `Hehe... aku lagi seneng banget dideketin kamu hari ini...`
      ];
      return { text: pickRandom(texts), expression: 'blushing', affectionChange: 2 };
    } else if (part === 'chest') {
      const texts = [
        `A-ahh... h-hangat... k-kok berhenti? S-sentuh lagi dong, ${u}...`,
        `Nnn... jangan dilepas tangannya... hari ini aku lagi pengen dekat banget sama kamu...`,
        `E-eh... rasanya nyaman... jangan berhenti ya...`
      ];
      return { text: pickRandom(texts), expression: 'blushing', affectionChange: 4 };
    } else if (part === 'belly') {
      const texts = [
        `Hehe geli... tapi hangat... elus perutku lagi dong, ${u}...`,
        `Nnn... kok cuma sebentar? Sentuh lagi...`,
        `A-aku nggak marah kok hari ini... elus lagi ya...`
      ];
      return { text: pickRandom(texts), expression: 'blushing', affectionChange: 2 };
    } else {
      const texts = [
        `A-ahh... p-pahaku... sentuh lagi... jangan berhenti ya, ${u}...`,
        `Nnn... kenapa berhenti? Raba lagi dong...`,
        `H-hari ini aku nggak bisa nolak sentuhanmu... dekat-dekat terus sama aku ya...`
      ];
      return { text: pickRandom(texts), expression: 'clingy', affectionChange: 4 };
    }
  }

  if (cyclePhase === 'Menstruasi') {
    if (part === 'head') {
      const texts = [
        `Aduh jangan sentuh kepalaku! Kepalaku lagi pusing dan perutku kram tau!`,
        `Jangan pegang-pegang! Aku lagi sensitif banget hari ini!`,
        `Lepas tanganmu, ${u}! Moodku lagi hancur!`
      ];
      return { text: pickRandom(texts), expression: 'angry', affectionChange: -1 };
    } else {
      const texts = [
        `JANGAN SENTUH AKU! Aku lagi haid, jangan sampai emosiku meledak ya!!`,
        `Tanganmu jauh-jauh!! Pinggang dan perutku lagi sakit semua tau!`,
        `Berani nyentuh lagi kuremas tanganmu sampai patah!!`
      ];
      return { text: pickRandom(texts), expression: 'angry', affectionChange: -3 };
    }
  }

  if (part === 'head') {
    const texts = [
      "E-eh?! Jangan elus-elus kepalaku dong...",
      "A-apa sih... tanganmu hangat...",
      `Jangan mikir aku suka diginiin ya, ${u}!`,
      "R-rambutku berantakan tau..."
    ];
    return { text: pickRandom(texts), expression: 'blushing', affectionChange: 1 };
  } else if (part === 'chest') {
    const texts = [
      "H-hei! Dasar mesum! Tanganmu mau kupatahkan?!",
      "M-mata dan tanganmu itu dijaga ya!",
      `${u} mau mati sekarang juga?!`,
      "K-kyyaa! Jangan sentuh dadaku bodoh!"
    ];
    return { text: pickRandom(texts), expression: 'angry', affectionChange: -2 };
  } else if (part === 'belly') {
    const texts = [
      "Geli tau! Jauhkan tanganmu dari perutku!",
      `${u} ngapain sih?! Dasar aneh!`,
      "A-aku nggak gemuk kok! Jangan pegang-pegang!",
      "Hentikan! Atau aku beneran panggil polisi!"
    ];
    return { text: pickRandom(texts), expression: 'angry', affectionChange: -1 };
  } else {
    const texts = [
      "T-tanganmu nyentuh pahaku! Dasar cabul!",
      "M-mau kutendang wajahmu?!",
      `Jangan coba-coba meraba-raba ke bawah ya, ${u}!`,
      "K-kotor! Jauhkan tanganmu!"
    ];
    return { text: pickRandom(texts), expression: 'angry', affectionChange: -2 };
  }
}

/**
 * Reaksi sentuh generik untuk karakter companion (M8.2 Phase B).
 *
 * Karakter companion mempertahankan *mekanik* sentuhan Livia (kepala +1,
 * area sensitif negatif) supaya afeksi tetap konsisten, tapi teksnya netral
 * dan memakai nama karakter dari registry.
 */
export function getCompanionTouchReaction(
  character: Character,
  part: BodyPart,
  userName: string
): TouchReaction {
  const n = character.shortName;

  if (part === 'head') {
    const texts = [
      `E-eh?! Kepala ${n} bukan pelukanmu lho...`,
      `H-hangat tanganmu... tapi jangan terus-terusan!`,
      `${userName} aneh ya, tiba-tiba elus kepala ${n}.`,
      `A-apa sih... ${n} bukan anak kucing.`,
    ];
    return { text: pickRandom(texts), expression: 'blushing', affectionChange: 1 };
  }
  if (part === 'chest') {
    const texts = [
      'H-hei! Tanganmu itu dijaga!',
      `Mau ${n} marah?! Jangan sentuh sembarangan!`,
      `${userName}?! Dada ${n} bukan area bebas!`,
      'K-kyyaa! Berani-beraninya!',
    ];
    return { text: pickRandom(texts), expression: 'angry', affectionChange: -2 };
  }
  if (part === 'belly') {
    const texts = [
      'Geli tau! Jauhkan tanganmu!',
      `${userName} ngapain sih?!`,
      'A-ambil tanganmu dari perutku sekarang!',
      `Hentikan! Perut ${n} bukan mainan!`,
    ];
    return { text: pickRandom(texts), expression: 'angry', affectionChange: -1 };
  }
  const texts = [
    'T-tanganmu nyentuh pahaku! Jauhkan!',
    'M-mau ditendang?!',
    `Jangan meraba ke bawah ya, ${userName}!`,
    'K-kotor! Jauhkan tanganmu!',
  ];
  return { text: pickRandom(texts), expression: 'angry', affectionChange: -2 };
}
