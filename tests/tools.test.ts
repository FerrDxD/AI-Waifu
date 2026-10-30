import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// `@/lib/auth` di-mock global di tests/setup.ts; `@/lib/tools/store` juga
// di-mock global (in-memory). Di sini hanya impor modul yang diuji.
import { setMockAuth, resetMockAuth, resetMockToolStore } from '@/tests/setup';
import { __resetEnvCacheForTests } from '@/lib/env';

import {
  liviaReplyValidator,
  coerceTools,
  type LiviaToolCall,
} from '@/lib/ai/schemas';
import { parseRemindTime, formatDateTime } from '@/lib/tools/time';
import { TOOL_REGISTRY, TOOL_NAME_SET } from '@/lib/tools/registry';
import { executeToolCalls, executeToolCall } from '@/lib/tools/execute';

const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_SECRET: 'a'.repeat(40),
  GEMINI_API_KEY: 'gemini-key',
};

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  Object.assign(process.env, REQUIRED);
  __resetEnvCacheForTests();
  resetMockAuth();
  resetMockToolStore();
});

afterEach(() => {
  process.env = snapshot;
  __resetEnvCacheForTests();
  resetMockAuth();
  resetMockToolStore();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// coerceTools — validator output Livia (M8.3)
// ---------------------------------------------------------------------------

describe('coerceTools', () => {
  it('array kosong / bukan array → []', () => {
    expect(coerceTools(null)).toEqual([]);
    expect(coerceTools('x')).toEqual([]);
    expect(coerceTools({})).toEqual([]);
    expect(coerceTools([])).toEqual([]);
  });

  it('menerima tool yang dikenal + args object', () => {
    const out = coerceTools([{ name: 'create_reminder', args: { text: 'x', time: 'jam 7' } }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ name: 'create_reminder', args: { text: 'x', time: 'jam 7' } });
  });

  it('membuang tool tak dikenal / args bukan object', () => {
    const out = coerceTools([
      { name: 'hack', args: {} },
      { name: 'create_reminder', args: 'bukan-object' },
      { name: 'add_shopping_item', args: { item: 'telur' } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('add_shopping_item');
  });

  it('membatasi maksimal 5 tool per balasan', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      name: 'list_shopping_items',
      args: {},
      i,
    }));
    expect(coerceTools(many)).toHaveLength(5);
  });
});

describe('liviaReplyValidator.tools', () => {
  it('tanpa field tools → tools = [] (non-kritis)', () => {
    const parsed = liviaReplyValidator.parse({
      reply: 'hai',
      affectionDelta: 1,
      expression: 'happy',
      memories: [],
    });
    expect(parsed.tools).toEqual([]);
  });

  it('field tools ikut diparsing', () => {
    const parsed = liviaReplyValidator.parse({
      reply: 'Siap!',
      affectionDelta: 1,
      expression: 'happy',
      memories: [],
      tools: [{ name: 'create_reminder', args: { text: 'minum', time: 'jam 7' } }],
    });
    expect(parsed.tools).toHaveLength(1);
    expect(parsed.tools![0].name).toBe('create_reminder');
  });

  it('tools rusak tidak menggagalkan balasan (koersi ke [])', () => {
    const parsed = liviaReplyValidator.parse({
      reply: 'Siap!',
      affectionDelta: 0,
      expression: 'happy',
      memories: [],
      tools: 'rusak',
    });
    expect(parsed.reply).toBe('Siap!');
    expect(parsed.tools).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseRemindTime — parsing waktu relatif (M8.3)
// ---------------------------------------------------------------------------

describe('parseRemindTime', () => {
  // `offsetMinutes` WIB = -420 (UTC - lokal). `now` = 2026-10-30T12:00Z =
  // 19:00 WIB; `nowPagi` = 2026-10-29T23:00Z = 06:00 WIB (30 Okt).
  const now = new Date('2026-10-30T12:00:00Z');
  const nowPagi = new Date('2026-10-29T23:00:00Z');
  const offsetMinutes = -420; // WIB

  it('"jam 7" pagi ini (belum lewat) → 07:00 WIB hari yang sama', () => {
    const d = parseRemindTime('jam 7', { now: nowPagi, offsetMinutes });
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2026-10-30T00:00:00.000Z');
  });

  it('"jam 7" sudah lewat (mis. jam 8 malam) → besok 07:00 WIB', () => {
    const late = new Date('2026-10-30T15:00:00Z'); // 22:00 WIB — sudah lewat
    const d = parseRemindTime('jam 7', { now: late, offsetMinutes });
    expect(d!.toISOString()).toBe('2026-10-31T00:00:00.000Z');
  });

  it('"besok jam 9 pagi" → besok 09:00 WIB', () => {
    const d = parseRemindTime('besok jam 9 pagi', { now, offsetMinutes });
    expect(d!.toISOString()).toBe('2026-10-31T02:00:00.000Z');
  });

  it('"jam 7 malam" → 19:00 WIB hari yang sama', () => {
    const d = parseRemindTime('jam 7 malam', { now: nowPagi, offsetMinutes });
    expect(d!.toISOString()).toBe('2026-10-30T12:00:00.000Z');
  });

  it('"7:30" → 07:30 WIB besok kalau sudah lewat', () => {
    const d = parseRemindTime('7:30', { now, offsetMinutes });
    expect(d!.toISOString()).toBe('2026-10-31T00:30:00.000Z');
  });

  it('ISO absolute diterima apa adanya', () => {
    const d = parseRemindTime('2026-11-01T08:00:00+07:00', { now, offsetMinutes });
    expect(d!.toISOString()).toBe('2026-11-01T01:00:00.000Z');
  });

  it('teks tak dikenali → null (minta kejelasan)', () => {
    expect(parseRemindTime('setelah makan siang', { now, offsetMinutes })).toBeNull();
    expect(parseRemindTime('', { now, offsetMinutes })).toBeNull();
    expect(parseRemindTime(123, { now, offsetMinutes })).toBeNull();
  });
});

describe('formatDateTime', () => {
  it('format konsisten (UTC + offset)', () => {
    const d = new Date('2026-10-30T12:00:00Z');
    expect(formatDateTime(d, -420)).toBe('2026-10-30 19:00');
  });
});

// ---------------------------------------------------------------------------
// Registry — definisi tool
// ---------------------------------------------------------------------------

describe('TOOL_REGISTRY', () => {
  it('semua nama unik & ada di TOOL_NAME_SET', () => {
    const names = TOOL_REGISTRY.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(TOOL_NAME_SET.has(n)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// executeToolCalls — executor murni (M8.3)
// ---------------------------------------------------------------------------

describe('executeToolCalls', () => {
  it('create_reminder sukses → baris konfirmasi + tools', async () => {
    const { lines, tools } = await executeToolCalls(
      [
        {
          name: 'create_reminder',
          args: { text: 'minum obat', time: 'jam 7 malam' },
        },
      ],
      { userId: 'u-1', offsetMinutes: -420, now: new Date('2026-10-29T23:00:00Z') }
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('[✓]');
    expect(lines[0]).toContain('minum obat');
    expect(lines[0]).toContain('2026-10-30 19:00');
    expect(tools).toEqual(['create_reminder']);
  });

  it('create_reminder waktu tak terbaca → baris [?] (minta kejelasan)', async () => {
    const { lines, tools } = await executeToolCalls(
      [{ name: 'create_reminder', args: { text: 'x', time: 'setelah makan siang' } }],
      { userId: 'u-1', offsetMinutes: -420 }
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('[?]');
    expect(tools).toEqual([]);
  });

  it('add_shopping_item sukses → baris konfirmasi + tools', async () => {
    const { lines, tools } = await executeToolCalls(
      [{ name: 'add_shopping_item', args: { item: 'telur' } }],
      { userId: 'u-1' }
    );
    expect(lines[0]).toContain('[✓]');
    expect(lines[0]).toContain('telur');
    expect(tools).toEqual(['add_shopping_item']);
  });

  it('list_shopping_items mengembalikan daftar', async () => {
    await executeToolCalls([{ name: 'add_shopping_item', args: { item: 'susu' } }], {
      userId: 'u-1',
    });
    const { lines } = await executeToolCalls(
      [{ name: 'list_shopping_items', args: {} }],
      { userId: 'u-1' }
    );
    expect(lines[0]).toContain('susu');
  });

  it('tool tak dikenal → di-skip (tanpa baris)', async () => {
    const { lines, tools } = await executeToolCalls(
      [{ name: 'hack', args: {} } as unknown as LiviaToolCall],
      { userId: 'u-1' }
    );
    expect(lines).toEqual([]);
    expect(tools).toEqual([]);
  });
});

describe('executeToolCall', () => {
  it('args tidak valid → ok false', async () => {
    const result = await executeToolCall({ name: 'create_reminder', args: {} }, {
      userId: 'u-1',
    });
    expect(result.ok).toBe(false);
  });

  it('executor tidak pernah melempar (gagal intern → ok false)', async () => {
    // args zod valid tapi store mock dipaksa error via stubbing.
    const spy = vi.spyOn(await import('@/lib/tools/store'), 'insertReminder').mockRejectedValueOnce(new Error('db down'));
    const result = await executeToolCall(
      { name: 'create_reminder', args: { text: 'x', time: 'jam 7' } },
      { userId: 'u-1', offsetMinutes: -420 }
    );
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });
});
