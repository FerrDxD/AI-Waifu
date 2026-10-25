import { errors } from './errors';

/**
 * Validasi & sanitasi input server-side (M0/H0.5).
 *
 * Prinsip: server tidak pernah mempercayai client. Semua yang masuk prompt AI
 * harus punya batas panjang, tipe yang jelas, dan dibersihkan dari karakter
 * kontrol. Ini juga menutup prompt-injection lewat nama user / lokasi / history.
 *
 * Catatan: ini implementasi manual tanpa dependency supaya M0 tidak menambah
 * paket baru. M1.5 akan menggantinya dengan skema `zod` untuk seluruh env + body.
 */

export const LIMITS = {
  /** Panjang maksimum satu pesan chat (H0.5: ≤ 2000 karakter). */
  chatMessage: 2000,
  /** Panjang maksimum nama user yang masuk prompt. */
  userName: 40,
  /** Panjang maksimum lokasi kencan. */
  location: 60,
  /** Jumlah maksimum pesan history yang dikirim client untuk konteks kencan. */
  historyMessages: 20,
  /** Panjang maksimum satu entri history. */
  historyEntry: 2000,
  /** Panjang maksimum teks TTS (biaya ElevenLabs per karakter). */
  ttsText: 300,
  /** Panjang maksimum identitas login (email/username). */
  identifier: 254,
  /** Panjang maksimum password yang diterima (bcrypt memotong di 72 byte). */
  password: 128,
  /** Panjang maksimum API key Gemini yang disimpan user. */
  apiKey: 512,
} as const;

/**
 * Daftar lokasi kencan yang sah — cerminan dari `LOCATIONS` di
 * `app/(main)/date/page.tsx`. Lokasi dari client dipakai di prompt AI, jadi
 * wajib di-whitelist, bukan sekadar di-trim.
 */
export const DATE_LOCATIONS = [
  'Supermarket',
  'Taman Kota',
  'Kafe Kucing',
  'Perpustakaan',
  'Arcade Center',
  'Warung Ramen',
  'Restoran Gyoza',
  'Museum Seni',
  'Taman Hiburan',
  'Studio Potret',
  'Konser Musik',
  'Festival Musim Panas',
  'Pantai',
  'Bioskop',
  'Akuarium',
  'Food Court',
  'Ice Skating',
] as const;

export type DateLocation = (typeof DATE_LOCATIONS)[number];

/**
 * Buang karakter kontrol & zero-width, rapikan spasi.
 * Tidak menghapus tanda baca — pesan chat itu teks bebas.
 */
export function sanitizeText(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Nama user masuk ke prompt AI. Perlakukan sebagai data, bukan instruksi:
 * buang newline/tanda kutip yang bisa "menutup" konteks dan batasi panjangnya.
 */
export function sanitizeUserName(input: string | null | undefined): string {
  const base = sanitizeText(String(input ?? '')).replace(/[\r\n]+/g, ' ').replace(/["`]/g, '');
  const clipped = base.slice(0, LIMITS.userName).trim();
  return clipped.length > 0 ? clipped : 'Kamu';
}

/** Ambil string dari body, lempar 400 kalau tipe/panjangnya salah. */
export function requireString(
  value: unknown,
  field: string,
  { max, min = 1 }: { max: number; min?: number }
): string {
  if (typeof value !== 'string') {
    throw errors.badRequest(`Field "${field}" wajib berupa teks.`, 'INVALID_FIELD');
  }
  const clean = sanitizeText(value);
  if (clean.length < min) {
    throw errors.badRequest(`Field "${field}" tidak boleh kosong.`, 'INVALID_FIELD');
  }
  if (clean.length > max) {
    throw errors.badRequest(`Field "${field}" maksimal ${max} karakter.`, 'FIELD_TOO_LONG');
  }
  return clean;
}

/** Validasi pesan chat: wajib string, ≤ 2000 karakter, sudah disanitasi. */
export function validateChatMessage(value: unknown): string {
  return requireString(value, 'message', { max: LIMITS.chatMessage });
}

/** Validasi lokasi kencan terhadap whitelist. */
export function validateDateLocation(value: unknown): DateLocation {
  const clean = requireString(value, 'location', { max: LIMITS.location });
  const match = DATE_LOCATIONS.find((loc) => loc.toLowerCase() === clean.toLowerCase());
  if (!match) {
    throw errors.badRequest('Lokasi kencan tidak dikenal.', 'INVALID_LOCATION');
  }
  return match;
}

export type ChatTurn = { role: 'user' | 'livia' | 'narator'; content: string };

/**
 * History dari client dipakai langsung di prompt. Bersihkan:
 * - hanya role yang dikenal (selain itu dibuang, bukan diteruskan)
 * - tiap entri dipotong ke batas panjang
 * - jumlah entri dibatasi
 */
export function validateHistory(value: unknown): ChatTurn[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw errors.badRequest('Field "history" wajib berupa array.', 'INVALID_FIELD');
  }

  const turns: ChatTurn[] = [];
  for (const raw of value.slice(-LIMITS.historyMessages)) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as { role?: unknown; content?: unknown };
    if (typeof entry.content !== 'string') continue;

    // Whitelist ketat: role tak dikenal DIBUANG, bukan dipaksa jadi 'user'.
    // Sebelumnya `role: "system"` dari client lolos jadi 'user' dan tetap
    // membawa instruksi penyerang ke dalam prompt.
    if (entry.role !== 'user' && entry.role !== 'livia' && entry.role !== 'narator') {
      continue;
    }

    const role = entry.role as ChatTurn['role'];

    const content = sanitizeText(entry.content).slice(0, LIMITS.historyEntry);
    if (content.length === 0) continue;

    turns.push({ role, content });
  }

  return turns;
}

/** Validasi teks TTS: wajib string, ≤ 300 karakter (biaya per karakter). */
export function validateTtsText(value: unknown): string {
  return requireString(value, 'text', { max: LIMITS.ttsText });
}

/** Email sederhana tapi cukup ketat untuk menolak `a@b`. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,20}$/;

export type RegisterInput = { username: string; email: string; password: string };

/**
 * Validasi registrasi (H0.4/H0.5). Password `"1"` tidak boleh lolos lagi.
 */
export function validateRegisterInput(body: unknown): RegisterInput {
  if (!body || typeof body !== 'object') {
    throw errors.badRequest('Data registrasi tidak valid.', 'INVALID_FIELD');
  }
  const { username, email, password } = body as Record<string, unknown>;

  const cleanUsername = requireString(username, 'username', { max: 20, min: 3 });
  if (!USERNAME_RE.test(cleanUsername)) {
    throw errors.badRequest(
      'Username 3-20 karakter, hanya huruf, angka, titik, garis bawah, atau strip.',
      'INVALID_USERNAME'
    );
  }

  const cleanEmail = requireString(email, 'email', { max: LIMITS.identifier, min: 5 }).toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) {
    throw errors.badRequest('Format email tidak valid.', 'INVALID_EMAIL');
  }

  if (typeof password !== 'string') {
    throw errors.badRequest('Password wajib berupa teks.', 'INVALID_FIELD');
  }
  if (password.length < 8) {
    throw errors.badRequest('Password minimal 8 karakter.', 'WEAK_PASSWORD');
  }
  if (password.length > LIMITS.password) {
    throw errors.badRequest(`Password maksimal ${LIMITS.password} karakter.`, 'WEAK_PASSWORD');
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw errors.badRequest('Password harus mengandung huruf dan angka.', 'WEAK_PASSWORD');
  }

  return { username: cleanUsername, email: cleanEmail, password };
}

/** Validasi identifier login/reset (email atau username). */
export function validateIdentifier(value: unknown): string {
  return requireString(value, 'identifier', { max: LIMITS.identifier });
}
