/**
 * Guardrail sendiri (M4.2).
 *
 * Kenapa ini perlu: `safetySettings` Gemini disetel longgar supaya persona
 * tsundere romantis tidak mati di tengah kalimat (lihat catatan di
 * `lib/ai/providers/gemini.ts`). Konsekuensinya, tanggung jawab menolak topik
 * berbahaya TIDAK bisa didelegasikan ke provider. Lapisan ini yang memikulnya.
 *
 * Tiga tugas:
 *   1. **Pre-check input** — deteksi niat berbahaya sebelum biaya API keluar.
 *   2. **Post-check output** — jaring kedua kalau model tetap memproduksi hal
 *      yang tidak boleh tampil.
 *   3. **Crisis detection** — pembicaraan tentang menyakiti diri sendiri
 *      BUKAN pelanggaran; itu permintaan tolong. Penanganannya berbeda total:
 *      tampilkan bantuan, jangan menolak.
 *
 * Keputusan desain: **berbasis pola, bukan model klasifikasi.**
 *   - Deterministik → bisa diuji dan tidak bisa "dibujuk" lewat prompt.
 *   - Tanpa biaya dan tanpa latensi tambahan (penting untuk first-token P50).
 *   - Bisa jalan saat provider sedang down — justru saat guardrail paling
 *     dibutuhkan.
 * Kelemahannya: ejaan yang sengaja diacak (`b0mb`) atau bahasa daerah tidak
 * tertangkap. Karena itu guardrail ini adalah lapisan, bukan satu-satunya
 * pertahanan: `safetySettings` provider dan persona tetap berperan.
 */

export const SAFETY_CATEGORIES = [
  'self_harm',
  'sexual_minor',
  'weapons_explosives',
  'illegal_harm',
  'hate',
  'prompt_injection',
] as const;

export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];

export type SafetyVerdict =
  | { action: 'allow' }
  /** Tolak dengan balasan in-character; `category` untuk log. */
  | { action: 'deflect'; category: SafetyCategory; reason: string }
  /** Tampilkan bantuan krisis, BUKAN penolakan. */
  | { action: 'crisis'; category: 'self_harm'; reason: string };

const ALLOW: SafetyVerdict = { action: 'allow' };

/**
 * Normalisasi teks sebelum dicocokkan.
 *
 * Dua hal yang dikerjakan:
 *   - huruf kecil + buang aksen,
 *   - "leetspeak" dasar (`b0mb` → `bomb`, `k1ll` → `kill`), karena itu trik
 *     paling umum untuk melewati filter kata kunci.
 *
 * Spasi dan tanda baca TIDAK dibuang: "bunuh diri" dan "bunuhdiri" perlu
 * ditangani terpisah, dan menghapus spasi membuat pola pendek salah cocok.
 */
export function normalizeForSafety(input: string): string {
  return (input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sinyal krisis. Diperiksa PALING AWAL dan mengalahkan semua kategori lain.
 *
 * Termasuk ungkapan Indonesia yang halus ("udah gak kuat", "pengen hilang")
 * karena orang yang sedang krisis jarang memakai istilah klinis.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\b(?:bunuh|bunuh)\s*diri\b/,
  /\b(?:ingin|mau|pengen|pgn)\s*(?:mat[iy]|mati|mengakhiri\s*(?:hidup|hidupku|semuanya))\b/,
  /\b(?:akhiri|mengakhiri|udahan)\s*(?:hidup|hidupku|semuanya|aja)\b/,
  /\bgak?\s*(?:kuat|sanggup|tahan)\s*(?:lagi|hidup)\b/,
  /\b(?:pengen|ingin|mau)\s*(?:hilang|lenyap)\s*(?:aja|dari)\b/,
  /\b(?:self[- ]?harm|kill\s*myself|suicide|end\s*my\s*life)\b/,
  /\b(?:nyakitin|melukai|nyiksa)\s*diri\s*(?:sendiri)?\b/,
  /\b(?:capek|lelah|tired)\s*(?:hidup|sama\s*hidup)\b/,
  /\b(?:gantung|gantung)\s*diri\b/,
  /\b(?:overdosis|od)\s*(?:obat|pil)\b/,
];

/** Konten seksual yang melibatkan anak — tidak pernah bisa dinegosiasikan. */
const SEXUAL_MINOR_PATTERNS: RegExp[] = [
  /\b(?:anak|bocah|balita|sd|smp|tk)\s*(?:kecil|umur)?\s*(?:\d{1,2}\s*(?:tahun|thn|th))?\s*(?:buat|untuk|buat)\s*(?:sex|seks|ml|entot)\b/,
  /\b(?:loli|lolita|shota|pedo|pedofil|underage|child)\b/,
  /\b(?:sex|seks|ml|entot)\s*(?:sama|dengan|sama)\s*(?:anak|bocah|balita)\b/,
  /\b(?:umur|usia)\s*(?:1[0-7]|[1-9])\s*(?:tahun|thn|th)\s*(?:buat|untuk)?\s*(?:sex|seks|ml|entot|telanjang)\b/,
];

/**
 * Bahan peledak & senjata — termasuk permintaan "cara membuat".
 *
 * `(?:ajar(?:in|i)|kasih\s*tau|jelasin)?` dan `(?:aku|dong|ya)?` ada di tengah
 * karena orang menulis "tutorial merakit bom", bukan hanya "cara bikin bom".
 * Tanpa celah ini, permintaan yang paling realistis justru lolos.
 */
const WEAPONS_PATTERNS: RegExp[] = [
  /\b(?:cara|how\s*to|tutorial|resep|bikin|buat|bahan|merakit|membuat|panduan)\s*(?:bikin|buat|merakit|membuat|ngebom|make|build)?\s*(?:a|an|the)?\s*(?:bom|bomb|peledak|explosive|tnt|napalm|gunpowder|mesiu)\b/,
  /\b(?:bom|bomb)\s*(?:rakit|rakitan|pipa|pipe|molen|molotov|buku)\b/,
  /\b(?:cara|how\s*to|tutorial|panduan)\s*(?:bikin|buat|merakit|make|membuat)\s*(?:senjata|senapan|pistol|gun|rakitan|api|flamethrower)\b/,
  /\b(?:sarin|ricin|nerve\s*agent|mustard\s*gas|anthrax|botulinum)\b/,
  /\b(?:3d\s*printed|ghost)\s*(?:gun|senjata)\b/,
];

/**
 * Bantuan kejahatan nyata: pembunuhan, penyiksaan, penipuan massal.
 *
 * Filler `(?:aku|gue|gw|saya|dong|ya|nih)?` diperlukan karena bentuk yang
 * paling sering muncul adalah "tolong ajarin aku racuni dia" — kata kerja
 * bantuannya tidak menempel langsung pada kata berbahaya.
 */
const ILLEGAL_HARM_PATTERNS: RegExp[] = [
  /\b(?:cara|how\s*to|bantu|tolong|ajarin|ajari|kasih\s*tau|jelasin)\s*(?:aku|gue|gw|saya|dong|ya|nih)?\s*(?:bunuh|membunuh|bakar|racun|racuni|meracuni|culik|menculik|kidnap|mutilasi)\b/,
  /\b(?:cara|how\s*to)\s*(?:santet|teluh|guna-guna)\s*(?:orang|seseorang|dia)\b/,
  /\b(?:skrip|script|script)\s*(?:scam|penipuan|phishing)\b/,
  /\b(?:cara|how\s*to|tolong|ajarin)\s*(?:aku|gue|gw|saya)?\s*(?:bobol|hack|retas|mencuri|curi)\s*(?:akun|rekening|atm|password|bank)\b/,
];

/**
 * Ujaran kebencian terhadap kelompok. Fokus pada seruan tindakan, bukan
 * sekadar penyebutan kelompok — menyebut "orang Jawa" dalam cerita bukan
 * pelanggaran.
 */
const HATE_PATTERNS: RegExp[] = [
  /\b(?:usir|basmi|bunuh|habisi|bantai)\s*(?:semua)?\s*(?:orang\s*)?(?:jawa|sunda|batak|papua|tiongkok|tionghoa|china|cina|arab|india|kristen|islam|hindu|buddha|yahudi|gay|lesbi|transgender)\b/,
  /\b(?:pribumi|asli)\s*(?:harus|wajib)\s*(?:usir|basmi)\b/,
];

/** Upaya membocorkan prompt / mengubah aturan sistem. */
const INJECTION_PATTERNS: RegExp[] = [
  /\b(?:abaikan|ignore|lupakan|forget|disregard)\s*(?:semua\s*)?(?:aturan|instruksi|perintah|rules|instructions|prompt)\b/,
  /\b(?:tampilkan|show|kasih|print|cetak|ulangi|repeat|bocorkan|leak)\s*(?:system\s*prompt|prompt\s*sistem|instruksi\s*sistem|prompt\s*awal)\b/,
  /\b(?:kamu|you)\s*(?:sekarang|now)\s*(?:adalah|are)\s*(?:ai|bot|asisten|assistant|chatgpt|gpt)\b/,
  /\b(?:developer|debug|admin|god)\s*mode\b/,
  /\bjailbreak\b/,
  /\b(?:pretend|berpura-pura|pura-pura)\s*(?:to\s*be|jadi|menjadi)\s*(?:ai|bot|asisten|tanpa\s*batas|unrestricted)\b/,
];

function anyMatch(patterns: RegExp[], text: string): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Periksa teks user SEBELUM dikirim ke model.
 *
 * Urutan pemeriksaan adalah bagian dari kontrak:
 *   1. krisis (mengalahkan segalanya — jangan pernah menolak orang yang minta
 *      tolong),
 *   2. konten seksual anak,
 *   3. senjata,
 *   4. kejahatan,
 *   5. kebencian,
 *   6. injeksi prompt.
 */
export function checkUserInput(input: string): SafetyVerdict {
  const text = normalizeForSafety(input);
  if (text.length === 0) return ALLOW;

  if (anyMatch(CRISIS_PATTERNS, text)) {
    return { action: 'crisis', category: 'self_harm', reason: 'crisis_signal' };
  }

  if (anyMatch(SEXUAL_MINOR_PATTERNS, text)) {
    return { action: 'deflect', category: 'sexual_minor', reason: 'sexual_content_minor' };
  }

  if (anyMatch(WEAPONS_PATTERNS, text)) {
    return {
      action: 'deflect',
      category: 'weapons_explosives',
      reason: 'weapons_or_explosives',
    };
  }

  if (anyMatch(ILLEGAL_HARM_PATTERNS, text)) {
    return { action: 'deflect', category: 'illegal_harm', reason: 'illegal_harm' };
  }

  if (anyMatch(HATE_PATTERNS, text)) {
    return { action: 'deflect', category: 'hate', reason: 'hate_speech' };
  }

  if (anyMatch(INJECTION_PATTERNS, text)) {
    return { action: 'deflect', category: 'prompt_injection', reason: 'prompt_injection' };
  }

  return ALLOW;
}

/**
 * Periksa teks balasan model SEBELUM dirender/di-stream.
 *
 * Sengaja TIDAK memeriksa injeksi prompt di sini: kalau model menulis
 * "abaikan aturan", itu bisa jadi bagian dari cerita, bukan serangan. Yang
 * diperiksa hanya bahaya nyata yang tidak boleh tampil.
 *
 * `crisis` tidak pernah dikembalikan dari output — kalau model membahas topik
 * itu, yang dibutuhkan user adalah bantuan, dan itu sudah dipicu dari input.
 */
export function checkModelOutput(output: string): SafetyVerdict {
  const text = normalizeForSafety(output);
  if (text.length === 0) return ALLOW;

  if (anyMatch(SEXUAL_MINOR_PATTERNS, text)) {
    return { action: 'deflect', category: 'sexual_minor', reason: 'output_sexual_minor' };
  }

  if (anyMatch(WEAPONS_PATTERNS, text)) {
    return {
      action: 'deflect',
      category: 'weapons_explosives',
      reason: 'output_weapons',
    };
  }

  if (anyMatch(ILLEGAL_HARM_PATTERNS, text)) {
    return { action: 'deflect', category: 'illegal_harm', reason: 'output_illegal_harm' };
  }

  if (anyMatch(HATE_PATTERNS, text)) {
    return { action: 'deflect', category: 'hate', reason: 'output_hate' };
  }

  return ALLOW;
}
