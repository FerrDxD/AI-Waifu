import { NextResponse } from 'next/server';
import { aiRateLimit } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { errors, readJsonBody } from '@/lib/errors';
import { requireEnvVar } from '@/lib/env';
import { validateTtsText } from '@/lib/validation';
import { detectMood, voiceSettingsForMood } from '@/lib/tts/persona';
import { logger } from '@/lib/logger';
import {
  getTtsCache,
  getTtsDailyCharsBilled,
  putTtsCache,
  recordTtsUsage,
  ttsCacheKey,
  ttsMaxCharsPerDay,
} from '@/lib/tts/cache';

const ROUTE = '/api/tts';
const MODEL_ID = 'eleven_multilingual_v2'; // Model multilingual untuk Indonesia

/**
 * `/api/tts` (M6.1 + M6.4) — sintesis suara ElevenLabs dengan CACHE.
 *
 * M6.1: `ELEVENLABS_VOICE_ID` wajib via `requireEnvVar` (hardcode terhapus),
 * body audio dialirkan dari ElevenLabs.
 *
 * M6.4:
 *  - **Cache** keyed `sha256(voiceId|modelId|text)` di Postgres (`ttsCache`).
 *    Hit = audio lama, nol biaya ElevenLabs, latency lebih rendah.
 *  - **Buffer penuh** di miss (perubahan dari streaming M6.1) — audio harus
 *    utuh dulu untuk disimpan ke cache. Tradeoff didokumentasikan: satu
 *    kalimat pendek disintesis ~1–2 detik, dan pipeline call prefetch kalimat
 *    N+1 saat N diputar, jadi tambahan latency tersembunyi; hit justru lebih
 *    cepat dari sintesis.
 *  - **Cap biaya harian**: karakter ter-billing per user dibatasi
 *    `TTS_MAX_CHARS_PER_DAY` (env, default 30rb) — di atas cap → 429.
 *    Rate limiter request (5/menit, 200/hari, 2000/bulan) tetap jalan.
 *  - **Pencatatan biaya**: `ttsUsage` per user per hari (requests,
 *    cacheHits, charsBilled) — dasar metrik "biaya TTS per DAU".
 *
 * M6.5: `voice_settings` ElevenLabs kini DINAMIS per mood — mood dideteksi
 * dari teks kalimat (`detectMood`, pure, `lib/tts/persona.ts`) karena
 * `expression` turn-level baru dikirim di event `done` stream (terlambat
 * untuk TTS per-kalimat). Mood masuk key cache; header `X-Tts-Mood` untuk
 * observability (client pipeline memakai modul persona yang sama untuk
 * `playbackRate`).
 */
export const POST = apiHandler(
  {
    route: ROUTE,
    rateLimit: aiRateLimit,
    rateLimitKey: ({ userId }) => `tts_${userId}`,
    rateLimitMessage: 'Terlalu banyak request, tunggu sebentar.',
  },
  async ({ userId, req }) => {
    const body = await readJsonBody<{ text?: unknown }>(req);
    // M0/H0.5: teks TTS dibatasi 300 karakter (biaya ElevenLabs per karakter).
    const safeText = validateTtsText(body.text);

    // M6.5: deteksi mood dari teks → voice_settings dinamis (happy=energik,
    // scared=cepat). Mood deterministik dari teks, jadi aman masuk key cache.
    const mood = detectMood(safeText);

    let apiKey: string;
    let voiceId: string;
    try {
      apiKey = requireEnvVar('ELEVENLABS_API_KEY');
      voiceId = requireEnvVar('ELEVENLABS_VOICE_ID');
    } catch (error) {
      logger.error('TTS config belum lengkap', {
        route: ROUTE,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw errors.internal('Konfigurasi TTS belum lengkap.');
    }

    const key = ttsCacheKey(safeText, voiceId, MODEL_ID, mood);

    // M6.4: cap biaya harian per user (karakter yang di-billing).
    const charsSoFar = await getTtsDailyCharsBilled(userId);
    if (charsSoFar >= ttsMaxCharsPerDay()) {
      logger.warn('TTS cap harian karakter terlampaui', {
        route: ROUTE,
        userId,
        charsSoFar,
        cap: ttsMaxCharsPerDay(),
      });
      throw errors.tooManyRequests(
        'Kuota suara hari ini sudah habis. Coba lagi besok.'
      );
    }

    // M6.4: cache dulu — kalimat berulang tidak boleh di-billing ulang.
    const cached = await getTtsCache(key);
    if (cached) {
      await recordTtsUsage(userId, { cacheHit: true, charsBilled: 0 });
      return new NextResponse(cached.audio, {
        headers: {
          'Content-Type': cached.mimeType,
          'Cache-Control': 'no-store, max-age=0',
          'X-Tts-Cache': 'hit',
          'X-Tts-Mood': mood,
        },
      });
    }

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: safeText,
          model_id: MODEL_ID,
          // M6.5: voice_settings dinamis per mood (happy=energik, scared=cepat).
          voice_settings: voiceSettingsForMood(mood),
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      // M0/H0.6: detail provider hanya ke log, bukan ke client.
      // (Gagal upstream tidak dicatat ke ttsUsage — tidak ada yang di-billing.)
      const errorText = await upstream.text();
      logger.error('ElevenLabs API error', {
        route: ROUTE,
        userId,
        status: upstream.status,
        detail: errorText.slice(0, 500),
      });
      throw errors.upstream('Layanan suara sedang tidak tersedia. Coba lagi sebentar.');
    }

    // M6.4: buffer penuh — audio harus utuh untuk disimpan ke cache.
    const audio = new Uint8Array(await upstream.arrayBuffer());

    // Best effort: kegagalan cache/usage tidak menggagalkan pemutaran.
    await putTtsCache(key, audio, 'audio/mpeg');
    await recordTtsUsage(userId, { cacheHit: false, charsBilled: safeText.length });

    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, max-age=0',
        'X-Tts-Cache': 'miss',
        'X-Tts-Mood': mood,
      },
    });
  }
);
