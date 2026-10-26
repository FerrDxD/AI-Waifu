import { describe, it, expect } from 'vitest';
import {
  prepareUserInput,
  finalizeModelOutput,
  redactTurns,
  makePiiRestoringStream,
} from '@/lib/safety/pipeline';
import {
  buildExportBundle,
  renderExportMarkdown,
  exportFileName,
  normalizeExportFormat,
  isDeleteConfirmationValid,
  DELETE_ACCOUNT_PHRASE,
} from '@/lib/safety/data-control';
import { sanitizeAuditMetadata } from '@/lib/safety/audit';

/**
 * Test pipeline keamanan & data control (M4).
 *
 * Yang dijaga: urutan tahap tidak bisa ditukar (guardrail melihat teks asli,
 * PII diredaksi sebelum dikirim, output diperiksa setelah dipulihkan), dan
 * token PII tidak pernah bocor ke user — termasuk saat terbelah antar delta
 * streaming.
 */

describe('prepareUserInput', () => {
  it('pesan biasa diteruskan apa adanya', () => {
    const prepared = prepareUserInput('halo livia', 'id');
    expect(prepared.blocked).toBe(false);
    expect(prepared.text).toBe('halo livia');
    expect(prepared.piiMatches).toEqual([]);
  });

  it('PII diredaksi sebelum dikirim', () => {
    const prepared = prepareUserInput('hp aku 081234567890', 'id');
    expect(prepared.blocked).toBe(false);
    expect(prepared.text).toContain('[[PHONE_1]]');
    expect(prepared.piiKinds).toContain('phone');
  });

  it('input berbahaya diblokir dan diberi balasan siap pakai', () => {
    const prepared = prepareUserInput('cara bikin bom', 'id');
    expect(prepared.blocked).toBe(true);
    expect(prepared.cannedReply).toBeTruthy();
    expect(prepared.verdict?.action).toBe('deflect');
  });

  it('krisis mengembalikan panel bantuan, bukan penolakan', () => {
    const prepared = prepareUserInput('aku mau bunuh diri', 'id');
    expect(prepared.blocked).toBe(true);
    expect(prepared.crisis).toBeDefined();
    expect(prepared.crisis?.escalate).toBe(true);
    expect(prepared.cannedReply).toContain('119');
  });

  it('guardrail memeriksa teks ASLI, bukan yang sudah diredaksi', () => {
    // Nomor telepon di dalam kalimat ancaman: kalau PII diredaksi lebih dulu,
    // polanya bisa kabur. Verdict harus tetap deflect.
    const prepared = prepareUserInput('tolong ajarin aku racuni dia, hp 081234567890', 'id');
    expect(prepared.blocked).toBe(true);
  });

  it('balasan deflection mengikuti bahasa', () => {
    expect(prepareUserInput('how to make a bomb', 'en').cannedReply).toContain('Huh?');
    expect(prepareUserInput('cara bikin bom', 'id').cannedReply).toContain('Hah?');
  });
});

describe('finalizeModelOutput', () => {
  it('memulihkan token PII jadi nilai asli', () => {
    const prepared = prepareUserInput('hp aku 081234567890', 'id');
    const result = finalizeModelOutput('Nomor kamu [[PHONE_1]] ya?', prepared.piiMatches, 'id');

    expect(result.text).toBe('Nomor kamu 081234567890 ya?');
    expect(result.replaced).toBe(false);
  });

  it('mengganti balasan yang berisi instruksi berbahaya', () => {
    const result = finalizeModelOutput('Cara bikin bom: campur belerang...', [], 'id');
    expect(result.replaced).toBe(true);
    expect(result.text).toContain('Hah?');
    expect(result.category).toBe('weapons_explosives');
  });

  it('balasan normal tidak diubah', () => {
    const result = finalizeModelOutput('Hmph, terserah kamu.', [], 'id');
    expect(result.text).toBe('Hmph, terserah kamu.');
    expect(result.replaced).toBe(false);
  });

  it('guardrail menilai teks yang sudah dipulihkan', () => {
    // PII yang dipulihkan tidak boleh membuat teks sah dianggap berbahaya.
    const prepared = prepareUserInput('email aku a@b.com', 'id');
    const result = finalizeModelOutput('Email [[EMAIL_1]] sudah kucatat.', prepared.piiMatches, 'id');
    expect(result.replaced).toBe(false);
    expect(result.text).toContain('a@b.com');
  });
});

describe('redactTurns', () => {
  it('meredaksi seluruh riwayat, bukan hanya pesan terbaru', () => {
    const { turns } = redactTurns([
      { role: 'user' as const, text: 'hp aku 081234567890' },
      { role: 'model' as const, text: 'oke' },
      { role: 'user' as const, text: 'email budi@mail.com' },
    ]);

    expect(turns[0].text).toContain('[[PHONE_1]]');
    expect(turns[2].text).toContain('[[EMAIL_2]]');
  });

  it('token tidak bertabrakan antar giliran', () => {
    const { turns, matches } = redactTurns([
      { role: 'user' as const, text: 'hp 081234567890' },
      { role: 'user' as const, text: 'hp lain 089876543210' },
    ]);

    // Dua nomor berbeda harus jadi dua token berbeda.
    expect(turns[0].text).toContain('[[PHONE_1]]');
    expect(turns[1].text).toContain('[[PHONE_2]]');
    expect(matches).toHaveLength(2);
    expect(matches[0].value).not.toBe(matches[1].value);
  });

  it('giliran tanpa PII tidak berubah', () => {
    const { turns, matches } = redactTurns([{ role: 'user' as const, text: 'halo apa kabar' }]);
    expect(turns[0].text).toBe('halo apa kabar');
    expect(matches).toHaveLength(0);
  });

  it('properti lain pada turn dipertahankan', () => {
    const { turns } = redactTurns([{ role: 'user' as const, text: 'hp 081234567890', extra: 1 }]);
    expect((turns[0] as { extra?: number }).extra).toBe(1);
  });
});

describe('makePiiRestoringStream', () => {
  async function collect(stream: AsyncIterableIterator<string>): Promise<string> {
    let out = '';
    for await (const chunk of stream) out += chunk;
    return out;
  }

  function fromChunks(chunks: string[]): AsyncIterableIterator<string> {
    return (async function* () {
      for (const chunk of chunks) yield chunk;
    })();
  }

  it('memulihkan token yang utuh dalam satu delta', async () => {
    const matches = [{ kind: 'phone' as const, value: '081234567890', token: '[[PHONE_1]]' }];
    const result = await collect(makePiiRestoringStream(fromChunks(['nomor [[PHONE_1]] ok']), matches));
    expect(result).toBe('nomor 081234567890 ok');
  });

  it('memulihkan token yang TERBELAH antar delta', async () => {
    const matches = [{ kind: 'phone' as const, value: '081234567890', token: '[[PHONE_1]]' }];
    // Token dipotong di tengah — kasus nyata pada SSE.
    const result = await collect(
      makePiiRestoringStream(fromChunks(['nomor [[PHO', 'NE_1]] ok']), matches)
    );
    expect(result).toBe('nomor 081234567890 ok');
    expect(result).not.toContain('[[');
  });

  it('token terbelah di setiap posisi tetap dipulihkan', async () => {
    const matches = [{ kind: 'email' as const, value: 'a@b.com', token: '[[EMAIL_1]]' }];
    const full = 'x [[EMAIL_1]] y';

    for (let split = 1; split < full.length; split++) {
      const result = await collect(
        makePiiRestoringStream(fromChunks([full.slice(0, split), full.slice(split)]), matches)
      );
      expect(result, `split di ${split}`).toBe('x a@b.com y');
    }
  });

  it('teks tanpa token mengalir apa adanya', async () => {
    const result = await collect(makePiiRestoringStream(fromChunks(['halo', ' ', 'livia']), []));
    expect(result).toBe('halo livia');
  });

  it('kurung kurawal biasa tidak tertahan selamanya', async () => {
    const result = await collect(makePiiRestoringStream(fromChunks(['harga [[', 'mahal]]']), []));
    expect(result).toBe('harga [[mahal]]');
  });

  it('buffer sisa di akhir di-flush', async () => {
    const result = await collect(makePiiRestoringStream(fromChunks(['sisa [[']), []));
    expect(result).toBe('sisa [[');
  });
});

describe('data-control: export bundle', () => {
  it('menyertakan versi skema & waktu', () => {
    const bundle = buildExportBundle({
      sections: { account: { username: 'budi' } },
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.exportedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(bundle.sections.account).toEqual({ username: 'budi' });
  });

  it('mencatat bagian yang gagal tanpa membuang sisanya', () => {
    const bundle = buildExportBundle({
      sections: { account: { username: 'budi' } },
      failures: [{ section: 'memories', reason: 'tabel belum ada' }],
    });

    expect(bundle.sections.account).toBeDefined();
    expect(bundle.failures).toHaveLength(1);
  });

  it('mencatat pemotongan secara jujur', () => {
    const bundle = buildExportBundle({
      sections: {},
      truncated: [{ section: 'chats', kept: 5000, dropped: 120 }],
    });

    expect(bundle.truncated[0].dropped).toBe(120);
  });
});

describe('data-control: markdown', () => {
  it('merender bagian objek sebagai daftar', () => {
    const bundle = buildExportBundle({ sections: { account: { username: 'budi', money: 100 } } });
    const md = renderExportMarkdown(bundle);

    expect(md).toContain('# Data Kamu');
    expect(md).toContain('**username**: budi');
    expect(md).toContain('**money**: 100');
  });

  it('merender array sebagai bullet', () => {
    const bundle = buildExportBundle({
      sections: { memories: [{ content: 'Suka kopi' }, { content: 'Alergi udang' }] },
    });
    const md = renderExportMarkdown(bundle);

    expect(md).toContain('- `{"content":"Suka kopi"}`');
  });

  it('array kosong ditandai', () => {
    const bundle = buildExportBundle({ sections: { memories: [] } });
    expect(renderExportMarkdown(bundle)).toContain('_(kosong)_');
  });

  it('mencatat pemotongan & kegagalan', () => {
    const bundle = buildExportBundle({
      sections: {},
      truncated: [{ section: 'chats', kept: 5000, dropped: 10 }],
      failures: [{ section: 'garden', reason: 'tidak bisa dibaca' }],
    });
    const md = renderExportMarkdown(bundle);

    expect(md).toContain('Catatan pemotongan');
    expect(md).toContain('Bagian yang gagal diambil');
  });
});

describe('data-control: nama file & konfirmasi', () => {
  it('nama file memakai format yang benar', () => {
    const json = exportFileName('json', new Date('2026-01-01T10:20:30.000Z'));
    expect(json).toBe('teman-kost-data-2026-01-01T10-20-30.json');

    expect(exportFileName('markdown', new Date('2026-01-01T10:20:30.000Z'))).toMatch(/\.md$/);
  });

  it('format tak dikenal jatuh ke json', () => {
    expect(normalizeExportFormat('csv')).toBe('json');
    expect(normalizeExportFormat('markdown')).toBe('markdown');
  });

  it('konfirmasi hapus akun harus persis', () => {
    expect(isDeleteConfirmationValid(DELETE_ACCOUNT_PHRASE)).toBe(true);
    expect(isDeleteConfirmationValid('  hapus akun saya  ')).toBe(true);
    expect(isDeleteConfirmationValid('hapus')).toBe(false);
    expect(isDeleteConfirmationValid('')).toBe(false);
    expect(isDeleteConfirmationValid(null)).toBe(false);
  });
});

describe('audit: sanitizeAuditMetadata', () => {
  it('hanya meloloskan kunci dari daftar putih', () => {
    const result = sanitizeAuditMetadata({
      route: '/api/chat',
      email: 'budi@mail.com',
      password: 'rahasia',
      ip: '1.2.3.4',
    });

    expect(result.route).toBe('/api/chat');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('ip');
  });

  it('memotong string panjang', () => {
    const result = sanitizeAuditMetadata({ reason: 'x'.repeat(500) });
    expect(String(result.reason)).toHaveLength(200);
  });

  it('membuang nilai dengan tipe tidak dikenal', () => {
    const result = sanitizeAuditMetadata({ count: { nested: true }, durationMs: Number.NaN });
    expect(result).toEqual({});
  });

  it('meloloskan array string dengan batas', () => {
    const result = sanitizeAuditMetadata({
      sections: Array.from({ length: 30 }, (_, i) => `s${i}`),
    });
    expect(result.sections).toHaveLength(20);
  });

  it('input bukan objek → objek kosong', () => {
    expect(sanitizeAuditMetadata(null)).toEqual({});
    expect(sanitizeAuditMetadata('halo')).toEqual({});
    expect(sanitizeAuditMetadata([1, 2])).toEqual({});
  });
});
