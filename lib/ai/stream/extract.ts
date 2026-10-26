/**
 * Ekstraktor inkremental untuk field string di JSON yang masih mengalir (M2.1).
 *
 * Masalah: model diminta mengembalikan JSON lengkap (`reply`, `affectionDelta`,
 * `expression`, ...), tapi user ingin MELIHAT balasannya seketika. Kalau
 * menunggu JSON selesai, streaming hilang gunanya.
 *
 * Solusi: sambil potongan JSON masuk, mesin status mini menelusuri struktur
 * JSON dan memuntahkan isi field target (`"reply"`) begitu string-nya selesai,
 * SEBELUM JSON utuh. Field lain tetap menunggu sampai akhir dan divalidasi
 * zod — mereka tidak boleh dipercaya dari aliran mentah.
 *
 * Kenapa tidak regex: regex bisa salah mengambil kata "reply" yang muncul di
 * dalam nilai string lain (mis. `memoryUpdate` berisi teks `"reply"`). Mesin
 * status ini mengetahui apakah kita sedang di dalam string JSON atau di antara
 * token JSON, jadi key hanya dikenali di posisi yang benar.
 */

export interface ReplyExtractor {
  /**
   * Masukkan potongan JSON mentah. Mengembalikan potongan teks balasan baru
   * yang sudah di-unescape (`\n` dan `\"` sudah jadi isi aslinya).
   */
  push(chunk: string): string;
  /** Gabungan seluruh input yang pernah diterima. */
  readonly raw: string;
  /** true kalau nilai target sudah terbuka DAN ditutup. */
  readonly found: boolean;
}

type Mode = 'code' | 'string' | 'open' | 'capture';

interface State {
  mode: Mode;
  /** Sedang mengumpulkan karakter KEY JSON. */
  keyBuffer: string;
  /** true kalau key target sudah ditemukan dan menunggu token `:`. */
  awaitingColon: false | true;
  /** Karakter escape masih pending (backslash sudah dikonsumsi). */
  pendingEscape: boolean;
  /** Digit hex \uXXXX yang sudah terkumpul. null = tidak sedang mengumpulkan. */
  pendingHex: string | null;
  /** Seluruh nilai target yang sudah di-unescape (untuk debugging). */
  out: string;
  /** Nilai target sudah ditutup — berhenti memuntahkan. */
  done: boolean;
  /** Gabungan seluruh input. */
  raw: string;
}

function decodeSimpleEscape(ch: string): string {
  switch (ch) {
    case 'n': return '\n';
    case 't': return '\t';
    case 'r': return '\r';
    case 'b': return '\b';
    case 'f': return '\f';
    case '"': return '"';
    case '\\': return '\\';
    case '/': return '/';
    default: return ch;
  }
}

/**
 * Buat ekstraktor. `targetKey` default `"reply"`; bisa dipakai juga untuk
 * key lain kalau nanti streaming operasi kedua (mis. `date.dialogue`).
 */
export function createReplyExtractor(targetKey = 'reply'): ReplyExtractor {
  const s: State = {
    mode: 'code',
    keyBuffer: '',
    awaitingColon: false,
    pendingEscape: false,
    pendingHex: null,
    out: '',
    done: false,
    raw: '',
  };

  /** Hasil yang dilepas pada akhir satu panggilan push(). */
  let emitted = '';

  function emitDecoded(ch: string): void {
    s.out += ch;
    if (!s.done) emitted += ch;
  }

  /** Tangani satu karakter di dalam nilai target, termasuk escape & \uXXXX. */
  function consumeCaptureChar(ch: string): void {
    // Sedang mengumpulkan digit hex.
    if (s.pendingHex !== null) {
      if (!/[0-9a-fA-F]/.test(ch)) {
        // Hex tidak valid (model keliru): buang seluruh escape. Karakter
        // berikutnya diperlakukan sebagai karakter biasa, mesin tidak macet.
        s.pendingHex = null;
        s.pendingEscape = false;
        return;
      }
      s.pendingHex += ch;
      if (s.pendingHex.length === 4) {
        const code = Number.parseInt(s.pendingHex, 16);
        s.pendingHex = null;
        s.pendingEscape = false;
        if (Number.isFinite(code)) emitDecoded(String.fromCharCode(code));
      }
      return;
    }

    if (s.pendingEscape) {
      s.pendingEscape = false;
      if (ch === 'u') {
        s.pendingHex = '';
        return;
      }
      emitDecoded(decodeSimpleEscape(ch));
      return;
    }

    if (ch === '\\') {
      s.pendingEscape = true;
      return;
    }

    if (ch === '"') {
      // Nilai target selesai.
      s.done = true;
      s.mode = 'code';
      return;
    }

    emitDecoded(ch);
  }

  return {
    push(chunk: string): string {
      emitted = '';
      s.raw += chunk;

      for (const ch of chunk) {
        // Membaca isi nilai target — prioritas tertinggi.
        if (s.mode === 'capture') {
          consumeCaptureChar(ch);
          continue;
        }

        if (s.mode === 'string') {
          // Sedang membaca sebuah KEY JSON.
          if (s.pendingEscape) {
            s.pendingEscape = false;
            s.keyBuffer += decodeSimpleEscape(ch);
            continue;
          }
          if (ch === '\\') {
            s.pendingEscape = true;
            continue;
          }
          if (ch === '"') {
            if (s.keyBuffer === targetKey) s.awaitingColon = true;
            s.mode = 'code';
            s.keyBuffer = '';
            continue;
          }
          s.keyBuffer += ch;
          continue;
        }

        // mode 'code': di antara token JSON.
        if (s.awaitingColon) {
          if (ch === ':') {
            s.awaitingColon = false;
            // Jangan langsung capture: tanda kutip pembuka value
            // mungkin dipisahkan spasi/baris baru (pretty JSON).
            s.mode = 'open';
          } else if (!/\s/.test(ch)) {
            // Ada karakter lain sesudah key — target tidak ditemukan di sini.
            s.awaitingColon = false;
            if (ch === '"') {
              s.mode = 'string';
              s.keyBuffer = '';
            }
          }
          continue;
        }

        if (s.mode === 'open') {
          if (/\s/.test(ch)) continue;
          if (ch === '"') {
            s.mode = 'capture';
            s.done = false;
          } else {
            // Bukan string opening quote — bukan nilai target kita.
            s.mode = 'code';
          }
          continue;
        }

        if (ch === '"') {
          s.mode = 'string';
          s.keyBuffer = '';
        }
      }

      return emitted;
    },
    get raw(): string {
      return s.raw;
    },
    get found(): boolean {
      return s.done;
    },
  };
}
