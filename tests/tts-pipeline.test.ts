import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TtsPipeline } from '@/lib/tts/pipeline';

type MockAudioRegistry = {
  instances: Array<{
    src: string;
    volume: number;
    paused: boolean;
    emitEnded: () => void;
  }>;
  reset: () => void;
};

const mockAudio = () => (globalThis as Record<string, unknown>).__mockAudio as MockAudioRegistry;

const flush = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('TtsPipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAudio().reset();
  });

  it('memutar kalimat sekuensial sesuai urutan, dengan prefetch overlap', async () => {
    const fetches: string[] = [];
    let resolveFirst: (v: Blob) => void = () => {};
    let n = 0;
    const p = new TtsPipeline({
      fetchTts: async (text) => {
        fetches.push(text);
        n++;
        if (n === 1) {
          // Tahan fetch kalimat pertama supaya prefetch bisa diamati.
          return new Promise<Blob>((r) => {
            resolveFirst = r;
          });
        }
        return new Blob(['x']);
      },
    });

    p.enqueue('A');
    p.enqueue('B');
    p.enqueue('C');
    await flush(10);
    expect(fetches).toEqual(['A']); // hanya satu fetch in-flight

    resolveFirst(new Blob(['a']));
    await flush(10);
    // Saat A tiba, fetch B langsung jalan (overlap dengan playback A).
    expect(fetches).toEqual(['A', 'B']);
    const audios = mockAudio().instances;
    expect(audios.length).toBe(1); // yang diputar baru A

    audios[0].emitEnded();
    await flush(10);
    expect(fetches).toEqual(['A', 'B', 'C']);
    expect(audios.length).toBe(2);

    audios[1].emitEnded();
    await flush(10);
    expect(audios.length).toBe(3);

    audios[2].emitEnded();
    await flush(20);
    expect(p.isSpeaking).toBe(false);
  });

  it('stop() menghentikan playback + membuang antrean (barge-in)', async () => {
    const fetches: string[] = [];
    const states: string[] = [];
    const p = new TtsPipeline({
      fetchTts: async (text) => {
        fetches.push(text);
        return new Blob(['x']);
      },
      onStateChange: (s) => states.push(s),
    });

    p.enqueue('A');
    p.enqueue('B');
    p.enqueue('C');
    await flush(10);
    expect(fetches).toEqual(['A', 'B']);
    const audios = mockAudio().instances;
    expect(audios.length).toBe(1);
    expect(p.isSpeaking).toBe(true);

    p.stop();

    expect(p.isSpeaking).toBe(false);
    expect(audios[0].paused).toBe(true);
    await flush(20);
    expect(fetches).toEqual(['A', 'B']); // C tidak pernah di-fetch
    expect(audios.length).toBe(1); // tidak ada playback lanjutan
    expect(states).toEqual(['speaking', 'idle']);
  });

  it('kalimat TTS gagal dilewati — giliran tidak crash', async () => {
    const states: string[] = [];
    const p = new TtsPipeline({
      fetchTts: async (text) => (text === 'B' ? null : new Blob(['x'])),
      onStateChange: (s) => states.push(s),
    });

    p.enqueue('A');
    p.enqueue('B');
    p.enqueue('C');
    await flush(20);
    // A diputar (B sudah di-fetch dan gagal → null). Akhiri A supaya C berlanjut.
    const audios = mockAudio().instances;
    expect(audios.length).toBe(1);
    audios[0].emitEnded();
    await flush(20);
    // B dilewati (TTS gagal), C diputar.
    expect(audios.length).toBe(2);
    audios[1].emitEnded();
    await flush(20);
    expect(p.isSpeaking).toBe(false);
    expect(states[states.length - 1]).toBe('idle');
  });

  it('speakText() memecah teks mentah jadi kalimat', async () => {
    const fetches: string[] = [];
    const p = new TtsPipeline({
      fetchTts: async (t) => {
        fetches.push(t);
        return new Blob(['x']);
      },
    });

    p.speakText('Halo. Apa kabar?');
    await flush(40);
    expect(fetches).toEqual(['Halo.', 'Apa kabar?']);
  });

  it('volume mengikuti getVolume() per playback (toggle speaker)', async () => {
    let vol = 1;
    const p = new TtsPipeline({
      fetchTts: async () => new Blob(['x']),
      getVolume: () => vol,
    });

    p.enqueue('A');
    await flush(10);
    const audios = mockAudio().instances;
    expect(audios[0].volume).toBe(1);

    vol = 0.25; // user toggle speaker di tengah bicara
    audios[0].emitEnded();
    p.enqueue('B');
    await flush(10);
    expect(audios[1].volume).toBe(0.25);
  });

  it('enqueue setelah pipeline kosong & selesai masih dimainkan', async () => {
    const fetches: string[] = [];
    const p = new TtsPipeline({
      fetchTts: async (t) => {
        fetches.push(t);
        return new Blob(['x']);
      },
    });

    p.enqueue('A');
    await flush(10);
    mockAudio().instances[0].emitEnded();
    await flush(20);
    expect(p.isSpeaking).toBe(false);

    p.enqueue('B');
    await flush(10);
    expect(fetches).toEqual(['A', 'B']);
    expect(mockAudio().instances.length).toBe(2);
  });
});
