import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  requireEnv,
  requireEnvVar,
  optionalEnvVar,
  isApiKeyStorageEnabled,
  EnvError,
  __resetEnvCacheForTests,
} from '@/lib/env';

const VALID = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, VALID);
  __resetEnvCacheForTests();
});

afterEach(() => {
  process.env = snapshot;
  __resetEnvCacheForTests();
});

describe('requireEnv', () => {
  it('lulus dengan konfigurasi minimal', () => {
    const env = requireEnv();
    expect(env.DATABASE_URL).toBe(VALID.DATABASE_URL);
    expect(env.GEMINI_API_KEY).toBe('gemini-key');
  });

  it('gagal kalau DATABASE_URL hilang', () => {
    delete process.env.DATABASE_URL;
    expect(() => requireEnv()).toThrow(EnvError);
  });

  it('gagal kalau DATABASE_URL bukan postgres', () => {
    process.env.DATABASE_URL = 'mysql://localhost/db';
    expect(() => requireEnv()).toThrow(/postgres/);
  });

  it('gagal kalau NEXTAUTH_SECRET kurang dari 32 karakter', () => {
    process.env.NEXTAUTH_SECRET = 'pendek';
    expect(() => requireEnv()).toThrow(/32 karakter/);
  });

  it('gagal kalau GEMINI_API_KEY kosong', () => {
    process.env.GEMINI_API_KEY = '';
    expect(() => requireEnv()).toThrow(EnvError);
  });

  it('mengumpulkan semua masalah sekaligus, bukan berhenti di satu', () => {
    delete process.env.DATABASE_URL;
    process.env.NEXTAUTH_SECRET = 'x';
    delete process.env.GEMINI_API_KEY;

    try {
      requireEnv();
      expect.unreachable('seharusnya throw');
    } catch (e) {
      const err = e as EnvError;
      expect(err.issues.length).toBeGreaterThanOrEqual(3);
      expect(err.issues.join(' ')).toContain('DATABASE_URL');
      expect(err.issues.join(' ')).toContain('NEXTAUTH_SECRET');
      expect(err.issues.join(' ')).toContain('GEMINI_API_KEY');
    }
  });

  it('ENCRYPTION_KEY opsional, tapi kalau ada harus 32 byte', () => {
    process.env.ENCRYPTION_KEY = Buffer.from('pendek').toString('base64');
    expect(() => requireEnv()).toThrow(/32 byte/);
  });

  it('menerima ENCRYPTION_KEY 32 byte yang valid', () => {
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    expect(() => requireEnv()).not.toThrow();
  });

  it('meng-cache hasil supaya tidak parse berulang', () => {
    const first = requireEnv();
    process.env.GEMINI_API_KEY = 'diganti-setelah-cache';
    expect(requireEnv()).toBe(first);
  });
});

describe('requireEnvVar / optionalEnvVar', () => {
  it('requireEnvVar mengembalikan nilai', () => {
    expect(requireEnvVar('GEMINI_API_KEY')).toBe('gemini-key');
  });

  it('requireEnvVar melempar untuk variabel opsional yang kosong', () => {
    expect(() => requireEnvVar('ELEVENLABS_API_KEY')).toThrow(EnvError);
  });

  it('optionalEnvVar mengembalikan undefined kalau kosong', () => {
    expect(optionalEnvVar('ELEVENLABS_API_KEY')).toBeUndefined();
  });

  it('optionalEnvVar mengembalikan nilai kalau diisi', () => {
    process.env.ELEVENLABS_API_KEY = 'el-key';
    expect(optionalEnvVar('ELEVENLABS_API_KEY')).toBe('el-key');
  });
});

describe('isApiKeyStorageEnabled', () => {
  it('false kalau ENCRYPTION_KEY tidak ada', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(isApiKeyStorageEnabled()).toBe(false);
  });

  it('false kalau panjangnya salah', () => {
    process.env.ENCRYPTION_KEY = Buffer.from('terlalupendek').toString('base64');
    expect(isApiKeyStorageEnabled()).toBe(false);
  });

  it('true kalau 32 byte valid', () => {
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    expect(isApiKeyStorageEnabled()).toBe(true);
  });
});
