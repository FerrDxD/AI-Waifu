import { describe, it, expect } from 'vitest';
import {
  collectTranscript,
  type RecognitionResultEvent,
} from '@/lib/speech/transcript';

/** Bangun event onresult fake dari daftar hasil (kumulatif, seperti API). */
const ev = (
  ...results: Array<{ isFinal: boolean; transcript: string }>
): RecognitionResultEvent => ({
  results: results.map((r) => ({
    isFinal: r.isFinal,
    0: { transcript: r.transcript },
  })),
  resultIndex: 0,
});

describe('collectTranscript (M6.3)', () => {
  it('interim saja → full = interim', () => {
    const s = collectTranscript(ev({ isFinal: false, transcript: 'halo' }));
    expect(s).toEqual({ final: '', interim: 'halo', full: 'halo' });
  });

  it('final saja → full = final (dirapikan)', () => {
    const s = collectTranscript(ev({ isFinal: true, transcript: ' halo ' }));
    expect(s).toEqual({ final: ' halo ', interim: '', full: 'halo' });
  });

  it('final + interim → full = final + interim', () => {
    const s = collectTranscript(
      ev(
        { isFinal: true, transcript: 'Aku mau ' },
        { isFinal: false, transcript: 'makan' }
      )
    );
    expect(s.final).toBe('Aku mau ');
    expect(s.interim).toBe('makan');
    expect(s.full).toBe('Aku mau makan');
  });

  it('beberapa final diurutkan sesuai results', () => {
    const s = collectTranscript(
      ev(
        { isFinal: true, transcript: 'Halo. ' },
        { isFinal: true, transcript: 'Kamu ' },
        { isFinal: false, transcript: 'bagaimana' }
      )
    );
    expect(s.full).toBe('Halo. Kamu bagaimana');
  });

  it('interim diperbarui = rebuild per event, bukan append (anti double hitung)', () => {
    // Event 1: interim "halo".
    const first = collectTranscript(
      ev({ isFinal: false, transcript: 'halo' })
    );
    // Event 2: sesi yang sama, interim diperluas jadi "halo kamu"
    // (results berisi state SELURUH sesi, bukan delta).
    const second = collectTranscript(
      ev({ isFinal: false, transcript: 'halo kamu' })
    );
    expect(first.full).toBe('halo');
    expect(second.full).toBe('halo kamu');
    // Konsumen harus memakai `full` dari event terbaru,
    // BUKAN first.full + second.full (itu = "halo halo kamu").
    expect(first.full + second.full).not.toBe(second.full);
  });

  it('results kosong → snapshot kosong', () => {
    expect(collectTranscript(ev())).toEqual({
      final: '',
      interim: '',
      full: '',
    });
  });

  it('alternatif kedua diabaikan (pakai hasil [0] saja)', () => {
    const event: RecognitionResultEvent = {
      results: [
        {
          isFinal: false,
          0: { transcript: 'pilih' },
          1: { transcript: 'pihak' },
        },
      ] as unknown as ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>,
      resultIndex: 0,
    };
    expect(collectTranscript(event).full).toBe('pilih');
  });
});
