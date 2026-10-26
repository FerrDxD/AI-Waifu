import { describe, it, expect } from 'vitest';
import { createReplyExtractor } from '@/lib/ai/stream/extract';

/**
 * Mesin status streaming JSON (M2.1). Murni logika — diuji dengan aliran yang
 * dipecah di banyak titik supaya escape dan \uXXXX lintas-chunk ikut teruji.
 */

/** Dorong teks satu karakter per karakter, kumpulkan hasilnya. */
function streamCharByChar(text: string): { delta: string; found: boolean; raw: string } {
  const ex = createReplyExtractor();
  let delta = '';
  for (const ch of text) delta += ex.push(ch);
  return { delta, found: ex.found, raw: ex.raw };
}

describe('createReplyExtractor', () => {
  it('memuntahkan isi reply sebelum JSON selesai', () => {
    let delta = '';
    let capturedAt = -1;
    const ex = createReplyExtractor();
    const text = '{"reply":"Hmph. Halo juga.","affectionDelta":1}';
    for (let i = 0; i < text.length; i++) {
      delta += ex.push(text[i]);
      if (delta.length > 0 && capturedAt === -1) capturedAt = i;
    }

    expect(delta).toBe('Hmph. Halo juga.');
    // Ditemukan SEBELUM JSON selesai — itu inti streaming.
    expect(capturedAt).toBeGreaterThan(0);
    expect(capturedAt).toBeLessThan(text.length - 5);
    expect(ex.found).toBe(true);
  });

  it('escape \\n diubah jadi baris baru', () => {
    expect(streamCharByChar('{"reply":"baris 1\\nbaris 2"}').delta).toBe('baris 1\nbaris 2');
  });

  it('batch escape beruntun: satu\\ndua\\ntiga', () => {
    expect(streamCharByChar('{"reply":"satu\\n\\ndua\\ntiga"}').delta).toBe('satu\n\ndua\ntiga');
  });

  it('tanda kutip ter-escape tidak menutup string', () => {
    expect(streamCharByChar('{"reply":"dia bilang \\"hai\\" terus hilang"}').delta).toBe(
      'dia bilang "hai" terus hilang'
    );
  });

  it('backslash ganda didekode jadi satu backslash', () => {
    expect(streamCharByChar('{"reply":"c:\\\\log"}').delta).toBe('c:\\log');
  });

  it('\\uXXXX didekode, termasuk surrogate pair', () => {
    expect(streamCharByChar('{"answer":null,"reply":"\\ud83d\\ude00 hai"}').delta).toBe('😀 hai');
  });

  it('hex terpotong di tengah chunk tetap benar', () => {
    const ex = createReplyExtractor();
    const out = ex.push('{"reply":"sayang\\u004') + ex.push('0"}');
    expect(out).toBe('sayang@');
  });

  it('escape lintas batas chunk tetap didekode', () => {
    const ex = createReplyExtractor();
    // chunk berakhir TEPAT setelah backslash.
    const out = ex.push('{"reply":"satu\\') + ex.push('ndua"}');
    expect(out).toBe('satu\ndua');
    expect(ex.found).toBe(true);
  });

  it('kata "reply" di dalam string lain tidak dianggap key', () => {
    const result = streamCharByChar(
      '{"memoryUpdate":"user suka menulis reply singkat","affectionDelta":0}'
    );
    expect(result.delta).toBe('');
    expect(result.found).toBe(false);
  });

  it('pretty JSON dengan spasi/newline tetap menemukan reply', () => {
    const result = streamCharByChar(
      '{\n  "reply": "halo",\n  "expression": "happy",\n  "affectionDelta": 2\n}'
    );
    expect(result.delta).toBe('halo');
  });

  it('whitespace di dalam string dipertahankan', () => {
    expect(streamCharByChar('{"reply":"a  b\\t c"}').delta).toBe('a  b\t c');
  });

  it('karakter sesudah nilai ditutup tidak ikut terbawa', () => {
    expect(streamCharByChar('{"reply":"fix","memoryUpdate":"gibberish"}').delta).toBe('fix');
  });

  it('raw mengumpulkan semua input persis', () => {
    const text = '  {"reply":"x"} trailing junk';
    expect(streamCharByChar(text).raw).toBe(text);
  });

  it('hex tidak valid dibuang, mesin tetap jalan sampai closing quote', () => {
    // JSON utuhnya memang invalid — itu tugas zod di akhir, bukan mesin ini.
    // Karakter pertama setelah \uZZ terkonsumsi sebagai akhir escape, jadi
    // yang keluar 'aZZZb', bukan 'aZZZZb'.
    expect(streamCharByChar('{"reply":"a\\uZZZZb"}').delta).toBe('aZZZb');
  });

  it('hex terpotong lalu tidak valid: sisa karakter diteruskan literal', () => {
    const ex = createReplyExtractor();
    const out = ex.push('{"reply":"A\\u00') + ex.push('G') + ex.push('1B"}');
    expect(out).toBe('A1B');
  });

  it('key \\uXXXX tidak membuat capture palsu (keterbatasan yang disengaja)', () => {
    // Gagal menemukan key berarti hanya kehilangan streaming; validasi zod
    // di akhir tetap menjadi sumber kebenaran.
    const result = streamCharByChar('{"re\\u0070ly":"fix"}');
    expect(result.delta).toBe('');
    expect(result.found).toBe(false);
  });

  it('targetKey lain dipakai lewat parameter', () => {
    const ex = createReplyExtractor('timeOfDay');
    const out = ex.push('{"timeOfDay":"pagi","scene":[]}');
    expect(out).toBe('pagi');
  });

  it('JSON tanpa reply tidak memuntahkan apa pun', () => {
    const result = streamCharByChar('{"affectionDelta":1,"expression":"happy"}');
    expect(result.delta).toBe('');
    expect(result.found).toBe(false);
  });
});
