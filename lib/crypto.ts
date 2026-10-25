import crypto from 'node:crypto';

/**
 * Enkripsi simetris untuk secret milik user (mis. API key Gemini pribadi).
 *
 * Algoritma: AES-256-GCM (authenticated encryption) — mencegah ciphertext
 * dimodifikasi tanpa terdeteksi.
 *
 * Kunci diambil dari env `ENCRYPTION_KEY` (base64, 32 byte / 256 bit).
 * Generate dengan:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * PENTING: kalau ENCRYPTION_KEY hilang/berubah, semua secret lama tidak bisa
 * didekripsi. Simpan di secret manager, JANGAN commit ke git, dan siapkan
 * rotasi kunci (lihat docs/M0-IMPLEMENTATION.md).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit, rekomendasi NIST untuk GCM

export class CryptoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoConfigError';
  }
}

function getMasterKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new CryptoConfigError(
      'ENCRYPTION_KEY belum diset. Generate dengan: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw.trim(), 'base64');
  } catch {
    throw new CryptoConfigError('ENCRYPTION_KEY bukan base64 yang valid.');
  }

  if (key.length !== 32) {
    throw new CryptoConfigError(
      `ENCRYPTION_KEY harus 32 byte (256-bit) setelah di-decode base64, ditemukan ${key.length} byte.`
    );
  }

  return key;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptSecret(plaintext: string): EncryptedPayload {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = getMasterKey();

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  } catch {
    // Jangan pernah bocorkan detail kegagalan kripto ke client.
    throw new Error('Gagal mendekripsi secret: kunci enkripsi tidak cocok atau data korup.');
  }
}

/**
 * Hint aman untuk ditampilkan di UI: hanya 4 karakter terakhir.
 */
export function maskSecret(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.length <= 4) return '••••';
  return `••••••••${trimmed.slice(-4)}`;
}

/**
 * Perbandingan string constant-time, dipakai untuk verifikasi token/secret.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
