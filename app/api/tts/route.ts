import { NextResponse } from 'next/server';
import { aiRateLimit } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { errors, readJsonBody } from '@/lib/errors';
import { validateTtsText } from '@/lib/validation';
import { logger } from '@/lib/logger';

const ROUTE = '/api/tts';

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

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

    if (!apiKey) {
      logger.error('ELEVENLABS_API_KEY missing', { route: ROUTE, userId });
      throw errors.internal('Konfigurasi TTS belum lengkap.');
    }

    const response = await fetch(
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

    if (!response.ok) {
      // M0/H0.6: detail provider hanya ke log, bukan ke client.
      const errorText = await response.text();
      logger.error('ElevenLabs API error', {
        route: ROUTE,
        userId,
        status: response.status,
        detail: errorText.slice(0, 500),
      });
      throw errors.upstream('Layanan suara sedang tidak tersedia. Coba lagi sebentar.');
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
);
