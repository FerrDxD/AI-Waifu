import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiRateLimit } from '@/lib/rate-limit';
import { apiErrorResponse, errors, readJsonBody } from '@/lib/errors';
import { validateTtsText } from '@/lib/validation';
import { logger } from '@/lib/logger';

const ROUTE = '/api/tts';

export async function POST(req: Request) {
  let userId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) throw errors.unauthorized();
    userId = session.user.id;

    const rate = await aiRateLimit.limit(`tts_${userId}`);
    if (!rate.success) {
      throw errors.tooManyRequests('Terlalu banyak request, tunggu sebentar.');
    }

    const body = await readJsonBody<{ text?: unknown }>(req);
    // M0/H0.5: teks TTS dibatasi 300 karakter (biaya ElevenLabs per karakter).
    const safeText = validateTtsText(body.text);

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

    if (!apiKey) {
      logger.error('ELEVENLABS_API_KEY missing', { route: ROUTE });
      throw errors.internal('Konfigurasi TTS belum lengkap.');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: safeText,
        model_id: 'eleven_multilingual_v2', // Multilingual model for Indonesian
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      // M0/H0.6: detail provider hanya ke log, bukan ke client.
      const errorText = await response.text();
      logger.error('ElevenLabs API error', {
        route: ROUTE,
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
      }
    });

  } catch (error) {
    return apiErrorResponse(error, { route: ROUTE, userId });
  }
}
