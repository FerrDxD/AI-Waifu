import { NextResponse } from 'next/server';

import { publicApiHandler } from '@/lib/api-handler';
import { checkHealth } from '@/lib/health';

/**
 * GET /api/health (M7.5) — endpoint monitor uptime (UptimeRobot/Better Stack).
 *
 * - Publik (tanpa login) dan TANPA rate limit: monitor harus selalu bisa
 *   menjangkau, termasuk saat aplikasi sedang bermasalah; kuerinya hanya
 *   `select 1` sekali per poll (30–60 detik).
 * - 200 `{"ok":true,"db":"ok",...}` — DB terjawab.
 * - 503 `{"ok":false,"db":"error",...}` — DB tidak terjawab. Monitor
 *   external akan menandai down; webhook error-rate (juga M7.5) biasanya
 *   ikut menyala karena seluruh route API gagal 5xx.
 */
export const GET = publicApiHandler({ route: '/api/health.GET' }, async () => {
  const health = await checkHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
});
