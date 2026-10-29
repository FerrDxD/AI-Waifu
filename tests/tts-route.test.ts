import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock `@/lib/auth` terdaftar GLOBAL di tests/setup.ts (M6.1) — vi.mock
// per file dengan isolate: false membuat instance terpisah per file dan
// flake bergantung urutan (lihat komentar di setup.ts).
import { setMockAuth, resetMockAuth } from '@/tests/setup';
import { __resetEnvCacheForTests } from '@/lib/env';
import { detectMood, MOOD_VOICE_SETTINGS } from '@/lib/tts/persona';
import { POST } from '@/app/api/tts/route';

// M6.4: modul cache di-mock per file (SATU-SATUNYA konsumen selain test
// ini — aman dengan isolate: false). Fake in-memory meniru perilaku yang
// diamati route: key → audio, dan pencatatan usage per user.
const cacheState = vi.hoisted(() => ({
  cache: new Map<string, { audio: string; mimeType: string }>(),
  usage: new Map<string, { requests: number; cacheHits: number; charsBilled: number }>(),
  dailyChars: 0,
}));

// M8.2 Phase B: gate `voiceCall` di route membaca karakter aktif dari DB.
// Suite tidak punya database — modul switch di-mock supaya gate lolos
// (perilaku gate sendiri diuji di tests/characters-features.test.ts).
vi.mock('@/lib/characters/switch', async () => {
  const { getCharacter } = await import('@/lib/characters/registry');
  return {
    getActiveCharacter: vi.fn(async () => getCharacter('livia')),
    getCharacterChoice: vi.fn(),
    switchActiveCharacter: vi.fn(),
  };
});

vi.mock('@/lib/tts/cache', () => ({
  TTS_CACHE_MAX_ROWS: 1000,
  DEFAULT_TTS_MAX_CHARS_PER_DAY: 30_000,
  ttsMaxCharsPerDay: () => {
    const raw = process.env.TTS_MAX_CHARS_PER_DAY;
    const n = raw ? Number.parseInt(raw, 10) : 30_000;
    return Number.isFinite(n) && n > 0 ? n : 30_000;
  },
  ttsCacheKey: (text: string, voiceId: string, modelId: string, mood: string = 'neutral') =>
    `key:${voiceId}|${modelId}|${mood}|${text}`,
  dayBucketNow: () => new Date('2026-01-01T00:00:00Z'),
  getTtsCache: vi.fn(async (key: string) => {
    const hit = cacheState.cache.get(key);
    return hit ? { audio: new TextEncoder().encode(hit.audio), mimeType: hit.mimeType } : null;
  }),
  putTtsCache: vi.fn(
    async (key: string, audio: Uint8Array, mimeType: string) => {
      cacheState.cache.set(key, { audio: new TextDecoder().decode(audio), mimeType });
    }
  ),
  getTtsDailyCharsBilled: vi.fn(async () => cacheState.dailyChars),
  recordTtsUsage: vi.fn(async (userId: string, o: { cacheHit: boolean; charsBilled: number }) => {
    const u = cacheState.usage.get(userId) ?? { requests: 0, cacheHits: 0, charsBilled: 0 };
    u.requests += 1;
    u.cacheHits += o.cacheHit ? 1 : 0;
    u.charsBilled += o.charsBilled;
    cacheState.usage.set(userId, u);
  }),
}));

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

/** Key yang dipakai route untuk teks tertentu (model + voice dari env test). */
const routeKey = (text: string) =>
  `key:voice-test-123|eleven_multilingual_v2|${detectMood(text)}|${text}`;

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED);
  // Store rate-limit mock global per worker — reset supaya limit 5/menit
  // tidak kehabisan antar test dalam file ini (user sama).
  (globalThis as { __mockRateLimitStore?: { reset: () => void } }).__mockRateLimitStore
    ?.reset();
  // State cache fake: kosongkan per test.
  cacheState.cache.clear();
  cacheState.usage.clear();
  cacheState.dailyChars = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  resetMockAuth();
  setMockAuth({ user: { id: 'user-tts' } });
  setTtsEnv('el-test-key', 'voice-test-123');
  delete process.env.TTS_MAX_CHARS_PER_DAY;
});

afterEach(() => {
  process.env = snapshot;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setTtsEnv();
  __resetEnvCacheForTests();
});

describe('POST /api/tts (M6.1 + M6.4)', () => {
  it('miss: audio utuh dikembalikan (buffer untuk cache) + tersimpan + usage tercatat', async () => {
    const fetchMock = vi.fn(async () => new Response(streamBody('AUDIO-BYTES'), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(ttsRequest('Halo!'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(res.headers.get('X-Tts-Cache')).toBe('miss');
    const text = await new Response(res.body).text();
    expect(text).toBe('AUDIO-BYTES');

    // M6.4: tersimpan ke cache dengan key sha256(voice|model|text).
    expect(cacheState.cache.has(routeKey('Halo!'))).toBe(true);
    // M6.4: usage — miss, charsBilled = panjang teks.
    expect(cacheState.usage.get('user-tts')).toEqual({
      requests: 1,
      cacheHits: 0,
      charsBilled: 5,
    });
  });

  it('hit: tidak memanggil ElevenLabs, audio lama dikembalikan, hit tercatat', async () => {
    const fetchMock = vi.fn(async () => new Response(streamBody('AUDIO-BYTES'), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await call(ttsRequest('Halo!')); // miss
    expect(first.headers.get('X-Tts-Cache')).toBe('miss');

    const second = await call(ttsRequest('Halo!')); // hit
    expect(second.headers.get('X-Tts-Cache')).toBe('hit');
    expect(await new Response(second.body).text()).toBe('AUDIO-BYTES');

    // ElevenLabs hanya dipanggil SATU kali (miss pertama).
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Usage: 2 request, 1 hit, charsBilled hanya dari miss.
    expect(cacheState.usage.get('user-tts')).toEqual({
      requests: 2,
      cacheHits: 1,
      charsBilled: 5,
    });
  });

  it('teks berbeda = key cache berbeda (tidak cross-contaminate)', async () => {
    const fetchMock = vi.fn(async () => new Response(streamBody('X'), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await call(ttsRequest('Halo!'));
    await call(ttsRequest('Apa kabar?'));

    expect(fetchMock).toHaveBeenCalledTimes(2); // keduanya miss
    expect(cacheState.cache.size).toBe(2);
  });

  it('cap harian karakter terlampaui → 429, tanpa memanggil ElevenLabs & tanpa cek cache', async () => {
    cacheState.dailyChars = 30_000; // >= default cap
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(ttsRequest('Halo!'));

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(body.error).toContain('Kuota suara');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cacheState.usage.size).toBe(0); // tidak ada yang dicatat
  });

  it('cap env TTS_MAX_CHARS_PER_DAY diturunkan → 429 lebih awal', async () => {
    process.env.TTS_MAX_CHARS_PER_DAY = '10';
    cacheState.dailyChars = 10;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(ttsRequest('Halo!'));

    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('upstream 500 → 503 ramah, detail tidak bocor, TIDAK dicatat/di-cache', async () => {
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
    expect(JSON.stringify(body)).not.toContain('el-supersecret');

    // M6.4: gagal upstream = tidak ada biaya → tidak boleh masuk cache
    // dan tidak boleh menambah charsBilled.
    expect(cacheState.cache.size).toBe(0);
    expect(cacheState.usage.size).toBe(0);
  });

  it('teks >300 karakter → 400 (batas biaya), tidak memanggil ElevenLabs', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(ttsRequest('a'.repeat(301)));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mood happy → voice_settings energik ke ElevenLabs + header X-Tts-Mood', async () => {
    const fetchMock = vi.fn(async () => new Response(streamBody('x'), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const text = 'Yeyy, hore! Aku senang banget!';

    const res = await call(ttsRequest(text));

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Tts-Mood')).toBe('happy');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.voice_settings).toEqual(MOOD_VOICE_SETTINGS.happy);
  });

  it('teks netral → voice_settings baseline lama (regresi M6.1) + X-Tts-Mood: neutral', async () => {
    const fetchMock = vi.fn(async () => new Response(streamBody('x'), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const text = 'Halo, apa kabar hari ini?';
    expect(detectMood(text)).toBe('neutral'); // guard: kasus memang netral

    const res = await call(ttsRequest(text));

    expect(res.headers.get('X-Tts-Mood')).toBe('neutral');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.voice_settings).toEqual(MOOD_VOICE_SETTINGS.neutral);
  });

  it('dua kalimat beda mood → dua entry cache, settings masing-masing', async () => {
    const fetchMock = vi.fn(async () => new Response(streamBody('x'), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await call(ttsRequest('Yeyy, hore! Aku senang banget!'));
    await call(ttsRequest('Aduh seram, aku takut sekali!'));

    expect(fetchMock).toHaveBeenCalledTimes(2); // keduanya miss
    expect(cacheState.cache.size).toBe(2); // key berbeda (mood beda)

    const settings = fetchMock.mock.calls.map(
      (c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string).voice_settings
    );
    expect(settings[0]).toEqual(MOOD_VOICE_SETTINGS.happy);
    expect(settings[1]).toEqual(MOOD_VOICE_SETTINGS.scared);
  });
});
