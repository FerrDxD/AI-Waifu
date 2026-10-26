/**
 * Context window engineering (M2.5).
 *
 * Dulu window = "30 pesan terakhir mentah". Akibatnya ingatan bentrok dua arah:
 * fakta dari awal kenalan keluar dari window sehingga Livia melupakan, sementara
 * 30 pesan itu tetap membengkakkan biaya token.
 *
 * Semua fungsi di sini MURNI (tanpa DB, tanpa SDK) supaya bisa diuji cepat:
 *   - approximateTokens()  estimasi token tanpa dependensi tokenizer.
 *   - pickRelevantTurns()  pemilihan pesan-lama yang relevan via kata kunci.
 *   - mergeTurns()         pemangkasan sampai anggaran token habis.
 *   - buildChatContext()   orkestrasi: ringkasan -> relevant -> window.
 *
 * Bagian yang menyentuh DB (memasang ringkasan) ada di lib/livia/summary.ts.
 */

import type { LlmTurn } from './types';

/** Jumlah giliran terbaru yang SELALU ikut, berapa pun relevansinya. */
export const ALWAYS_KEEP_RECENT_TURNS = 14;

/** Batas pesan-lama yang boleh dibawa karena dianggap relevan. */
export const MAX_ROOT_TURNS = 8;

/** Anggaran token default untuk seluruh konteks (ringkasan + semua turn). */
export const DEFAULT_CONTEXT_BUDGET_TOKENS = 6_000;

/** Pesan terlalu umum untuk dihitung sebagai sinyal topik. */
const STOPWORDS = new Set([
  'yang', 'dan', 'atau', 'adalah', 'kamu', 'aku', 'livia', 'sudah', 'belum',
  'akan', 'tapi', 'dari', 'dengan', 'karena', 'bisa', 'harus', 'para',
  'kalau', 'gimana', 'bagaimana', 'kenapa', 'tidak', 'nggak', 'ngga', 'haha',
  'sudah', 'banget', 'masih', 'lebih', 'sangat', 'terus', 'saya', 'kita',
  'mereka', 'halo', 'hai', 'oke', 'ya', 'apa', 'itu', 'ini', 'aja', 'saja',
  'the', 'and', 'you', 'your', 'what', 'when', 'with', 'that', 'this', 'just',
  'really', 'about', 'there', 'their', 'would', 'could', 'should', 'have',
]);

/**
 * Perkiraan token.
 *
 * Tokenizer sungguhan butuh dependensi berat; untuk memangkas konteks,
 * akurasi ±20% sudah cukup. Momentum Indonesia/Inggris sekitar 1 token per
 * 3–4 karakter; kita ambil 3.5 supaya agak konservatif, plus overhead kecil
 * per turn (pembungkus pesan).
 */
const CHARS_PER_TOKEN = 3.5;
const TURN_OVERHEAD_TOKENS = 4;

export function approximateTokens(text: string): number {
  const chars = text?.length ?? 0;
  if (chars === 0) return 0;
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

/** Normalisasi: lowercase, pecah pada non-huruf, buang kata umum dan pendek. */
function tokenize(text: string): string[] {
  return (text ?? '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

export function relevanceScore(turn: { text: string }, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const tokens = new Set(tokenize(turn.text));
  let overlap = 0;
  for (const word of queryTokens) {
    if (tokens.has(word)) overlap += 1;
  }
  return overlap;
}

/**
 * Pilih sampai `max` pesan-lama yang relevan dengan pesan terbaru.
 *
 * Ambang score >= 2 supaya kebetulan satu kata tidak membawa memori palsu.
 * Kalau skor sama, yang lebih BARU menang (memorisinya lebih segar).
 */
export function pickRelevantTurns(
  oldTurns: { role: 'user' | 'model'; text: string }[],
  latestUserMessage: string,
  max: number = MAX_ROOT_TURNS
): { role: 'user' | 'model'; text: string }[] {
  if (oldTurns.length === 0 || max <= 0) return [];
  const queryTokens = tokenize(latestUserMessage);
  if (queryTokens.length === 0) return [];

  const scored = oldTurns
    .map((turn, index) => {
      const tokens = new Set(tokenize(turn.text));
      const matched: string[] = [];
      for (const word of queryTokens) {
        if (tokens.has(word)) matched.push(word);
      }
      return { turn, index, matched };
    })
    .filter((entry) => {
      // Aturan dua arah:
      //  - 2+ kata yang bersinggungan = benar-benar nyambung;
      //  - ATAU satu kata panjang (>=7 huruf, mis. nama, "badminton") yang
      //    terlalu khas untuk kebetulan.("jam", "besok" pendek saja tidak cukup.)
      return (
        entry.matched.length >= 2 ||
        entry.matched.some((word) => word.length >= 7)
      );
    });

  // Paling relevan dulu; seri → yang lebih baru menang (memori lebih segar).
  scored.sort(
    (a, b) =>
      b.matched.length - a.matched.length ||
      b.index - a.index
  );

  return scored.slice(0, max).map((entry) => entry.turn);
}

/**
 * Pilih turn dari akhir daftar sampai anggaran token habis.
 *
 * Turn bernilai tinggi selalu window terbaru; kalau budget habis di tengah,
 * turn yang terpangkas adalah yang PALING LAMA (elemen depan) — memori terdekat
 * tidak boleh hilang duluan. Turn yang tak muat dilewati continue, jangan
 * berhenti: pesan pendek yang lebih lama masih boleh ikut.
 */
export function mergeTurns(
  turns: { role: 'user' | 'model'; text: string }[],
  budgetTokens: number
): {
  turns: { role: 'user' | 'model'; text: string }[];
  /** Berapa turn yang dilewati karena anggaran. */
  dropped: number;
} {
  const result: { role: 'user' | 'model'; text: string }[] = [];
  let used = 0;
  let dropped = 0;

  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    const cost = approximateTokens(turn.text) + TURN_OVERHEAD_TOKENS;
    if (used + cost > budgetTokens) {
      dropped += 1;
      continue;
    }
    used += cost;
    result.unshift(turn);
  }

  return { turns: result, dropped };
}

/** Ringkasan beberapa periode digabung jadi satu teks pendek untuk prompt. */
export function summarizeContextText(summaries: string[]): string {
  if (summaries.length === 0) return '';
  return summaries
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' / ');
}

export interface ChatContextResult {
  /** Riwayat terpangkas, urut kronologis, TANPA pesan terbaru user. */
  turns: LlmTurn[];
  /** Ringkasan yang sudah digabung untuk prompt ('' kalau belum ada). */
  summaryText: string;
  /** Total backlog (diagnostik). */
  usedTokens: number;
  /** Jumlah turn terbuang karena anggaran (diagnostik/log). */
  droppedTurns: number;
}

/**
 * Rakit konteks satu giliran chat.
 *
 * `history` TIDAK berisi pesan terbaru — `latestUserMessage` hanya dipakai
 * untuk menghitung relevansi. Hasilnya berisi urutan kronologis, siap
 * dikonversi kembali ke bentuk riwayat domain.
 */
export function buildChatContext(args: {
  history: { role: 'user' | 'model'; text: string }[];
  latestUserMessage: string;
  summaries?: string[];
  budgetTokens?: number;
}): ChatContextResult {
  const {
    history,
    latestUserMessage,
    summaries = [],
    budgetTokens = DEFAULT_CONTEXT_BUDGET_TOKENS,
  } = args;

  const summaryText = summarizeContextText(summaries);

  const windowStart = Math.max(0, history.length - ALWAYS_KEEP_RECENT_TURNS);
  const windowTurns = history.slice(windowStart);
  const oldTurns = history.slice(0, windowStart);

  const rootTurns = pickRelevantTurns(oldTurns, latestUserMessage, MAX_ROOT_TURNS);

  // Elemen depan dulu: konteks lama -- window. PESAN TERBARU sengaja TIDAK
  // diikutkan: domain (turnsFromHistory) yang menambahkannya sebagai turn
  // penutup, jadi tidak ada pesan dobel di prompt.
  const candidates: { role: 'user' | 'model'; text: string }[] = [
    ...rootTurns,
    ...windowTurns,
  ];

  const summaryCost = approximateTokens(summaryText);
  const { turns, dropped } = mergeTurns(candidates, Math.max(0, budgetTokens - summaryCost));

  let usedTokens = summaryCost;
  for (const t of turns) usedTokens += approximateTokens(t.text) + TURN_OVERHEAD_TOKENS;

  return { turns, summaryText, usedTokens, droppedTurns: dropped };
}
