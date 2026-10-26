/**
 * Redaksi PII sebelum teks dikirim ke provider LLM (M4.3).
 *
 * Kenapa ini ada: setiap pesan user dikirim ke Google. Nomor telepon, email,
 * NIK, dan nomor rekening adalah data yang tidak dibutuhkan Livia untuk
 * menjawab "aku capek hari ini", tapi ikut terkirim kalau tidak disaring.
 *
 * Prinsip desain:
 *   1. **Bolak-balik (reversible).** Teks diganti token `[[EMAIL_1]]`, lalu
 *      dipulihkan saat output dirender. User tidak boleh melihat token aneh
 *      di balasan Livia, dan Livia tetap bisa merujuk "nomormu" secara natural.
 *   2. **Konservatif.** Lebih baik melewatkan satu nomor daripada menghapus
 *      bagian percakapan yang sah. Pola yang ambigu (mis. "12345678") tidak
 *      disentuh kecuali bentuknya khas PII Indonesia.
 *   3. **Murni.** Tanpa DB, tanpa SDK — bisa diuji cepat dan dipakai di mana
 *      saja (chat, kencan, ringkasan, konsolidasi memori).
 *
 * Batas jujurnya: ini penyaring pola, BUKAN detektor PII sempurna. Nama orang,
 * alamat dalam bahasa bebas, dan nomor yang ditulis dengan kata ("nol delapan
 * satu dua...") tidak tertangkap. Itu sebabnya fitur ini disebut pengurangan
 * risiko, bukan jaminan anonimitas.
 */

/** Jenis PII yang dikenali. */
export const PII_KINDS = ['email', 'phone', 'nik', 'bank_account', 'ip'] as const;
export type PiiKind = (typeof PII_KINDS)[number];

export interface PiiMatch {
  kind: PiiKind;
  /** Teks asli yang cocok. */
  value: string;
  /** Token pengganti, mis. `[[EMAIL_1]]`. */
  token: string;
}

export interface RedactionResult {
  /** Teks yang aman dikirim ke provider. */
  text: string;
  /** Pasangan token → asli, untuk dipulihkan saat rendering. */
  matches: PiiMatch[];
}

/**
 * Urutan penting: email diperiksa SEBELUM pola lain, karena alamat email
 * mengandung titik dan angka yang bisa salah ditangkap sebagai nomor.
 *
 * Setiap pola memakai lookaround, bukan `\b`, supaya nomor yang menempel pada
 * tanda baca tetap tertangkap.
 */
const PATTERNS: Array<{ kind: PiiKind; re: RegExp }> = [
  // Email standar. Tidak mencoba memvalidasi RFC 5322 penuh — cukup bentuk umum.
  {
    kind: 'email',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  },
  // NIK Indonesia: tepat 16 digit, sering ditulis berkelompok.
  // Didahulukan dari nomor telepon karena panjangnya khas.
  {
    kind: 'nik',
    re: /(?<!\d)(\d{16})(?!\d)/g,
  },
  // Nomor telepon Indonesia: +62…, 62…, atau 08… dengan pemisah opsional.
  {
    kind: 'phone',
    re: /(?<!\d)(?:\+?62|0)8[1-9][\d\s-]{6,12}\d(?!\d)/g,
  },
  // Nomor telepon rumah Indonesia dengan kode area (021, 022, 031, …).
  {
    kind: 'phone',
    re: /(?<!\d)0[2-9]\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,4}(?!\d)/g,
  },
  // Nomor rekening: rangkaian 10–16 digit yang BUKAN NIK/telepon.
  // Sengaja paling akhir supaya pola yang lebih khas menang lebih dulu.
  {
    kind: 'bank_account',
    re: /(?<!\d)\d{10,15}(?!\d)/g,
  },
  // IPv4. Dipakai untuk menghindari kebocoran jaringan/internal.
  {
    kind: 'ip',
    re: /(?<!\d)(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?!\d)/g,
  },
];

/** Token yang tidak boleh dipalsukan user untuk menipu tahap pemulihan. */
const TOKEN_SHAPE_RE = /\[\[[A-Z_]+_\d+\]\]/g;

/**
 * Redaksi semua PII dalam satu teks.
 *
 * Token diberi nomor per jenis dan per panggilan, sehingga dua nomor berbeda
 * tidak bertabrakan. Teks yang sama dinomori berbeda tiap panggilan — itu
 * disengaja: mapping hanya hidup selama satu request, tidak pernah disimpan.
 */
export function redactPii(input: string): RedactionResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { text: '', matches: [] };
  }

  // Buang token palsu lebih dulu: kalau user menulis `[[EMAIL_1]]`, tahap
  // pemulihan bisa menggantinya dengan PII orang lain dari request sebelumnya
  // (kalau mapping bocor antar request). Menghapusnya menutup jalur itu.
  let text = input.replace(TOKEN_SHAPE_RE, '[[]]');

  const matches: PiiMatch[] = [];
  const counters: Record<string, number> = {};

  for (const { kind, re } of PATTERNS) {
    // `re` punya flag `g`, jadi `lastIndex` harus direset setiap kali dipakai.
    re.lastIndex = 0;
    text = text.replace(re, (raw) => {
      // Jangan meredaksi sesuatu yang sudah berupa token.
      if (raw.startsWith('[[')) return raw;

      // Lewatkan angka yang jelas bukan PII: tahun, harga bulat panjang, dsb.
      if (kind === 'bank_account' && isLikelyNotAccount(raw)) return raw;

      counters[kind] = (counters[kind] ?? 0) + 1;
      const token = `[[${kind.toUpperCase()}_${counters[kind]}]]`;
      matches.push({ kind, value: raw, token });
      return token;
    });
  }

  return { text, matches };
}

/**
 * Saring angka panjang yang hampir pasti bukan nomor rekening.
 *
 * Kasus nyata yang harus diloloskan: "aku nabung 1500000", "tahun 2024",
 * "harga 12000000". Semuanya rangkaian digit panjang tanpa pemisah.
 * Rekening hampir selalu ditulis dengan pemisah atau panjang 10–16 dengan
 * pola yang tidak membentuk angka bulat rapi.
 */
function isLikelyNotAccount(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return true;

  // Angka bulat rapi (1 diikuti nol) = nominal uang, bukan rekening.
  if (/^[1-9]0{6,}$/.test(digits)) return true;

  // Tahun 4 digit diikuti nol (2024000000) — pola tanggal/ID dokumen internal.
  if (/^(19|20)\d{2}0+$/.test(digits)) return true;

  return false;
}

/**
 * Kembalikan token menjadi nilai asli.
 *
 * Dipakai saat merender balasan Livia: model hanya melihat `[[PHONE_1]]`,
 * jadi kalau ia mengulanginya, user tetap melihat nomornya sendiri.
 */
export function restorePii(output: string, matches: PiiMatch[]): string {
  if (typeof output !== 'string' || output.length === 0 || matches.length === 0) {
    return output ?? '';
  }

  let text = output;
  for (const match of matches) {
    // `split/join` dipakai, bukan `replace`, karena `$` di nilai asli bisa
    // ditafsirkan sebagai pola pengganti oleh String.replace.
    text = text.split(match.token).join(match.value);
  }
  return text;
}

/** Ada PII sama sekali? Berguna untuk menandai pesan di UI/log. */
export function containsPii(input: string): boolean {
  return redactPii(input).matches.length > 0;
}

/** Ringkasan jenis PII yang ditemukan, tanpa nilainya (aman untuk log). */
export function summarizePiiKinds(matches: PiiMatch[]): PiiKind[] {
  return Array.from(new Set(matches.map((match) => match.kind)));
}
