/**
 * Circuit breaker untuk panggilan LLM (M2.6).
 *
 * Kenapa perlu: retry saja tidak cukup. Kalau Gemini sedang mati total, setiap
 * request user akan menunggu `AI_TIMEOUT_MS` × (retries + 1) — bisa 75 detik —
 * padahal hasilnya sudah pasti gagal. Circuit breaker mengubah kegagalan
 * beruntun menjadi kegagalan **cepat**, lalu mencoba lagi secara berkala.
 *
 * Tiga keadaan:
 *   closed    → normal, semua panggilan boleh lewat.
 *   open      → terlalu banyak kegagalan; panggilan ditolak seketika.
 *   half_open → cooldown habis; izinkan SATU percobaan uji. Berhasil → closed,
 *               gagal → open lagi dengan cooldown baru.
 *
 * Catatan jujur: state ini per-proses (in-memory), sama seperti rate limiter di
 * M0/M1. Di deployment multi-instance, tiap instance punya breaker sendiri.
 * Itu masih berguna (mencegah badai retry per instance), tapi bukan pengganti
 * breaker terdistribusi — lihat M5.5.
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  /** Jumlah kegagalan beruntun sebelum breaker membuka. */
  failureThreshold: number;
  /** Lama breaker tetap terbuka sebelum mencoba satu percobaan uji. */
  cooldownMs: number;
  /** Sumber waktu yang bisa di-inject untuk test. */
  now?: () => number;
}

interface CircuitRecord {
  failures: number;
  /** Waktu breaker dibuka. `null` = tidak sedang terbuka. */
  openedAt: number | null;
  /** Ada percobaan uji (half-open) yang sedang berjalan. */
  probeInFlight: boolean;
}

export class CircuitBreaker {
  private readonly records = new Map<string, CircuitRecord>();
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = Math.max(1, options.failureThreshold);
    this.cooldownMs = Math.max(0, options.cooldownMs);
    this.now = options.now ?? Date.now;
  }

  /** Keadaan breaker saat ini, tanpa efek samping. */
  state(key: string): CircuitState {
    const record = this.records.get(key);
    if (!record || record.openedAt === null) return 'closed';

    if (this.now() - record.openedAt >= this.cooldownMs) {
      return 'half_open';
    }
    return 'open';
  }

  /**
   * Apakah panggilan boleh lewat?
   *
   * `half_open` hanya mengizinkan satu percobaan pada satu waktu — kalau
   * dibiarkan, 50 request bersamaan akan menghantam backend yang baru saja
   * gagal dan langsung mematikannya lagi.
   */
  allow(key: string): boolean {
    const state = this.state(key);

    if (state === 'closed') return true;
    if (state === 'open') return false;

    const record = this.records.get(key)!;
    if (record.probeInFlight) return false;
    record.probeInFlight = true;
    return true;
  }

  /** Panggilan berhasil → tutup breaker, lupakan riwayat kegagalan. */
  success(key: string): void {
    this.records.delete(key);
  }

  /**
   * Panggilan gagal.
   *
   * Dipanggil SEKALI per request yang sudah menghabiskan seluruh retry, bukan
   * per percobaan. Kalau dipanggil per percobaan, `maxRetries: 2` berarti 3
   * kegagalan per request dan breaker membuka setelah ~2 request buruk.
   */
  failure(key: string): void {
    const record = this.records.get(key) ?? {
      failures: 0,
      openedAt: null,
      probeInFlight: false,
    };

    record.failures += 1;
    record.probeInFlight = false;

    // Gagal saat half-open → langsung buka lagi, jangan tunggu ambang.
    if (this.state(key) === 'half_open' || record.failures >= this.failureThreshold) {
      record.openedAt = this.now();
      record.failures = 0;
    }

    this.records.set(key, record);
  }

  /** Buang state satu key (atau semua). Dipakai test & saat config berubah. */
  reset(key?: string): void {
    if (key === undefined) this.records.clear();
    else this.records.delete(key);
  }

  /** Untuk logging/diagnostik: ringkasan semua breaker yang tidak closed. */
  snapshot(): Record<string, CircuitState> {
    const out: Record<string, CircuitState> = {};
    for (const key of this.records.keys()) {
      const state = this.state(key);
      if (state !== 'closed') out[key] = state;
    }
    return out;
  }
}
