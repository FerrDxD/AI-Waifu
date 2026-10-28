/**
 * Split balasan Livia jadi segmen TTS aman (M6.1).
 *
 * Tujuan: pipeline "suara mengalir saat teks masih dirender" — kalimat ke-N
 * diucapkan sambil LLM (atau sintesis) masih mengerjakan ke-N+1.
 *
 * Konstrain:
 *  - Tiap segmen ≤ `TTS_MAX_LEN` (300) karakter — `/api/tts` menolak
 *    yang lebih panjang (biaya ElevenLabs per karakter).
 *  - Pemotongan kalimat hanya setelah titik/!?… yang diikuti spasi (atau
 *    tanda tutup kutip), supaya "3.14" atau singkatan tidak terpotong.
 *  - Kalimat yang tetap terlalu panjang → coba jeda koma/semikolon; kalau
 *    masih panjang → hard cut di batas kata.
 *
 * `TTS_MAX_LEN` harus selalu sama dengan `LIMITS.ttsText` di lib/validation
 * (300). Disengaja TIDAK di-import dari situ: lib/validation menarik
 * `next/server` yang tidak boleh masuk bundle client. Drift dicegah oleh
 * tests/tts-sentences.test.ts.
 *
 * Modul ini pure & isomorphic (dipakai client untuk pipeline TTS; bisa
 * diuji tanpa DOM).
 */

export const TTS_MAX_LEN = 300;

const SENTENCE_ENDINGS = new Set(['.', '!', '?', '…']);
const CLOSERS = new Set(['"', "'", '”', '’', ')', ']']);
const CLAUSE_BREAKS = new Set([',', ';', ':', '—', '–']);

/** Potong teks jadi kalimat-kalimat utuh (belum cek panjang). */
function splitOnPunctuation(text: string): string[] {
  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    current += ch;
    if (!SENTENCE_ENDINGS.has(ch)) continue;

    // Izinkan tanda tutup kutip/parenthesis tepat setelah penutup kalimat.
    let j = i + 1;
    while (j < text.length && CLOSERS.has(text[j])) {
      current += text[j];
      j++;
    }
    const next = text[j];
    if (next !== undefined && /\s/.test(next)) {
      sentences.push(current.trim());
      current = '';
      i = j - 1;
    }
  }
  if (current.trim()) sentences.push(current.trim());
  return sentences;
}

/**
 * Pecah kalimat yang melebihi `maxLen`: utamakan jeda koma/semikolon di
 * separuh akhir jendela, lalu spasi; terakhir hard cut.
 */
function chunkLongSentence(sentence: string, maxLen: number): string[] {
  if (sentence.length <= maxLen) return [sentence];

  const chunks: string[] = [];
  let rest = sentence;

  while (rest.length > maxLen) {
    const window = rest.slice(0, maxLen);
    let cut = window.lastIndexOf(' ');

    for (const p of [',', ';', ':', '—', '–']) {
      const idx = window.lastIndexOf(p);
      if (idx > cut && idx >= maxLen * 0.5) cut = idx;
    }

    // Tidak ada jeda layak — jangan memotong di awal jendela (kata terbelah
    // di kedua sisi); ambil segmen penuh.
    if (cut < maxLen * 0.5) cut = maxLen;

    const take = CLAUSE_BREAKS.has(window[cut]) ? cut + 1 : cut;
    const piece = window.slice(0, take).trim();
    if (piece) chunks.push(piece);
    rest = rest.slice(take).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.filter(Boolean);
}

/**
 * Pecah teks balasan jadi segmen siap-TTS (masing-masing ≤ `maxLen`).
 * Input kosong/whitespace → `[]`.
 */
export function splitSentences(text: string, maxLen: number = TTS_MAX_LEN): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const out: string[] = [];
  for (const sentence of splitOnPunctuation(clean)) {
    out.push(...chunkLongSentence(sentence, maxLen));
  }
  return out.filter(Boolean);
}

/**
 * Ambil kalimat LENGKAP dari buffer yang masih bertambah (stream SSE).
 *
 * Dipanggil tiap delta: buffer = teks balasan yang belum diucapkan. Hasil:
 *  - `sentences` — kalimat sudah utuh, aman dikirim ke TTS sekarang;
 *  - `tail` — sisanya yang belum lengkap (lanjut diakumulasi di delta berikut).
 *
 * Titik di paling ujung buffer TIDAK dianggap penutup (bisa saja angka
 * "3.1" yang akan dilanjutkan "4"), kecuali penutup kuat (! ? …).
 */
export function takeCompleteSentences(
  buffer: string
): { sentences: string[]; tail: string } {
  const text = buffer.replace(/\s+/g, ' ').trimStart();
  if (!text) return { sentences: [], tail: '' };

  let cut = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!SENTENCE_ENDINGS.has(ch)) continue;

    let j = i + 1;
    while (j < text.length && CLOSERS.has(text[j])) j++;

    const atEnd = j >= text.length;
    const isStrong = ch === '!' || ch === '?' || ch === '…';
    if (atEnd ? isStrong : /\s/.test(text[j])) cut = j;
  }

  if (cut === -1) return { sentences: [], tail: text };

  const head = text.slice(0, cut);
  const tail = text.slice(cut);
  return { sentences: splitSentences(head), tail };
}
