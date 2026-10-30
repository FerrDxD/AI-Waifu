import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validPushSubscription } from '@/lib/push/validate';
import { isCronAuthorized } from '@/lib/push/cron-guard';
import { isPushEnabled } from '@/lib/push/push.server';
import { __resetEnvCacheForTests } from '@/lib/env';

/**
 * M8.5 — Validasi input & guard push (pure, tanpa DB/network).
 *
 * Fokus pada titik keamanan yang menentukan: bentuk subscription yang
 * disimpan (anti-abuse) dan autorisasi cron (anti-spam massal).
 */

const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED);
  __resetEnvCacheForTests();
});

afterEach(() => {
  process.env = snapshot;
  __resetEnvCacheForTests();
});

describe('validPushSubscription (M8.5)', () => {
  it('menerima subscription https yang valid', () => {
    const sub = validPushSubscription({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh: 'B'.repeat(87),
      auth: 'a'.repeat(22),
    });
    expect(sub).not.toBeNull();
    expect(sub?.endpoint).toBe('https://fcm.googleapis.com/fcm/send/abc123');
    expect(sub?.p256dh).toHaveLength(87);
  });

  it('menolak endpoint non-https (http://)', () => {
    expect(
      validPushSubscription({
        endpoint: 'http://evil.example.com/push',
        p256dh: 'B'.repeat(87),
        auth: 'a'.repeat(22),
      })
    ).toBeNull();
  });

  it('menolak endpoint tanpa skema https', () => {
    expect(
      validPushSubscription({
        endpoint: 'data:text/plain,x',
        p256dh: 'B'.repeat(87),
        auth: 'a'.repeat(22),
      })
    ).toBeNull();
  });

  it('menolak kunci yang bukan base64url (mengandung + / =)', () => {
    expect(
      validPushSubscription({
        endpoint: 'https://x.example.com/push',
        p256dh: 'this+is/not=base64url',
        auth: 'a'.repeat(22),
      })
    ).toBeNull();
  });

  it('menolak tipe field yang salah', () => {
    expect(
      validPushSubscription({
        endpoint: 123,
        p256dh: 'B'.repeat(87),
        auth: 'a'.repeat(22),
      })
    ).toBeNull();
  });

  it('menolak kunci p256dh terlalu pendek', () => {
    expect(
      validPushSubscription({
        endpoint: 'https://x.example.com/push',
        p256dh: 'short',
        auth: 'a'.repeat(22),
      })
    ).toBeNull();
  });

  it('menolak auth terlalu pendek', () => {
    expect(
      validPushSubscription({
        endpoint: 'https://x.example.com/push',
        p256dh: 'B'.repeat(87),
        auth: 'tiny',
      })
    ).toBeNull();
  });
});

describe('isCronAuthorized (M8.5)', () => {
  it('false saat CRON_SECRET tidak diset', () => {
    delete process.env.CRON_SECRET;
    __resetEnvCacheForTests();
    const req = new Request('http://x', { headers: { authorization: 'Bearer abc' } });
    expect(isCronAuthorized(req)).toBe(false);
  });

  it('true saat secret cocok', () => {
    process.env.CRON_SECRET = 'rahasia-cron';
    __resetEnvCacheForTests();
    const req = new Request('http://x', { headers: { authorization: 'Bearer rahasia-cron' } });
    expect(isCronAuthorized(req)).toBe(true);
  });

  it('false saat secret beda', () => {
    process.env.CRON_SECRET = 'rahasia-cron';
    __resetEnvCacheForTests();
    const req = new Request('http://x', { headers: { authorization: 'Bearer salah' } });
    expect(isCronAuthorized(req)).toBe(false);
  });

  it('false saat header authorization kosong', () => {
    process.env.CRON_SECRET = 'rahasia-cron';
    __resetEnvCacheForTests();
    const req = new Request('http://x');
    expect(isCronAuthorized(req)).toBe(false);
  });
});

describe('isPushEnabled (M8.5)', () => {
  it('false saat VAPID belum lengkap', () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    __resetEnvCacheForTests();
    expect(isPushEnabled()).toBe(false);
  });

  it('true saat semua VAPID terisi', () => {
    process.env.VAPID_PUBLIC_KEY = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
    __resetEnvCacheForTests();
    expect(isPushEnabled()).toBe(true);
  });

  it('false saat hanya sebagian VAPID terisi', () => {
    process.env.VAPID_PUBLIC_KEY = 'pub';
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    __resetEnvCacheForTests();
    expect(isPushEnabled()).toBe(false);
  });
});