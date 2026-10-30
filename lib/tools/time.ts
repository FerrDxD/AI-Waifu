/**
 * Parsing waktu relatif untuk tool `create_reminder` (M8.3).
 *
 * Model mengirim `time` sebagai teks bebas: "jam 7", "besok jam 7 malam",
 * "7:30", atau ISO absolute ("2026-10-30T07:00:00+07:00"). Server
 * menerjemahkan ke `Date` absolut.
 *
 * Zona waktu USER tidak diketahui server (Vercel = UTC), jadi browser
 * mengirim `offsetMinutes` (`new Date().getTimezoneOffset()`: WIB = -420).
 * Semua perhitungan "wall clock" dilakukan di zona itu, lalu dikonversi ke
 * UTC sebelum disimpan.
 */

export interface RemindTimeOptions {
  /** Untuk test; default `new Date()`. */
  now?: Date;
  /** Offset zona waktu user dalam menit (JavaScript convention: UTC - lokal). */
  offsetMinutes: number;
}

/** "jam 7" tanpa keterangan = 07:00; "jam 7 malam" = 19:00. */
function normalizeHour(hour: number, qualifier?: string): number | null {
  if (!qualifier) return hour;

  const q = qualifier.toLowerCase();
  if (q === 'am') return hour === 12 ? 0 : hour;
  if (q === 'pm') return hour < 12 ? hour + 12 : hour;
  if (q.startsWith('pag')) return hour === 12 ? 0 : hour;
  if (q.startsWith('sian')) return hour < 12 ? hour + 12 : hour;
  if (q.startsWith('sore') || q.startsWith('mlm') || q.startsWith('mal')) {
    return hour < 12 ? hour + 12 : hour;
  }
  return null;
}

const TIME_PATTERN =
  /^(?:(besok|lusa)\s+)?(?:jam\s+)?(\d{1,2})(?::(\d{2}))?(?:\s*(pagi|siang|sore|malam|pg|mlm|am|pm))?$/i;

/**
 * Terjemahkan teks waktu relatif menjadi `Date` absolut.
 *
 * Mengembalikan `null` kalau pola tidak dikenali — pemanggil (executor)
 * menyuruh Livia meminta kejelasan, bukan menggagalkan balasan.
 */
export function parseRemindTime(raw: unknown, opts: RemindTimeOptions): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const text = raw.trim();
  const now = opts.now ?? new Date();

  // Absolute ISO — langsung dipakai. (`new Date('7')` menghasilkan tanggal
  // aneh, jadi hanya terima jika hasilnya tampak seperti tanggal asli.)
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const iso = new Date(text);
    if (!Number.isNaN(iso.getTime())) return iso;
    return null;
  }

  const m = TIME_PATTERN.exec(text.toLowerCase());
  if (!m) return null;

  const dayShift = m[1] === 'besok' ? 1 : m[1] === 'lusa' ? 2 : 0;
  const hour = Number(m[2]);
  const minute = m[3] ? Number(m[3]) : 0;
  if (hour > 23 || minute > 59) return null;

  const normalized = normalizeHour(hour, m[4]);
  if (normalized === null) return null;

  // "Hari ini" pada jam dinding user. `offsetMinutes` = UTC - lokal, jadi
  // timestamp yang merepresentasikan jam dinding = now - offset.
  const wallToday = new Date(now.getTime() - opts.offsetMinutes * 60000);

  const wallToUtc = (dayOffset: number): Date => {
    const wall = new Date(
      Date.UTC(
        wallToday.getUTCFullYear(),
        wallToday.getUTCMonth(),
        wallToday.getUTCDate() + dayOffset,
        normalized,
        minute
      )
    );
    // Wall clock W di zona user = UTC W + offset.
    return new Date(wall.getTime() + opts.offsetMinutes * 60000);
  };

  const target = wallToUtc(dayShift);

  // Sudah lewat & bukan "besok" → geser ke esok hari (mis. "jam 7" diucapkan
  // jam 8 malam berarti besok pagi).
  if (dayShift === 0 && target.getTime() <= now.getTime()) {
    return wallToUtc(1);
  }

  return target;
}

/** Format tanggal untuk ditampilkan di konfirmasi (zona user). */
export function formatDateTime(d: Date, offsetMinutes = 0): string {
  const shifted = new Date(d.getTime() - offsetMinutes * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(shifted.getUTCFullYear())}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}
