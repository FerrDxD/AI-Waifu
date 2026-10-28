import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CallSession,
  type CallStatus,
  type RecognitionLike,
  type RecognitionResultEvent,
} from '@/lib/call/session';
import type { TtsPipeline } from '@/lib/tts/pipeline';

const flush = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Recognition Web Speech API yang bisa dikendalikan dari test. */
class FakeRecognition implements RecognitionLike {
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onresult: ((event: RecognitionResultEvent) => void) | null = null;
  starts = 0;
  stops = 0;
  aborts = 0;

  start() {
    this.starts++;
  }
  // Perilaku browser: stop() memicu onend.
  stop() {
    this.stops++;
    this.onend?.();
  }
  abort() {
    this.aborts++;
  }

  /** Emit state transkrip Sesi ini (final + interim) — seperti hasil kumulatif. */
  emitUtterance(final = '', interim = '') {
    const results: Array<{ isFinal: boolean; 0: { transcript: string } }> = [];
    if (final) results.push({ isFinal: true, 0: { transcript: final } });
    if (interim) results.push({ isFinal: false, 0: { transcript: interim } });
    if (results.length === 0) return;
    this.onresult?.({ results, resultIndex: 0 });
  }

  emitEnd() {
    this.onend?.();
  }
  emitError(code: string) {
    this.onerror?.({ error: code });
  }
}

/** Pipeline TTS fake: enqueue = langsung "berbicara", stop = berhenti. */
class FakePipeline {
  enqueued: string[] = [];
  speaking = false;
  stopped = false;
  private onState: (s: 'idle' | 'speaking') => void;

  constructor(hooks: { onState: (s: 'idle' | 'speaking') => void; getVolume: () => number }) {
    this.onState = hooks.onState;
  }
  get isSpeaking() {
    return this.speaking;
  }
  enqueue(sentence: string) {
    if (this.stopped) return;
    this.enqueued.push(sentence);
    this.speaking = true;
    this.onState('speaking');
  }
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.speaking = false;
    this.onState('idle');
  }
}

const sseEvent = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

function makeSseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

/** SSE stream yang bisa dikirim per-event (untuk skenario abort/barge-in). */
function makeControllableSse() {
  const enc = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    stream,
    send: (obj: unknown) => controller.enqueue(enc.encode(sseEvent(obj))),
    close: () => controller.close(),
  };
}

const sseOk = () =>
  new Response(
    makeSseStream([
      sseEvent({ type: 'delta', text: 'Oke. ' }),
      sseEvent({ type: 'done', reply: 'Oke.' }),
    ]),
    { status: 200 }
  );

type Recorded = {
  statuses: Array<[CallStatus, string?]>;
  transcripts: string[];
  hearings: boolean[];
  expressions: string[];
};

const lastStatus = (r: Recorded): [CallStatus, string?] =>
  r.statuses[r.statuses.length - 1];

function makeSession(rec: FakeRecognition | null, fetchImpl: () => Response | Promise<Response>) {
  const pipelines: FakePipeline[] = [];
  const recorded: Recorded = {
    statuses: [],
    transcripts: [],
    hearings: [],
    expressions: [],
  };
  vi.stubGlobal('fetch', vi.fn(async () => fetchImpl()));
  const session = new CallSession({
    createRecognition: () => rec,
    createPipeline: (hooks) => {
      const p = new FakePipeline(hooks);
      pipelines.push(p);
      return p as unknown as TtsPipeline;
    },
    getVolume: () => 1,
    events: {
      onStatus: (s, d) => recorded.statuses.push([s, d]),
      onTranscript: (t) => recorded.transcripts.push(t),
      onHearing: (h) => recorded.hearings.push(h),
      onExpression: (e) => recorded.expressions.push(e),
    },
    restartDelayMs: 0,
  });
  return { session, pipelines, recorded };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CallSession (M6.2)', () => {
  it('connect: continuous listening + auto-restart setelah onend kosong', async () => {
    const rec = new FakeRecognition();
    const { session, recorded } = makeSession(rec, sseOk);
    session.connect();

    expect(rec.starts).toBe(1);
    expect(lastStatus(recorded)[0]).toBe('listening');

    rec.emitEnd(); // hening tanpa ucapan
    await flush(10);
    expect(rec.starts).toBe(2); // auto-restart
    expect(lastStatus(recorded)[0]).toBe('listening');
  });

  it('ucapan → thinking → speaking → done (expression) → listening', async () => {
    const rec = new FakeRecognition();
    const { session, pipelines, recorded } = makeSession(
      rec,
      async () =>
        new Response(
          makeSseStream([
            sseEvent({ type: 'delta', text: 'Halo. ' }),
            sseEvent({ type: 'delta', text: 'Apa kabar?' }),
            sseEvent({ type: 'done', reply: 'Halo. Apa kabar?', expression: 'happy' }),
          ]),
          { status: 200 }
        )
    );
    session.connect();

    rec.emitUtterance('', 'halo');
    rec.emitEnd();
    await flush(30);

    expect(pipelines.length).toBe(1);
    expect(pipelines[0].enqueued).toEqual(['Halo.', 'Apa kabar?']);
    expect(recorded.expressions).toEqual(['happy']);
    expect(lastStatus(recorded)[0]).toBe('speaking');

    pipelines[0].stop(); // audio selesai
    await flush(5);
    expect(lastStatus(recorded)[0]).toBe('listening');
  });

  it('barge-in saat Livia berbicara: TTS stop, status listening', async () => {
    const rec = new FakeRecognition();
    const ctrl = makeControllableSse();
    const { session, pipelines, recorded } = makeSession(rec, () =>
      new Response(ctrl.stream, { status: 200 })
    );
    session.connect();

    rec.emitUtterance('', 'hai');
    rec.emitEnd();
    await flush(10);
    expect(lastStatus(recorded)[0]).toBe('thinking');

    ctrl.send({ type: 'delta', text: 'Halo, ' });
    ctrl.send({ type: 'delta', text: 'aku di sini.' });
    ctrl.send({ type: 'done', reply: 'Halo, aku di sini.' });
    await flush(10);
    expect(pipelines[0].enqueued).toEqual(['Halo, aku di sini.']);
    expect(lastStatus(recorded)[0]).toBe('speaking');

    // User mulai bicara lagi → barge-in (M6.2).
    rec.emitUtterance('', 'tunggu');
    await flush(5);
    expect(pipelines[0].stopped).toBe(true);
    expect(lastStatus(recorded)[0]).toBe('listening');
  });

  it('barge-in saat thinking: giliran di-abort, stream terlambat dibuang', async () => {
    const rec = new FakeRecognition();
    const ctrl = makeControllableSse();
    const { session, pipelines, recorded } = makeSession(rec, () =>
      new Response(ctrl.stream, { status: 200 })
    );
    session.connect();

    rec.emitUtterance('', 'heh');
    rec.emitEnd();
    await flush(10);
    expect(lastStatus(recorded)[0]).toBe('thinking');

    // User memotong sebelum delta pertama datang.
    rec.emitUtterance('', 'diam dulu');
    await flush(5);
    expect(lastStatus(recorded)[0]).toBe('listening');

    // Event stream yang terlambat harus dibuang (turn aborted).
    ctrl.send({ type: 'delta', text: 'Jangan. ' });
    ctrl.send({ type: 'done', reply: 'Jangan.', expression: 'angry' });
    await flush(20);
    expect(pipelines[0].enqueued).toEqual([]);
    expect(recorded.expressions).toEqual([]);
  });

  it('mute: ucapan dibuang, tidak restart; unmute: restart + listening', async () => {
    const rec = new FakeRecognition();
    const { session, pipelines, recorded } = makeSession(rec, sseOk);
    session.connect();
    expect(rec.starts).toBe(1);

    rec.emitUtterance('', 'halo');
    session.setMuted(true); // stop() fake memicu onend: muted → dibuang
    expect(pipelines.length).toBe(0);
    expect(rec.starts).toBe(1);
    expect(recorded.transcripts[recorded.transcripts.length - 1]).toBe('');
    expect(lastStatus(recorded)[0]).toBe('idle');

    rec.emitEnd(); // onend ganda (safety) — tetap tidak restart saat muted
    await flush(10);
    expect(rec.starts).toBe(1);
    expect(pipelines.length).toBe(0);

    session.setMuted(false);
    expect(rec.starts).toBe(2);
    expect(lastStatus(recorded)[0]).toBe('listening');
  });

  it('izin mic ditolak: status error, loop berhenti', async () => {
    const rec = new FakeRecognition();
    const { session, recorded } = makeSession(rec, sseOk);
    session.connect();

    rec.emitError('not-allowed');
    expect(lastStatus(recorded)[0]).toBe('error');
    expect(lastStatus(recorded)[1]).toContain('mikrofon');

    rec.emitEnd();
    await flush(10);
    expect(rec.starts).toBe(1); // tidak restart
  });

  it('browser tanpa SpeechRecognition: status error', () => {
    const { session, recorded } = makeSession(null, sseOk);
    session.connect();
    expect(lastStatus(recorded)[0]).toBe('error');
    expect(lastStatus(recorded)[1]).toContain('Browser tidak mendukung');
  });

  it('dispose: recognition abort + pipeline stop', async () => {
    const rec = new FakeRecognition();
    const { session, pipelines } = makeSession(rec, sseOk);
    session.connect();

    rec.emitUtterance('', 'hai');
    rec.emitEnd();
    await flush(10);
    expect(pipelines.length).toBe(1);

    session.dispose();
    expect(rec.aborts).toBe(1);
    expect(pipelines[0].stopped).toBe(true);
  });

  it('stream error: status error; giliran berikutnya membersihkan error', async () => {
    const rec = new FakeRecognition();
    let call = 0;
    const { session, recorded } = makeSession(rec, () => {
      call++;
      if (call === 1) {
        return new Response(
          makeSseStream([sseEvent({ type: 'error', message: 'Kuota habis' })]),
          { status: 200 }
        );
      }
      return sseOk();
    });
    session.connect();

    rec.emitUtterance('', 'halo');
    rec.emitEnd();
    await flush(20);
    expect(lastStatus(recorded)[0]).toBe('error');
    expect(lastStatus(recorded)[1]).toBe('Kuota habis');

    rec.emitUtterance('', 'lagi');
    rec.emitEnd();
    await flush(20);
    expect(lastStatus(recorded)[0]).toBe('speaking');
  });
});
