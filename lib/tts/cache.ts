import { createHash } from 'crypto';
import { and, desc, eq, notInArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ttsCache, ttsUsage } from '@/lib/db/schema';
import { logger } from '@/lib/logger';

/**
 * Cache audio TTS + pencatatan penggunaan (M6.4).
 *
 * **Kenapa**: ElevenLabs menagih per karakter yang disintesis. Livia banyak
 * mengulang kalimat serupa (sapaan, keluhan kasarnya) — sintesis ulang
 * kalimat yang sama adalah pemborongan murni. Cache keyed oleh
 * `sha256(voiceId|modelId|text)` sehingga hit = nol biaya.
 *
 * **Penyimpanan**: `bytea` di Neon (tanpa infra storage baru). Skala:
 * rata-rata satu kalimat ~10–20 KB mp3; `TTS_CACHE_MAX_ROWS` baris ≈ puluhan
 * MB — aman untuk Postgres serverless. Eviction LRU berdasarkan
 * `lastHitAt` menjaga tabel tidak tumbuh tanpa batas.
 *
 * **FAIL-OPEN** (pola `rateLimitCounters`): kegagalan cache/usage TIDAK
 * menggagalkan request — TTS harus tetap jalan walau pencatatannya down.
 * Semua kegagalan di-`logger.error` dan di-swalow.
 */

/** Batas baris cache — lebih dari ini, baris paling lama dibuang. */
export const TTS_CACHE_MAX_ROWS = 1000;

/** Default cap karakter/hari yang dikirim ke ElevenLabs (pengaman biaya). */
export const DEFAULT_TTS_MAX_CHARS_PER_DAY = 30_000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cap karakter/hari per user. Bisa dituning via env `TTS_MAX_CHARS_PER_DAY`
 * (mis. naikkan kalau plan ElevenLabs besar). Nilai tidak valid → default.
 */
export function ttsMaxCharsPerDay(): number {
  const raw = process.env.TTS_MAX_CHARS_PER_DAY;
  if (raw !== undefined) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_TTS_MAX_CHARS_PER_DAY;
}

/**
 * Key cache deterministik: `sha256(voiceId|modelId|mood|text)`.
 * Voice & model masuk key karena audio berbeda per kombinasinya. `mood`
 * (M6.5) menentukan `voice_settings` — sama teks beda mood = audio berbeda,
 * jadi harus dipisahkan di cache. Default `neutral` menjaga kompatibilitas
 * pemanggil lama; di route mood selalu dihitung eksplisit dari teks.
 */
export function ttsCacheKey(
  text: string,
  voiceId: string,
  modelId: string,
  mood: string = 'neutral'
): string {
  return createHash('sha256').update(`${voiceId}|${modelId}|${mood}|${text}`).digest('hex');
}

/** Awal hari UTC (epoch-aligned) — bucket harian untuk `ttsUsage`. */
export function dayBucketNow(now: Date = new Date()): Date {
  return new Date(Math.floor(now.getTime() / DAY_MS) * DAY_MS);
}

export type CachedAudio = { audio: Uint8Array<ArrayBuffer>; mimeType: string };

/**
 * Normalisasi bytea: driver neon-http umumnya memberi `Buffer` (subclass
 * Uint8Array), tapi tetap tahan kalau yang datang string hex/base64.
 * Selalu dikembalikan sebagai salinan segar (ArrayBuffer milik sendiri) —
 * penting karena Buffer node bisa berbagi pooled ArrayBuffer.
 */
async function toBytes(value: unknown): Promise<Uint8Array<ArrayBuffer>> {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (typeof value === 'string') {
    const isHex = /^[0-9a-f]+$/i.test(value) && value.length % 2 === 0;
    return new Uint8Array(Buffer.from(value, isHex ? 'hex' : 'base64'));
  }
  throw new Error('tts_cache.unexpected_audio_type');
}

/** Ambil audio ter-cache; null kalau belum ada. Men-touch `lastHitAt` (LRU). */
export async function getTtsCache(key: string): Promise<CachedAudio | null> {
  try {
    const rows = await db
      .select({ audio: ttsCache.audio, mimeType: ttsCache.mimeType })
      .from(ttsCache)
      .where(eq(ttsCache.key, key))
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    // LRU touch — best effort, jangan gagal-kan hit karena update-nya gagal.
    void db
      .update(ttsCache)
      .set({ lastHitAt: new Date() })
      .where(eq(ttsCache.key, key))
      .catch((error) => {
        logger.error('tts_cache.touch_failed', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return { audio: await toBytes(row.audio), mimeType: row.mimeType };
  } catch (error) {
    // FAIL-OPEN: cache down bukan alasan TTS gagal — sintesis jalan terus.
    logger.error('tts_cache.get_failed (fail-open)', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Simpan audio ke cache + evict LRU kalau melebihi batas. Best effort. */
export async function putTtsCache(
  key: string,
  audio: Uint8Array,
  mimeType: string
): Promise<void> {
  try {
    await db
      .insert(ttsCache)
      .values({
        key,
        audio: Buffer.from(audio),
        mimeType,
        createdAt: new Date(),
        lastHitAt: new Date(),
      })
      .onConflictDoUpdate({ target: ttsCache.key, set: { audio: Buffer.from(audio), mimeType } });
    await evictLru();
  } catch (error) {
    logger.error('tts_cache.put_failed (fail-open)', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Buang baris terlama sampai sisa <= TTS_CACHE_MAX_ROWS (urut LRU). */
async function evictLru(): Promise<void> {
  const total = await db.select({ n: sql<number>`count(*)` }).from(ttsCache);
  const count = total[0]?.n ?? 0;
  if (count <= TTS_CACHE_MAX_ROWS) return;

  const keep = await db
    .select({ key: ttsCache.key })
    .from(ttsCache)
    .orderBy(desc(ttsCache.lastHitAt), desc(ttsCache.createdAt))
    .limit(TTS_CACHE_MAX_ROWS);

  await db.delete(ttsCache).where(notInArray(ttsCache.key, keep.map((r) => r.key)));
}

/** Karakter yang sudah di-billing ke ElevenLabs hari ini (untuk cap harian). */
export async function getTtsDailyCharsBilled(userId: string): Promise<number> {
  try {
    const rows = await db
      .select({ charsBilled: ttsUsage.charsBilled })
      .from(ttsUsage)
      .where(and(eq(ttsUsage.userId, userId), eq(ttsUsage.day, dayBucketNow())))
      .limit(1);
    return rows[0]?.charsBilled ?? 0;
  } catch (error) {
    // FAIL-OPEN: pencatatan down, cap harian tidak bisa dicek — request
    // tetap lewat (rate limiter per-request masih aktif).
    logger.error('tts_usage.get_failed (fail-open)', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Catat satu request TTS (atomik). `charsBilled` hanya diisi saat miss.
 * Best effort — kegagalan pencatatan tidak menggagalkan pemutaran.
 */
export async function recordTtsUsage(
  userId: string,
  options: { cacheHit: boolean; charsBilled: number }
): Promise<void> {
  const day = dayBucketNow();
  const hitInc = options.cacheHit ? 1 : 0;
  try {
    await db
      .insert(ttsUsage)
      .values({
        userId,
        day,
        requests: 1,
        cacheHits: hitInc,
        charsBilled: options.charsBilled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [ttsUsage.userId, ttsUsage.day],
        set: {
          requests: sql`${ttsUsage.requests} + 1`,
          cacheHits: sql`${ttsUsage.cacheHits} + ${hitInc}`,
          charsBilled: sql`${ttsUsage.charsBilled} + ${options.charsBilled}`,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    logger.error('tts_usage.record_failed (fail-open)', {
      userId,
      cacheHit: options.cacheHit,
      charsBilled: options.charsBilled,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
