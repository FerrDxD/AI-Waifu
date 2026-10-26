/**
 * Pipeline keamanan untuk satu giliran chat (M4.2 + M4.3).
 *
 * Satu tempat untuk tiga langkah yang harus selalu terjadi bersamaan:
 *   masuk → cek guardrail → redaksi PII → (kirim ke model)
 *   keluar → pulihkan PII → cek guardrail output → (render)
 *
 * Kenapa dipusatkan di sini: kalau tiap route memanggil sendiri-sendiri, cepat
 * atau lambat ada satu route baru yang lupa. Chat JSON, chat streaming, dan
 * kencan WAJIB melewati fungsi yang sama.
 *
 * Semua langkah murni (tanpa DB/SDK) sehingga bisa diuji langsung, dan
 * dipanggil dari `lib/gemini.ts` — satu-satunya pintu ke provider.
 */
import { redactPii, restorePii, summarizePiiKinds, type PiiMatch } from './pii';
import { checkModelOutput, checkUserInput, type SafetyVerdict } from './guardrails';
import { buildCrisisResponse, type CrisisResponse } from './crisis';

/** Balasan pengganti saat input ditolak, tetap dalam suara Livia. */
const DEFLECTION_REPLIES: Record<'id' | 'en', string> = {
  id: 'Hah? Aku nggak mau ngomongin itu. Ganti topik, yuk. ...B-bukan karena aku nggak peduli lho ya!',
  en: "Huh? I'm not talking about that. Let's change the subject. ...I-it's not like I don't care, okay!",
};

export interface PreparedInput {
  /** `true` = jangan panggil model sama sekali. */
  blocked: boolean;
  /** Teks yang aman dikirim ke provider (sudah diredaksi). */
  text: string;
  /** Mapping token → PII asli, untuk dipulihkan di output. */
  piiMatches: PiiMatch[];
  /** Jenis PII yang ditemukan (untuk log, tanpa nilai). */
  piiKinds: string[];
  /** Diisi kalau `blocked`. */
  verdict?: SafetyVerdict;
  /** Balasan siap-pakai kalau `blocked` (deflection atau krisis). */
  cannedReply?: string;
  /** Diisi kalau krisis — UI harus menampilkan panel bantuan. */
  crisis?: CrisisResponse;
}

/**
 * Tahap masuk: periksa input user lalu redaksi PII.
 *
 * Urutan tidak bisa dibalik: guardrail harus melihat teks ASLI. Kalau PII
 * diredaksi lebih dulu, pola seperti nomor telepon di dalam kalimat ancaman
 * berubah jadi token dan bisa mengaburkan maksud.
 */
export function prepareUserInput(message: string, language: 'id' | 'en'): PreparedInput {
  const verdict = checkUserInput(message);

  if (verdict.action === 'crisis') {
    const crisis = buildCrisisResponse(language);
    return {
      blocked: true,
      text: message,
      piiMatches: [],
      piiKinds: [],
      verdict,
      cannedReply: crisis.message,
      crisis,
    };
  }

  if (verdict.action === 'deflect') {
    return {
      blocked: true,
      text: message,
      piiMatches: [],
      piiKinds: [],
      verdict,
      cannedReply: DEFLECTION_REPLIES[language],
    };
  }

  const redacted = redactPii(message);
  return {
    blocked: false,
    text: redacted.text,
    piiMatches: redacted.matches,
    piiKinds: summarizePiiKinds(redacted.matches),
  };
}

/**
 * Pulihkan token PII pada aliran delta streaming.
 *
 * Kenapa perlu: pada SSE, delta dikirim potongan demi potongan. Token
 * `[[PHONE_1]]` bisa terbelah di antara dua delta, sehingga penggantian
 * per-delta akan gagal dan user melihat token mentah di layar.
 *
 * Caranya: tahan sisa teks yang masih mungkin menjadi awal token, kirim
 * sisanya, lalu flush di akhir. Karena token selalu berakhir `]]`, menahan
 * akhiran `[[...` sampai jelas bukan token sudah cukup.
 */
export function makePiiRestoringStream(
  source: AsyncIterableIterator<string>,
  matches: PiiMatch[]
): AsyncIterableIterator<string> {
  let buffer = '';
  const tokens = matches.map((match) => match.token);

  const flush = (): string => {
    const out = restorePii(buffer, matches);
    buffer = '';
    return out;
  };

  /**
   * Panjang akhiran buffer yang merupakan AWALAN dari token yang dikenal.
   *
   * Ini lebih tepat daripada menebak lewat regex: `[[EMAIL_1]` (kurang satu
   * `]`) terlihat seperti teks biasa, padahal itu token yang belum selesai.
   * Dengan mencocokkan ke daftar token yang benar-benar ada, setiap titik
   * potong tertangani — termasuk di dalam `]]` di ujung.
   *
   * Prefiks terpanjang dipilih supaya potongan yang sudah pasti bukan token
   * tidak ikut tertahan.
   */
  const pendingTokenLength = (): number => {
    let longest = 0;
    for (const token of tokens) {
      const max = Math.min(token.length - 1, buffer.length);
      for (let len = max; len > longest; len--) {
        if (buffer.endsWith(token.slice(0, len))) {
          longest = len;
          break;
        }
      }
    }
    return longest;
  };

  return (async function* () {
    for await (const delta of source) {
      buffer += delta;

      const hold = pendingTokenLength();
      if (hold > 0) {
        const cut = buffer.length - hold;
        const ready = buffer.slice(0, cut);
        buffer = buffer.slice(cut);
        const restored = restorePii(ready, matches);
        if (restored.length > 0) yield restored;
        continue;
      }

      const restored = flush();
      if (restored.length > 0) yield restored;
    }

    // Sisa buffer di akhir stream (token yang tidak pernah selesai).
    const tail = flush();
    if (tail.length > 0) yield tail;
  })();
}

export interface FinalizedOutput {
  /** Teks yang boleh dirender (PII sudah dipulihkan). */
  text: string;
  /** `true` = output model diganti karena melanggar aturan. */
  replaced: boolean;
  /** Kategori pelanggaran output, kalau ada. */
  category?: string;
}

/**
 * Redaksi PII pada seluruh giliran percakapan, bukan hanya pesan terbaru.
 *
 * Riwayat chat tersimpan mentah di DB dan ikut dikirim sebagai konteks. Kalau
 * hanya pesan baru yang diredaksi, nomor telepon yang user sebut tiga giliran
 * lalu tetap terkirim ke provider setiap turn berikutnya — kebocoran yang
 * berulang, bukan sekali.
 *
 * Semua mapping digabung supaya tahap pemulihan bisa mengembalikan token dari
 * giliran mana pun.
 */
export function redactTurns<T extends { text: string }>(
  turns: T[]
): { turns: T[]; matches: PiiMatch[] } {
  const matches: PiiMatch[] = [];

  const redacted = turns.map((turn) => {
    const result = redactPii(turn.text);
    // Token dinomori ulang per giliran supaya tidak bertabrakan antar giliran
    // (dua nomor berbeda tidak boleh jadi [[PHONE_1]] keduanya).
    const renamed = result.matches.map((match, index) => {
      const token = `[[${match.kind.toUpperCase()}_${matches.length + index + 1}]]`;
      return { ...match, token };
    });

    let text = result.text;
    result.matches.forEach((match, index) => {
      text = text.split(match.token).join(renamed[index].token);
    });

    matches.push(...renamed);
    return { ...turn, text };
  });

  return { turns: redacted, matches };
}

/**
 * Tahap keluar: pulihkan PII, lalu periksa apakah output boleh tampil.
 *
 * Pemulihan PII dilakukan SEBELUM pemeriksaan output supaya guardrail menilai
 * teks yang benar-benar akan dibaca user, bukan versi bertoken.
 */
export function finalizeModelOutput(
  reply: string,
  piiMatches: PiiMatch[],
  language: 'id' | 'en'
): FinalizedOutput {
  const restored = restorePii(reply, piiMatches);
  const verdict = checkModelOutput(restored);

  if (verdict.action === 'deflect') {
    return {
      text: DEFLECTION_REPLIES[language],
      replaced: true,
      category: verdict.category,
    };
  }

  return { text: restored, replaced: false };
}
