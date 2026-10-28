'use client';

import type { TtsPipeline, TtsPlaybackState } from '@/lib/tts/pipeline';
import { takeCompleteSentences } from '@/lib/tts/sentences';

/**
 * Sesi voice call (M6.2) — barge-in & turn cue.
 *
 * Sesi ini memegang:
 *  - **Continuous listening**: recognition jalan sepanjang call aktif
 *    (auto-restart setelah tiap `onend` — browser berhenti sendiri saat
 *    hening). Tombol mic kini MUTE, bukan PTT.
 *  - **Barge-in**: saat suara user TEREDETEKSI (interim result pertama),
 *    Livia jeda seketika — pipeline TTS distop, dan kalau LLM masih
 *    generating, giliran di-abort (delta berikutnya dibuang).
 *    Catatan desain: `onstart` TIDAK dipakai sebagai pemicu — di mode
 *    continuous ia fire di tiap auto-restart walau tanpa suara.
 *  - **Turn cue**: `recomputeStatus()` satu sumber kebenaran:
 *    `error` (sticky) > `speaking` > `thinking` > `listening` (mic on) >
 *    `idle`.
 *  - **Giliran**: fetch SSE `/api/chat/stream` + pipeline TTS per giliran
 *    (M6.1). Sisa buffer di-flush saat `done`.
 *
 * Batasan yang dikenal (utang): mic bisa menangkap suara Livia sendiri
 * (feedback loop) — dimitigasi speaker toggle (0.25x); VAD/echo-cancel
 * proper di ranah M6.3/native.
 *
 * Kelas ini diuji tanpa React (tests/call-session.test.ts) — recognition,
 * pipeline, dan fetch semuanya di-inject/stub.
 */

export type CallStatus =
  | 'connecting'
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

/** Bentuk event `onresult` Web Speech API (subset yang dipakai). */
export type RecognitionResultEvent = {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  resultIndex: number;
};

/** Recognition Web Speech API (subset) — memudahkan injeksi fake di test. */
export type RecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
};

export type PipelineHooks = {
  onState: (state: TtsPlaybackState) => void;
  getVolume: () => number;
};

export type StreamDoneInfo = {
  expression?: string;
  crisis?: { message?: string; escalate?: boolean };
};

export type CallSessionEvents = {
  onStatus: (status: CallStatus, detail?: string) => void;
  onTranscript: (text: string) => void;
  /** true = ada interim result aktif (user sedang bicara). */
  onHearing: (activelyHearing: boolean) => void;
  onExpression: (expression: string) => void;
};

export type CallSessionOptions = {
  /** Recognition Web Speech API browser, atau null bila tidak didukung. */
  createRecognition: () => RecognitionLike | null;
  /** Buat pipeline TTS untuk satu giliran (di-inject oleh komponen). */
  createPipeline: (hooks: PipelineHooks) => TtsPipeline;
  /** Volume per playback (toggle speaker / preferensi tersimpan). */
  getVolume: () => number;
  events: CallSessionEvents;
  /** Jeda sebelum auto-restart recognition (default 100ms; 0 di test). */
  restartDelayMs?: number;
};

/** State satu giliran percakapan (pesan user → stream → TTS). */
type Turn = {
  aborted: boolean;
  receivedAny: boolean;
  /** Teks balasan yang belum diucapkan (kalimat tidak lengkap). */
  unspoken: string;
};

export class CallSession {
  private recognition: RecognitionLike | null = null;
  private micBroken = false;
  private active = false;
  private muted = false;
  private status: CallStatus = 'connecting';
  private pipeline: TtsPipeline | null = null;
  private turn: Turn | null = null;
  private utterance = '';
  private hearing = false;
  private restartScheduled = false;

  constructor(private readonly opts: CallSessionOptions) {}

  get isMuted(): boolean {
    return this.muted;
  }

  get isSpeaking(): boolean {
    return this.pipeline?.isSpeaking ?? false;
  }

  get isHearing(): boolean {
    return this.hearing;
  }

  get statusValue(): CallStatus {
    return this.status;
  }

  /** Call siap (profil ter-load) → mulai continuous listening. */
  connect(): void {
    if (this.active) return;
    this.active = true;
    this.recognition = this.opts.createRecognition();
    if (!this.recognition) {
      this.setStatus('error', 'Browser tidak mendukung fitur suara.');
      return;
    }
    this.wireRecognition();
    this.startRecognition();
    this.recomputeStatus();
  }

  /** Mute/unmute mic (M6.2: tombol mic bukan lagi PTT). */
  setMuted(muted: boolean): void {
    if (!this.active || this.muted === muted) return;
    this.muted = muted;
    if (muted) {
      this.utterance = '';
      this.setHearing(false);
      this.opts.events.onTranscript('');
      this.recognition?.stop(); // onend fire; loop tak restart (muted)
    } else {
      this.startRecognition();
    }
    this.recomputeStatus();
  }

  /** Putuskan segalanya (tutup call / unmount). */
  dispose(): void {
    this.active = false;
    this.pipeline?.stop();
    this.pipeline = null;
    this.turn = null;
    this.recognition?.abort();
    this.recognition = null;
  }

  // ------------------------------------------------------------- mic

  private wireRecognition(): void {
    const rec = this.recognition;
    if (!rec) return;

    // onstart = engine siap — BUKAN berarti ada suara. Sengaja tidak
    // dipakai untuk barge-in (lihat dokumentasi kelas).

    rec.onresult = (event: RecognitionResultEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r?.[0]?.transcript ?? '';
        if (r?.isFinal) finalText += t;
        else interimText += t;
      }
      // Rebuild utuh per sesi: interim terus update, mengakumulasi per
      // event akan mendouble hitung.
      this.utterance = (finalText + interimText).trim();
      this.opts.events.onTranscript(this.utterance);

      const hearingNow = interimText.trim().length > 0;
      if (hearingNow && !this.hearing) {
        // Suara TEREDETEKSI → barge-in (M6.2).
        this.setHearing(true);
        this.bargeIn();
      } else if (!hearingNow && this.hearing) {
        this.setHearing(false);
      }
      this.recomputeStatus();
    };

    rec.onend = () => {
      const message = this.utterance.trim();
      this.utterance = '';
      this.setHearing(false);
      if (message && this.active && !this.muted) {
        // Tampilan transcript dipertahankan: user membacanya selama
        // Livia berpikir (dibersihkan giliran berikutnya / saat mute).
        void this.runTurn(message);
      } else {
        this.opts.events.onTranscript('');
      }
      this.scheduleRestart();
      this.recomputeStatus();
    };

    rec.onerror = (event: { error?: string }) => {
      const code = event?.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        // Izin mic ditolak — hentikan loop, status error.
        this.micBroken = true;
        this.setStatus(
          'error',
          'Izin mikrofon ditolak. Aktifkan izin mikrofon di browser.'
        );
        return;
      }
      // 'no-speech', 'aborted', 'network': onend menyusul; loop lanjut.
    };
  }

  private startRecognition(): void {
    if (!this.active || this.muted || this.micBroken || !this.recognition) return;
    try {
      this.recognition.start();
    } catch {
      // start() melempar kalau sudah berjalan — aman diabaikan.
    }
  }

  private scheduleRestart(): void {
    if (
      !this.active ||
      this.muted ||
      this.micBroken ||
      !this.recognition ||
      this.restartScheduled
    ) {
      return;
    }
    this.restartScheduled = true;
    const delay = this.opts.restartDelayMs ?? 100;
    setTimeout(() => {
      this.restartScheduled = false;
      this.startRecognition();
    }, delay);
  }

  private setHearing(h: boolean): void {
    if (this.hearing === h) return;
    this.hearing = h;
    this.opts.events.onHearing(h);
  }

  // ------------------------------------------------------------- barge-in

  /**
   * User sedang bicara → Livia jeda (M6.2).
   *  - TTS masih diputar → stop.
   *  - Giliran LLM masih generating → abort (delta berikutnya dibuang).
   */
  private bargeIn(): void {
    if (this.pipeline?.isSpeaking) this.pipeline.stop();
    if (this.turn) {
      this.turn.aborted = true;
      this.turn = null;
    }
    this.recomputeStatus();
  }

  // -------------------------------------------------------------- giliran

  private async runTurn(message: string): Promise<void> {
    // Giliran baru membersihkan status error sebelumnya.
    if (this.status === 'error') this.status = 'idle';

    // Batalkan giliran lama yang masih tersisa (edge: ucapan baru masuk
    // saat giliran sebelumnya masih streaming).
    this.pipeline?.stop();
    if (this.turn) this.turn.aborted = true;

    const pipeline = this.opts.createPipeline({
      onState: () => this.recomputeStatus(),
      getVolume: this.opts.getVolume,
    });
    this.pipeline = pipeline;
    const turn: Turn = { aborted: false, receivedAny: false, unspoken: '' };
    this.turn = turn;
    this.recomputeStatus();

    const handleEvent = (raw: string) => {
      if (!raw.startsWith('data: ')) return;
      let event: {
        type?: string;
        text?: string;
        expression?: string;
        crisis?: StreamDoneInfo['crisis'];
        message?: string;
      };
      try {
        event = JSON.parse(raw.slice(6));
      } catch {
        return;
      }
      if (turn.aborted) return;

      if (event.type === 'delta' && typeof event.text === 'string') {
        turn.receivedAny = true;
        // M6.1: kalimat utuh langsung ke TTS saat teks masih mengalir.
        turn.unspoken += event.text;
        const { sentences, tail } = takeCompleteSentences(turn.unspoken);
        turn.unspoken = tail;
        if (turn.aborted) return;
        for (const sentence of sentences) pipeline.enqueue(sentence);
        this.recomputeStatus();
      } else if (event.type === 'done') {
        if (turn.unspoken.trim()) pipeline.enqueue(turn.unspoken);
        this.turn = null; // LLM selesai; audio mungkin masih diputar
        if (event.expression) this.opts.events.onExpression(event.expression);
        if (event.crisis?.escalate) {
          // Krisis (M4.2): persona dilepas — audio berhenti, pesan
          // (sudah memuat hotline) ditampilkan.
          pipeline.stop();
          this.setStatus(
            'error',
            event.crisis.message || 'Perlu bantuan? Hubungi orang terdekatmu.'
          );
          return;
        }
        this.recomputeStatus();
      } else if (event.type === 'error') {
        this.turn = null;
        pipeline.stop();
        this.setStatus('error', event.message || 'Koneksi terputus.');
      }
    };

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isVoiceCall: true }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || 'Koneksi terputus.');
      }

      const reader = res.body.getReader();
      let sseBuffer = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const chunks = sseBuffer.split('\n\n');
        sseBuffer = chunks.pop() ?? '';
        for (const chunk of chunks) handleEvent(chunk.trim());
      }
      if (sseBuffer.trim()) handleEvent(sseBuffer.trim());

      if (!turn.aborted) {
        if (this.turn === turn) this.turn = null;
        if (!turn.receivedAny) {
          this.setStatus('error', 'Livia tidak sempat menjawab.');
        } else {
          this.recomputeStatus();
        }
      }
    } catch (e) {
      console.error(e);
      if (!turn.aborted) {
        this.turn = null;
        pipeline.stop();
        this.setStatus('error', 'Koneksi terputus.');
      }
    }
  }

  // --------------------------------------------------------------- status

  private setStatus(status: CallStatus, detail = ''): void {
    if (this.status === status) return;
    this.status = status;
    this.opts.events.onStatus(status, status === 'error' ? detail : undefined);
  }

  /**
   * Satu sumber kebenaran turn cue (M6.2):
   * `speaking` > `thinking` > `listening` (mic on) > `idle`.
   * `error` sticky — dibersihkan giliran baru (runTurn) atau connect ulang.
   */
  private recomputeStatus(): void {
    if (this.status === 'error') return;
    if (this.pipeline?.isSpeaking) {
      this.setStatus('speaking');
      return;
    }
    if (this.turn) {
      this.setStatus('thinking');
      return;
    }
    if (!this.muted && this.recognition && !this.micBroken) {
      this.setStatus('listening');
      return;
    }
    this.setStatus('idle');
  }
}
