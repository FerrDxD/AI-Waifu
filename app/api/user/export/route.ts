import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { collectUserData } from '@/lib/safety/data-control.server';
import {
  exportFileName,
  normalizeExportFormat,
  renderExportMarkdown,
} from '@/lib/safety/data-control';
import { recordAuditEvent } from '@/lib/safety/audit';
import { logger } from '@/lib/logger';

/**
 * Export seluruh data user (M4.4).
 *
 * `GET /api/user/export?format=json|markdown`
 *
 * Prinsip yang mengikat:
 *   1. **API key TIDAK ikut.** Hanya statusnya. File export biasanya berpindah
 *      tangan; key LLM di dalamnya = tagihan kartu kredit user ikut pindah.
 *   2. **Satu bagian gagal ≠ export gagal.** User tetap menerima sisanya plus
 *      catatan jujur bagian mana yang tidak terbaca.
 *   3. **Rate limited.** Export menyentuh banyak tabel sekaligus; tanpa batas,
 *      ini endpoint termudah untuk membebani database.
 */

const ROUTE = '/api/user/export';

export const GET = apiHandler(
  {
    route: `${ROUTE}.GET`,
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu sering mengekspor data. Coba lagi beberapa menit lagi.',
  },
  async ({ userId, req }) => {
    const url = new URL(req.url);
    const format = normalizeExportFormat(url.searchParams.get('format'));

    const bundle = await collectUserData(userId);
    const body =
      format === 'markdown' ? renderExportMarkdown(bundle) : JSON.stringify(bundle, null, 2);

    logger.info('data.export', {
      route: `${ROUTE}.GET`,
      userId,
      sections: Object.keys(bundle.sections).length,
      failures: bundle.failures.length,
    });

    await recordAuditEvent({
      userId,
      action: 'data.export',
      metadata: {
        route: `${ROUTE}.GET`,
        format,
        exportedSections: Object.keys(bundle.sections),
        count: bundle.failures.length,
      },
    });

    return new NextResponse(body, {
      headers: {
        'Content-Type':
          format === 'markdown' ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFileName(format)}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
);
