import { describe, it, expect } from 'vitest';
import { shouldSummarize, SUMMARY_THRESHOLD } from '@/lib/livia/summary';

/**
 * Penjadwal ringkasan (M2.5).
 *
 * Hanya bagian MURNI yang diuji; koneksi DB + panggilan provider ada di
 * `maybeSummarizeChats` (integrasi), jalurnya sudah diuji route-level dan
 * errornya ditelan supaya turn chat tidak pernah gagal gara-gara ringkasan.
 */
describe('shouldSummarize', () => {
  it('threshold default 20 terpasang', () => {
    expect(SUMMARY_THRESHOLD).toBe(20);
  });

  it('belum sampai ambang → tidak meringkas', () => {
    expect(shouldSummarize(0, 19)).toEqual({ shouldSummarize: false, pending: 19 });
  });

  it('pas di ambang → meringkas', () => {
    expect(shouldSummarize(0, 20).shouldSummarize).toBe(true);
  });

  it('menghitung sisa dari pesan yang SUDAH tercakup', () => {
    // 80 sudah terecap, total 95 → menunggak 15 → belum
    expect(shouldSummarize(80, 95)).toEqual({ shouldSummarize: false, pending: 15 });
    // total 100 → menunggak 20 → ya
    expect(shouldSummarize(80, 100)).toEqual({ shouldSummarize: true, pending: 20 });
  });

  it('pencakupan melebihi total (pesan terhapus) tidak jadi negatif', () => {
    expect(shouldSummarize(50, 30)).toEqual({ shouldSummarize: false, pending: 0 });
  });

  it('threshold khusus bisa di-inject', () => {
    expect(shouldSummarize(3, 5, 2).shouldSummarize).toBe(true);
  });
});
