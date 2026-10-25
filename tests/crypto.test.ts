import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  timingSafeEqualString,
  CryptoConfigError,
} from '@/lib/crypto';

const VALID_KEY = crypto.randomBytes(32).toString('base64');
const SECRET = 'AIzaSyFAKE-test-key-1234567890abcdefXYZ';

beforeEach(() => {
  process.env.ENCRYPTION_KEY = VALID_KEY;
});

describe('encryptSecret / decryptSecret', () => {
  it('roundtrip mengembalikan plaintext yang sama', () => {
    const payload = encryptSecret(SECRET);
    expect(decryptSecret(payload)).toBe(SECRET);
  });

  it('ciphertext tidak mengandung plaintext', () => {
    const payload = encryptSecret(SECRET);
    expect(JSON.stringify(payload)).not.toContain(SECRET);
    expect(payload.ciphertext).not.toContain('AIzaSy');
  });

  it('IV berbeda setiap enkripsi (semantic security)', () => {
    const a = encryptSecret(SECRET);
    const b = encryptSecret(SECRET);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('menolak ciphertext yang dimodifikasi (auth tag GCM)', () => {
    const payload = encryptSecret(SECRET);
    const tampered = { ...payload, ciphertext: Buffer.from('evil').toString('base64') };
    expect(() => decryptSecret(tampered)).toThrow(/Gagal mendekripsi/);
  });

  it('menolak auth tag yang dimodifikasi', () => {
    const payload = encryptSecret(SECRET);
    const tampered = { ...payload, authTag: crypto.randomBytes(16).toString('base64') };
    expect(() => decryptSecret(tampered)).toThrow(/Gagal mendekripsi/);
  });

  it('menolak kunci enkripsi yang berbeda', () => {
    const payload = encryptSecret(SECRET);
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    expect(() => decryptSecret(payload)).toThrow(/Gagal mendekripsi/);
  });

  it('pesan error tidak membocorkan detail kripto', () => {
    const payload = encryptSecret(SECRET);
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    try {
      decryptSecret(payload);
      expect.unreachable('seharusnya throw');
    } catch (e) {
      const message = (e as Error).message;
      expect(message).not.toMatch(/OpenSSL|EVP|bad decrypt|auth/i);
    }
  });
});

describe('validasi ENCRYPTION_KEY', () => {
  it('gagal kalau ENCRYPTION_KEY tidak diset', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptSecret('x')).toThrow(CryptoConfigError);
  });

  it('gagal kalau ENCRYPTION_KEY bukan 32 byte', () => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(16).toString('base64');
    expect(() => encryptSecret('x')).toThrow(/32 byte/);
  });

  it('gagal kalau ENCRYPTION_KEY kosong', () => {
    process.env.ENCRYPTION_KEY = '   ';
    expect(() => encryptSecret('x')).toThrow(CryptoConfigError);
  });
});

describe('maskSecret', () => {
  it('hanya menampilkan 4 karakter terakhir', () => {
    expect(maskSecret(SECRET)).toBe(`••••••••${SECRET.slice(-4)}`);
  });

  it('tidak pernah memuat sebagian besar secret', () => {
    const masked = maskSecret(SECRET);
    expect(masked).not.toContain('AIzaSy');
    expect(masked.replace(/•/g, '')).toHaveLength(4);
  });

  it('menyamarkan total kalau secret sangat pendek', () => {
    expect(maskSecret('abc')).toBe('••••');
    expect(maskSecret('abcd')).toBe('••••');
  });

  it('trim spasi sebelum menyamarkan', () => {
    expect(maskSecret('  abcdefgh  ')).toBe('••••••••efgh');
  });
});

describe('timingSafeEqualString', () => {
  it('true untuk string identik', () => {
    expect(timingSafeEqualString('rahasia', 'rahasia')).toBe(true);
  });

  it('false untuk string berbeda', () => {
    expect(timingSafeEqualString('rahasia', 'rahasib')).toBe(false);
  });

  it('false untuk panjang berbeda (tanpa throw)', () => {
    expect(timingSafeEqualString('pendek', 'lebihpanjang')).toBe(false);
  });
});
