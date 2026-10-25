import { describe, it, expect } from 'vitest';
import {
  getLockoutState,
  recordFailedLogin,
  clearLoginFailures,
  LOCKOUT_POLICY,
} from '@/lib/auth-lockout';

const unique = (() => {
  let n = 0;
  return (prefix: string) => `${prefix}-${Date.now()}-${++n}`;
})();

describe('kebijakan lockout', () => {
  it('5 percobaan gagal, kunci 15 menit', () => {
    expect(LOCKOUT_POLICY.maxFailedAttempts).toBe(5);
    expect(LOCKOUT_POLICY.lockoutMs).toBe(15 * 60_000);
  });
});

describe('getLockoutState', () => {
  it('identifier baru tidak terkunci dan punya 5 kesempatan', () => {
    const state = getLockoutState(unique('fresh'));
    expect(state.locked).toBe(false);
    expect(state.remainingAttempts).toBe(5);
    expect(state.retryAfterSeconds).toBe(0);
  });
});

describe('recordFailedLogin', () => {
  it('mengurangi sisa kesempatan tiap kegagalan', () => {
    const id = unique('count');
    expect(recordFailedLogin(id).remainingAttempts).toBe(4);
    expect(recordFailedLogin(id).remainingAttempts).toBe(3);
    expect(recordFailedLogin(id).remainingAttempts).toBe(2);
    expect(recordFailedLogin(id).remainingAttempts).toBe(1);
  });

  it('mengunci setelah kegagalan ke-5', () => {
    const id = unique('lock');
    let state = recordFailedLogin(id);
    for (let i = 0; i < 4; i++) state = recordFailedLogin(id);

    expect(state.locked).toBe(true);
    expect(state.remainingAttempts).toBe(0);
    expect(state.retryAfterSeconds).toBeGreaterThan(0);
    expect(state.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);
  });

  it('tetap terkunci walau password benar (state tidak berubah sendiri)', () => {
    const id = unique('stuck');
    for (let i = 0; i < 5; i++) recordFailedLogin(id);

    // authorize() akan memanggil getLockoutState() sebelum cek password.
    expect(getLockoutState(id).locked).toBe(true);
  });

  it('normalisasi identifier: huruf besar/kecil & spasi dianggap sama', () => {
    const base = unique('norm');
    for (let i = 0; i < 5; i++) recordFailedLogin(base.toUpperCase() + '   ');
    expect(getLockoutState(base.toLowerCase()).locked).toBe(true);
  });

  it('identifier berbeda tidak saling mempengaruhi', () => {
    const victim = unique('victim');
    const other = unique('other');
    for (let i = 0; i < 5; i++) recordFailedLogin(victim);

    expect(getLockoutState(victim).locked).toBe(true);
    expect(getLockoutState(other).locked).toBe(false);
    expect(getLockoutState(other).remainingAttempts).toBe(5);
  });
});

describe('clearLoginFailures', () => {
  it('menghapus hitungan setelah login sukses', () => {
    const id = unique('clear');
    recordFailedLogin(id);
    recordFailedLogin(id);
    expect(getLockoutState(id).remainingAttempts).toBe(3);

    clearLoginFailures(id);
    expect(getLockoutState(id).remainingAttempts).toBe(5);
    expect(getLockoutState(id).locked).toBe(false);
  });

  it('membuka lockout yang sedang aktif', () => {
    const id = unique('clear-lock');
    for (let i = 0; i < 5; i++) recordFailedLogin(id);
    expect(getLockoutState(id).locked).toBe(true);

    clearLoginFailures(id);
    expect(getLockoutState(id).locked).toBe(false);
  });
});
