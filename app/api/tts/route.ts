import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) {
      return new NextResponse('Text is required', { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    // Force override Voice ID to "Bella" (Premade Voice) because .env changes require a server restart to take effect
    const voiceId = process.env.ELEVENLABS_VOICE_ID === 'WQ4h6sgS9p2XXvLsESBT' ? 'EXAVITQu4vr4xnSDxMaL' : (process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL');

    if (!apiKey) {
      return new NextResponse('ElevenLabs configuration missing', { status: 500 });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
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
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return new NextResponse('Error from TTS provider', { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, max-age=0',
      }
    });

  } catch (error) {
    console.error('TTS API Route Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
