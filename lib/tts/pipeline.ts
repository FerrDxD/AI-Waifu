'use client';

import { splitSentences } from './sentences';
import { detectMood, playbackRateForMood } from './persona';

/**
 * Pipeline TTS client (M6.1).
 *
 * Alur "suara mengalir saat teks masih dirender":
 *  1. Caller (CallClient) mem-pipe kalimat satu per satu lewat `enqueue()`
 *     seiring stream balasan LLM — tanpa menunggu seluruh teks selesai.
 *  2. Kalimat yang di-fetch JARANG kehabisan: saat kalimat ke-N baru saja
 *     tiba, fetch ke-N+1 langsung jalan; saat ke-N diputar, ke-N+1 sudah
 *     (hampir) siap. Latensi first-audio ≈ waktu sintesis SATU kalimat.
 *  3. `stop()` = barge-in: matikan yang sedang diputar + buang antrean.
 *
 * Catatan desain:
 *  - Per-kalimat memakai `HTMLAudioElement` + blob (bukan MediaSource):
 *    compatible semua browser (MSE mp3 bermasalah di beberapa iOS Safari)
 *    dan berhenti instan untuk barge-in.
 *  - Pipeline bersifat SATU kali pakai (per giliran percakapan). `stop()`
 *    mengakhiri; buat instance baru untuk giliran berikutnya.
 *  - Gagal TTS (429/5xx/jaringan) = kalimat dilewati, giliran tidak crash.
 *  - M6.5: `playbackRate` per mood — mood dihitung dari teks kalimat via
 *    `detectMood` (modul pure yang SAMA dengan route server, jadi rate
 *    client selalu cocok dengan `voice_settings` yang disintesis).
 *    `preservesPitch = true` → hanya tempo berubah, bukan nada.
 */

export type TtsPlaybackState = 'idle' | 'speaking';

export type TtsPipelineOptions = {
  /** Notifikasi perubahan state (untuk status call / indikator UI). */
  onStateChange?: (state: TtsPlaybackState) => void;
  /** Volume per playback (bisa berubah antar kalimat — toggle speaker). */
  getVolume?: () => number;
  /** Override untuk unit test (default: POST /api/tts). */
  fetchTts?: (text: string) => Promise<Blob | null>;
};

async function defaultFetchTts(text: string): Promise<Blob | null> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export class TtsPipeline {
  private queue: string[] = [];
  private prefetch: Promise<{ text: string; audio: Blob | null } | null> | null = null;
  private running = false;
  private stopped = false;
  private current: HTMLAudioElement | null = null;
  private currentFinish: (() => void) | null = null;
  private state: TtsPlaybackState = 'idle';

  constructor(private readonly options: TtsPipelineOptions = {}) {}

  get isSpeaking(): boolean {
    return this.state === 'speaking';
  }

  /** Tambah SATU kalimat (dipanggil berulang saat teks masih mengalir). */
  enqueue(sentence: string): void {
    const clean = sentence.trim();
    if (!clean || this.stopped) return;
    this.queue.push(clean);
    void this.run();
  }

  /** Tambah teks mentah (kasus non-streaming) — dipecah jadi kalimat dulu. */
  speakText(text: string): void {
    for (const sentence of splitSentences(text)) this.enqueue(sentence);
  }

  /** Barge-in: hentikan yang sedang diputar + buang seluruh antrean. */
  stop(): void {
    this.stopped = true;
    this.queue = [];
    this.prefetch = null;
    const finish = this.currentFinish;
    this.current = null;
    this.currentFinish = null;
    finish?.(); // me-release promise play() yang sedang ditunggu di run()
    this.setState('idle');
  }

  private setState(state: TtsPlaybackState): void {
    if (state === this.state) return;
    this.state = state;
    this.options.onStateChange?.(state);
  }

  /** Pastikan satu fetch TTS sedang berjalan untuk kalimat terdepan. */
  private ensurePrefetch(fetchTts: (text: string) => Promise<Blob | null>): void {
    if (this.prefetch || this.stopped) return;
    const next = this.queue.shift();
    if (!next) return;
    // Text ikut dibawakan supaya play() bisa menghitung mood (M6.5).
    this.prefetch = fetchTts(next)
      .catch(() => null)
      .then((audio) => ({ text: next, audio }));
  }

  private async run(): Promise<void> {
    if (this.running || this.stopped) return;
    this.running = true;
    const fetchTts = this.options.fetchTts ?? defaultFetchTts;

    try {
      while (!this.stopped) {
        if (!this.prefetch) {
          if (this.queue.length === 0) break;
          this.ensurePrefetch(fetchTts);
        }
        const pending = await this.prefetch!;
        this.prefetch = null;
        // Prefetch kalimat berikutnya SEKARANG — overlap dengan playback.
        this.ensurePrefetch(fetchTts);
        if (this.stopped || !pending || !pending.audio) continue;
        await this.play(pending.audio, pending.text);
      }
    } finally {
      this.running = false;
      if (!this.stopped) {
        this.setState('idle');
        // Enqueue bisa masuk persis saat drain berakhir (race microtask) —
        // kalau antrean masih ada, lanjutkan giliran lagi.
        if (this.queue.length > 0) void this.run();
      }
    }
  }

  private play(blob: Blob, text: string): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      const vol = this.options.getVolume ? this.options.getVolume() : 0.8;
      audio.volume = Math.min(1, Math.max(0, vol));
      // M6.5: tempo per mood (scared cepat, sad lambat) — pitch dipertahankan.
      audio.playbackRate = playbackRateForMood(detectMood(text));
      audio.preservesPitch = true;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        audio.pause();
        try {
          URL.revokeObjectURL(url);
        } catch {
          // object URL sudah tidak penting — abaikan.
        }
        if (this.current === audio) this.current = null;
        if (this.currentFinish === finish) this.currentFinish = null;
        resolve();
      };

      this.current = audio;
      this.currentFinish = finish;
      this.setState('speaking');
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  }
}
