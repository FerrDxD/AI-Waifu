import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// `@/lib/health` di-mock per file: SATU-SATUNYA konsumen yang di-import test
// ini (route). Modul lain suite ini tidak menyentuhnya, jadi aman dengan
// isolate: false — pola yang sama dengan `@/lib/feedback` di feedback-route.
// Yang diuji di sini: pemetaan status HTTP + bentuk body. Logika `checkHealth`
// (select 1 ke DB) ditegakkan di production lewat monitor uptime.
import { checkHealth, type HealthStatus } from '@/lib/health';
import { GET } from '@/app/api/health/route';

vi.mock('@/lib/health', () => ({
  checkHealth: vi.fn(async (): Promise<HealthStatus> => ({
    ok: true,
    db: 'ok',
    timestamp: '2026-10-29T00:00:00.000Z',
  })),
}));

const call = () =>
  (GET as unknown as (r: Request, c: unknown) => Promise<Response>)(
    new Request('http://localhost/api/health', { method: 'GET' }),
    {}
  );

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  vi.mocked(checkHealth).mockClear();
  vi.mocked(checkHealth).mockResolvedValue({
    ok: true,
    db: 'ok',
    timestamp: '2026-10-29T00:00:00.000Z',
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  process.env = snapshot;
  vi.restoreAllMocks();
});

describe('GET /api/health (M7.5)', () => {
  it('200 + db ok ketika DB terjawab', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthStatus;
    expect(body.ok).toBe(true);
    expect(body.db).toBe('ok');
    expect(body.timestamp).toBeTruthy();
  });

  it('503 + db error ketika DB tidak terjawab', async () => {
    vi.mocked(checkHealth).mockResolvedValue({
      ok: false,
      db: 'error',
      timestamp: '2026-10-29T00:00:00.000Z',
    });

    const res = await call();
    expect(res.status).toBe(503);
    const body = (await res.json()) as HealthStatus;
    expect(body.ok).toBe(false);
    expect(body.db).toBe('error');
  });

  it('publik: tidak butuh sesi (publicApiHandler tidak memanggil auth)', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(checkHealth).toHaveBeenCalledTimes(1);
  });
});
