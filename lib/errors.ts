import { NextResponse } from 'next/server';
import { logger, serializeError } from './logger';
import { reportRouteError5xx } from './alerting';

/**
 * Error class standar (M0/H0.6, dipakai penuh di M1.4).
 *
 * Aturan main:
 * - `expose: true`  → pesan aman untuk dilihat user, boleh dikirim ke client.
 * - `expose: false` → pesan internal, TIDAK boleh keluar dari server. Client hanya
 *   menerima pesan generic. Detailnya masuk log terstruktur.
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly expose: boolean;

  constructor(code: string, message: string, statusCode = 500, expose = false) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

export const errors = {
  unauthorized: () => new AppError('UNAUTHORIZED', 'Sesi tidak valid. Silakan login ulang.', 401, true),
  forbidden: () => new AppError('FORBIDDEN', 'Kamu tidak punya akses ke resource ini.', 403, true),
  notFound: (what = 'Data') => new AppError('NOT_FOUND', `${what} tidak ditemukan.`, 404, true),
  badRequest: (message: string, code = 'BAD_REQUEST') => new AppError(code, message, 400, true),
  tooManyRequests: (message = 'Terlalu banyak permintaan. Coba lagi nanti.') =>
    new AppError('RATE_LIMITED', message, 429, true),
  upstream: (message = 'Server AI sedang tidak bisa dihubungi. Coba lagi sebentar.') =>
    new AppError('UPSTREAM_UNAVAILABLE', message, 503, true),
  internal: (message = 'Terjadi kesalahan pada server.') =>
    new AppError('INTERNAL_ERROR', message, 500, false),
};

type ErrorLike = { status?: number; statusCode?: number; code?: string | number; message?: string };

/** Ambil HTTP status dari error upstream (Gemini/ElevenLabs) kalau ada. */
function upstreamStatus(error: unknown): number | undefined {
  const err = error as ErrorLike | null;
  if (!err || typeof err !== 'object') return undefined;
  const raw = err.status ?? err.statusCode;
  return typeof raw === 'number' ? raw : undefined;
}

/**
 * Ubah error apa pun menjadi NextResponse yang aman.
 * Selalu log detail lengkap di server; client hanya dapat pesan yang sudah disaring.
 *
 * Async (M7.5): error 5xx di-feed ke penghitung error-rate (`reportRouteError5xx`)
 * SEBELUM response dikembalikan — increment harus di-await, bukan
 * fire-and-forget, supaya tidak hilang saat serverless membeku (pola M7.2).
 * Harganya satu upsert kecil, dan hanya terjadi di jalur yang sudah gagal.
 */
export async function apiErrorResponse(
  error: unknown,
  context: { route: string; userId?: string | null; meta?: Record<string, unknown> } = { route: 'unknown' }
): Promise<NextResponse> {
  let response: NextResponse;

  if (error instanceof AppError) {
    const logPayload = {
      route: context.route,
      userId: context.userId ?? undefined,
      code: error.code,
      status: error.statusCode,
      ...context.meta,
    };

    if (error.statusCode >= 500) {
      logger.error(error.expose ? error.message : 'Unhandled AppError', {
        ...logPayload,
        detail: error.message,
      });
    } else {
      logger.warn(error.message, logPayload);
    }

    response = NextResponse.json(
      { error: error.expose ? error.message : 'Terjadi kesalahan pada server.', code: error.code },
      { status: error.statusCode }
    );
  } else {
    const status = upstreamStatus(error);
    const isUpstreamFailure = status === 429 || status === 502 || status === 503 || status === 504;

    logger.error('Unhandled route error', {
      route: context.route,
      userId: context.userId ?? undefined,
      upstreamStatus: status,
      ...context.meta,
      error: serializeError(error),
    });

    if (isUpstreamFailure) {
      response = NextResponse.json(
        { error: 'Server AI sedang sibuk. Coba lagi sebentar lagi.', code: 'UPSTREAM_UNAVAILABLE' },
        { status: 503 }
      );
    } else {
      // Pesan generic — JANGAN pernah kirim error.message mentah ke client.
      response = NextResponse.json(
        { error: 'Terjadi kesalahan pada server.', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  }

  // M7.5: hanya 5xx yang dihitung — 4xx (input user salah, rate limit, dll.)
  // bukan insiden dan tidak boleh memicu alert.
  if (response.status >= 500) {
    await reportRouteError5xx(context.route);
  }

  return response;
}

/**
 * Baca JSON body dengan aman. Body rusak/kosong bukan alasan untuk 500.
 */
export async function readJsonBody<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw errors.badRequest('Body request bukan JSON yang valid.', 'INVALID_JSON');
  }
}
