import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock `@/lib/auth` terdaftar GLOBAL di tests/setup.ts (M6.1) — vi.mock
// per file dengan isolate: false membuat instance terpisah per file dan
// flake bergantung urutan (lihat komentar di setup.ts).
import { setMockAuth, resetMockAuth } from '@/tests/setup';
import { __resetEnvCacheForTests } from '@/lib/env';
import { POST } from '@/app/api/tts/route';

const call = (request: Request) =>
  (POST as unknown as (r: Request, c: { params: Record<string, string> }) => Promise<Response>)(
    request,
    { params: {} }
  );

const ttsRequest = (text: string) =>
  new Request('http://localhost/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

const setTtsEnv = (apiKey?: string, voiceId?: string) => {
  if (apiKey === undefined) delete process.env.ELEVENLABS_API_KEY;
  else process.env.ELEVENLABS_API_KEY = apiKey;
  if (voiceId === undefined) delete process.env.ELEVENLABS_VOICE_ID;
  else process.env.ELEVENLABS_VOICE_ID = voiceId;
  __resetEnvCacheForTests();
};

/** Variabel wajib lain yang divalidasi `requireEnv` (pola tests/env.test.ts). */
const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

/** ReadableStream kecil berisi `payload` — stand-in audio ElevenLabs. */
const streamBody = (payload: string): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
      controller.close();
    },
  });

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED);
  // Store rate-limit mock global per worker — reset supaya limit 5/menit
  // tidak kehabisan antar test dalam file ini (user sama).
  (globalThis as { __mockRateLimitStore?: { reset: () => void } }).__mockRateLimitStore
    ?.reset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  resetMockAuth();
  setMockAuth({ user: { id: 'user-tts' } });
  setTtsEnv('el-test-key', 'voice-test-123');
});

afterEach(() => {
  process.env = snapshot;
  vi.restoreAllMocks();
  setTtsEnv();
  __resetEnvCacheForTests();
});

describe('POST /api/tts (M6.1)', () => {
  it('mengalirkan audio upstream apa adanya (streaming, bukan buffer utuh)', async () => {
    const fetchMock = vi.fn(async () => new Response(streamBody('AUDIO-BYTES'), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(ttsRequest('Halo!'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Cache-Control')).toBe('no-store, max-age=0');

    // Body harus stream yang bisa dibaca (byte-nya utuh dari upstream).
    expect(res.body).toBeInstanceOf(ReadableStream);
    const text = await new Response(res.body).text();
    expect(text).toBe('AUDIO-BYTES');
  });

  it('memakai voice-ID dari env (hardcode lama sudah dihapus)', async () => {
    const fetchMock = vi.fn(async () => new Response(streamBody('x'), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await call(ttsRequest('Halo!'));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('api.elevenlabs.io/v1/text-to-speech/voice-test-123');
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe('el-test-key');
    // Tidak ada voice-ID fallback lama.
    expect(url).not.toContain('EXAVITQu4vr4xnSDxMaL');
  });

  it('env API key hilang → 500 konfigurasi, tidak memanggil ElevenLabs', async () => {
    setTtsEnv(undefined, 'voice-test-123');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(ttsRequest('Halo!'));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.error).not.toContain('ELEVENLABS');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('env voice-ID hilang → 500 konfigurasi, tidak memanggil ElevenLabs', async () => {
    setTtsEnv('el-test-key', undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(ttsRequest('Halo!'));

    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('upstream 500 → 503 ramah, detail provider tidak bocor ke client', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: 'secret-key-leak: el-supersecret' }), {
          status: 500,
        })
      )
    );

    const res = await call(ttsRequest('Halo!'));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(body.error).toBe('Layanan suara sedang tidak tersedia. Coba lagi sebentar.');

    const text = JSON.stringify(body);
    expect(text).not.toContain('el-supersecret');
  });

  it('teks >300 karakter → 400 (batas biaya), tidak memanggil ElevenLabs', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(ttsRequest('a'.repeat(301)));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
