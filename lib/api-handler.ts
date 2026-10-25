import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from './auth';
import { apiErrorResponse, errors, readJsonBody } from './errors';
import { getClientIp, rateLimitResponse, type RateLimiter } from './rate-limit';
import { logger } from './logger';

/**
 * Wrapper route handler (M1.4).
 *
 * Masalah yang diselesaikan: pola
 *
 *   try {
 *     const session = await auth();
 *     if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *     const rate = await someLimiter.limit(key);
 *     if (!rate.success) return NextResponse.json({ error: '...' }, { status: 429 });
 *     ... 40 baris logika ...
 *   } catch (error) {
 *     return apiErrorResponse(error, { route: '...' });
 *   }
 *
 * diulang di ~20 route. Itu bukan cuma duplikasi: setiap route baru adalah
 * kesempatan lupa memasang rate limit atau lupa try/catch. Di sini auth,
 * rate limit, dan penanganan error jadi SATU tempat.
 *
 * Yang dijamin:
 * - 401 konsisten kalau belum login (`errors.unauthorized`).
 * - 429 konsisten dengan header `Retry-After` kalau rate limit aktif.
 * - Error apa pun dari handler tidak pernah bocor mentah ke client.
 * - Handler TIDAK dipanggil sama sekali kalau auth/rate limit gagal.
 *
 * Dua varian, supaya tipe `userId` jujur:
 * - `apiHandler`        → wajib login, `userId: string`.
 * - `publicApiHandler`  → tanpa login, `userId: string | null`.
 */

type BaseContext<TParams> = {
  req: Request;
  params: TParams;
  /** IP client, berguna untuk rate limit berbasis IP di dalam handler. */
  ip: string;
};

export type ApiRouteContext<TParams = Record<string, string>> = BaseContext<TParams> & {
  /** User yang sudah terverifikasi. Tidak pernah null di dalam handler. */
  userId: string;
  session: Session;
};

export type PublicApiRouteContext<TParams = Record<string, string>> = BaseContext<TParams> & {
  /** Null kalau request anonim. */
  userId: string | null;
  session: Session | null;
};

export type ApiHandlerOptions = {
  /** Nama route untuk log, mis. `/api/garden`. */
  route: string;
  /** Limiter yang dijalankan sebelum handler. `null`/undefined = tanpa limit. */
  rateLimit?: RateLimiter | null;
  /** Default: per user kalau login, per IP kalau anonim. */
  rateLimitKey?: (ctx: { userId: string | null; req: Request; ip: string }) => string;
  /** Pesan 429 yang dilihat user. */
  rateLimitMessage?: string;
};

/** Key default: per user kalau login, per IP kalau anonim. */
export function userOrIpKey(ctx: { userId: string | null; ip: string }): string {
  return ctx.userId ? `u:${ctx.userId}` : `ip:${ctx.ip}`;
}

/** Key per IP saja — untuk register/reset-password yang belum ada user. */
export function ipKey(ctx: { ip: string }): string {
  return `ip:${ctx.ip}`;
}

type RouteHandler<TParams> = (req: Request, ctx: { params: TParams }) => Promise<Response>;

type Resolved = {
  userId: string | null;
  session: Session | null;
};

/**
 * Inti: jalankan auth (opsional), rate limit, lalu handler; semua error
 * dilempar ke `apiErrorResponse`.
 */
async function run<TParams>(
  options: ApiHandlerOptions,
  requireAuth: boolean,
  req: Request,
  routeCtx: { params: TParams } | undefined,
  handler: (ctx: BaseContext<TParams> & Resolved) => Promise<Response>
): Promise<Response> {
  const params = (routeCtx?.params ?? {}) as TParams;
  const ip = getClientIp(req);

  let resolved: Resolved = { userId: null, session: null };

  try {
    if (requireAuth) {
      const session = await auth();
      if (!session?.user?.id) throw errors.unauthorized();
      resolved = { userId: session.user.id, session };
    }

    if (options.rateLimit) {
      const key = options.rateLimitKey
        ? options.rateLimitKey({ userId: resolved.userId, req, ip })
        : userOrIpKey({ userId: resolved.userId, ip });

      const result = await options.rateLimit.limit(key);
      if (!result.success) {
        return rateLimitResponse(
          result,
          options.rateLimitMessage ?? 'Terlalu banyak permintaan. Coba lagi nanti.'
        );
      }
    }

    return await handler({ req, params, ip, ...resolved });
  } catch (error) {
    return apiErrorResponse(error, { route: options.route, userId: resolved.userId });
  }
}

/**
 * Route yang WAJIB login.
 *
 * @example
 * export const POST = apiHandler({ route: '/api/garden', rateLimit: mutationRateLimit },
 *   async ({ userId, req }) => {
 *     const body = await readJsonBody(req);
 *     ...
 *     return NextResponse.json({ success: true });
 *   });
 */
export function apiHandler<TParams = Record<string, string>>(
  options: ApiHandlerOptions,
  handler: (ctx: ApiRouteContext<TParams>) => Promise<Response>
): RouteHandler<TParams> {
  return (req, routeCtx) =>
    run(options, true, req, routeCtx, (ctx) =>
      handler({
        ...ctx,
        userId: ctx.userId as string,
        session: ctx.session as Session,
      })
    );
}

/**
 * Route publik (login, register, reset password). `userId` bisa null.
 */
export function publicApiHandler<TParams = Record<string, string>>(
  options: ApiHandlerOptions,
  handler: (ctx: PublicApiRouteContext<TParams>) => Promise<Response>
): RouteHandler<TParams> {
  return (req, routeCtx) => run(options, false, req, routeCtx, (ctx) => handler(ctx));
}

/**
 * Seperti `apiHandler`, tapi body JSON sudah di-parse dan body rusak otomatis
 * jadi 400 `INVALID_JSON` (bukan 500).
 */
export function jsonApiHandler<TBody, TParams = Record<string, string>>(
  options: ApiHandlerOptions,
  handler: (ctx: ApiRouteContext<TParams> & { body: TBody }) => Promise<Response>
): RouteHandler<TParams> {
  return apiHandler<TParams>(options, async (ctx) => {
    const body = await readJsonBody<TBody>(ctx.req);
    return handler({ ...ctx, body });
  });
}

/**
 * Helper untuk respons sukses standar. Tidak wajib, tapi membuat bentuk
 * respons konsisten (`{ ok: true, data }`).
 */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * Log peringatan untuk kondisi tidak fatal tapi perlu diperhatikan
 * (mis. data DB tidak konsisten). Terpusat supaya formatnya seragam.
 */
export function warnRoute(route: string, message: string, meta?: Record<string, unknown>) {
  logger.warn(message, { route, ...meta });
}
