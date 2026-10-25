/**
 * Structured logger minimal (M0/H0.6).
 *
 * Tujuan: berhenti menyemburkan `error.message` mentah ke client dan berhenti
 * memakai `console.error` liar. Semua log keluar sebagai satu baris JSON di
 * production supaya bisa di-query (Vercel/Datadog/whatever), dan tetap
 * human-readable di development.
 *
 * M1.4 akan mengganti ini dengan logger penuh + Sentry.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

const isProd = process.env.NODE_ENV === 'production';

/** Field yang tidak boleh pernah muncul di log (bocor ke log aggregator = insiden). */
const REDACTED_KEYS = [
  'apikey',
  'api_key',
  'x-custom-api-key',
  'authorization',
  'password',
  'newpassword',
  'token',
  'cookie',
  'secret',
];

function redact(meta: LogMeta): LogMeta {
  const out: LogMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (REDACTED_KEYS.some((needle) => lower.includes(needle))) {
      out[key] = '[redacted]';
    } else if (value instanceof Error) {
      out[key] = serializeError(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function serializeError(error: unknown): LogMeta {
  if (error instanceof Error) {
    const withStatus = error as Error & { status?: number; statusCode?: number; code?: string };
    return {
      name: error.name,
      message: error.message,
      code: withStatus.code,
      status: withStatus.status ?? withStatus.statusCode,
      stack: isProd ? undefined : error.stack,
    };
  }
  return { message: String(error) };
}

function emit(level: LogLevel, message: string, meta: LogMeta = {}) {
  const payload = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...redact(meta),
  };

  const line = isProd ? JSON.stringify(payload) : `[${level}] ${message} ${JSON.stringify(payload)}`;

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => emit('debug', message, meta),
  info: (message: string, meta?: LogMeta) => emit('info', message, meta),
  warn: (message: string, meta?: LogMeta) => emit('warn', message, meta),
  error: (message: string, meta?: LogMeta) => emit('error', message, meta),
};
