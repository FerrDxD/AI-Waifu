import { describe, it, expect } from 'vitest';
import { MODEL_PRICING, pricingFor, costMicrosFor, costUsd } from '@/lib/ai/pricing';

/**
 * Unit test `lib/ai/pricing.ts` (M7.1) — fungsi murni, tanpa mock.
 *
 * Yang dijamin di sini adalah LOGIKA BIAYA: angka tabel masuk akal,
 * model tak dikenal tidak ditebak, token negatif tidak menghasilkan
 * biaya negatif, dan pembulatan ke micro-USD stabil.
 */

describe('MODEL_PRICING (tabel)', () => {
  it('model default app ada di tabel', () => {
    expect(MODEL_PRICING['gemini-3.6-flash']).toBeDefined();
    expect(MODEL_PRICING['gemini-3.6-flash']!.inputPerM).toBeGreaterThan(0);
    expect(MODEL_PRICING['gemini-3.6-flash']!.outputPerM).toBeGreaterThan(0);
  });

  it('output selalu sama/mahal dari input (aturan harga Gemini)', () => {
    for (const [model, p] of Object.entries(MODEL_PRICING)) {
      expect(p.outputPerM, model).toBeGreaterThanOrEqual(p.inputPerM);
      expect(p.inputPerM, model).toBeGreaterThan(0);
    }
  });
});

describe('pricingFor', () => {
  it('model dikenal → harga dari tabel', () => {
    expect(pricingFor('gemini-3.6-flash')).toEqual({ inputPerM: 0.3, outputPerM: 2.5 });
  });

  it('model tak dikenal → 0/0 (dihargai nol, bukan ditebak)', () => {
    expect(pricingFor('model-yang-belum-ada')).toEqual({ inputPerM: 0, outputPerM: 0 });
  });

  it('nama model case-sensitive (nama model API memang case-sensitive)', () => {
    expect(pricingFor('Gemini-3.6-flash')).toEqual({ inputPerM: 0, outputPerM: 0 });
  });
});

describe('costMicrosFor', () => {
  it('1M token in + 1M token out pada gemini-3.6-flash = $0.30 + $2.50 = 2.800.000 micro', () => {
    expect(costMicrosFor('gemini-3.6-flash', 1_000_000, 1_000_000)).toBe(2_800_000);
  });

  it('turn chat tipikal (2.000 in, 300 out) = 1.350 micro ($0.00135)', () => {
    // 2000 * 0.3 / 1e6  = 600e-6
    //  300 * 2.5 / 1e6  = 750e-6
    expect(costMicrosFor('gemini-3.6-flash', 2_000, 300)).toBe(1_350);
  });

  it('hanya token output ikut terhitung', () => {
    expect(costMicrosFor('gemini-3.6-flash', 0, 1_000_000)).toBe(2_500_000);
  });

  it('model tak dikenal → 0 (dashboard menampilkan modelnya tanpa biaya)', () => {
    expect(costMicrosFor('model-yang-belum-ada', 100_000, 100_000)).toBe(0);
  });

  it('token negatif di-klamp ke 0 (defensive — tidak mungkin dari SDK)', () => {
    expect(costMicrosFor('gemini-3.6-flash', -1_000, -1_000)).toBe(0);
    expect(costMicrosFor('gemini-3.6-flash', -1_000, 100_000)).toBe(
      costMicrosFor('gemini-3.6-flash', 0, 100_000)
    );
  });

  it('pembulatan ke micro terdekat', () => {
    // 1 token in gemini-1.5-flash = 0.075/1e6 USD = 0.075 micro → 0
    expect(costMicrosFor('gemini-1.5-flash', 1, 0)).toBe(0);
    // 1.000 token in = 75 micro tepat
    expect(costMicrosFor('gemini-1.5-flash', 1_000, 0)).toBe(75);
  });

  it('hasil selalu integer non-negatif', () => {
    for (const model of Object.keys(MODEL_PRICING)) {
      for (const [inp, out] of [
        [1, 1],
        [123, 456],
        [999_999, 999_999],
      ] as const) {
        const c = costMicrosFor(model, inp, out);
        expect(Number.isInteger(c), `${model} ${inp}/${out}`).toBe(true);
        expect(c, `${model} ${inp}/${out}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('costUsd', () => {
  it('konversi balik micro → USD', () => {
    expect(costUsd(2_800_000)).toBeCloseTo(2.8, 9);
    expect(costUsd(0)).toBe(0);
  });
});
