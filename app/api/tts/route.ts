import { NextResponse } from 'next/server';
import { aiRateLimit } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { errors, readJsonBody } from '@/lib/errors';
import { requireEnvVar } from '@/lib/env';
import { validateTtsText } from '@/lib/validation';
import { logger } from '@/lib/logger';

const ROUTE = '/api/tts';

/**
 * `/api/tts` (M6.1) — sintesis suara ElevenLabs, STREAMING.
 *
 * Perubahan M6.1:
 *  - Body audio DIALIRKAN apa adanya (chunk demi chunk dari ElevenLabs)
 *    alih-alih dibuffer utuh — client mulai menerima byte sebelum sintesis
 *    selesai.
 *  - `ELEVENLABS_VOICE_ID` kini WAJIB via `requireEnvVar` (env ter-cache di
 *    modul `lib/env`) — voice-ID hardcode lama dihapus. Kalau env belum
 *    diisi, route gagal dengan pesan konfigurasi, bukan memakai suara asing.
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
          model_id: 'eleven_multilingual_v2', // Model multilingual untuk Indonesia
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      // M0/H0.6: detail provider hanya ke log, bukan ke client.
      const errorText = await upstream.text();
      logger.error('ElevenLabs API error', {
        route: ROUTE,
        userId,
        status: upstream.status,
        detail: errorText.slice(0, 500),
      });
      throw errors.upstream('Layanan suara sedang tidak tersedia. Coba lagi sebentar.');
    }

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
);
