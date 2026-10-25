import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, serializeError } from '@/lib/logger';

let output: string[] = [];

beforeEach(() => {
  output = [];
  vi.spyOn(console, 'log').mockImplementation((...args) => {
    output.push(args.map(String).join(' '));
  });
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    output.push(args.map(String).join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    output.push(args.map(String).join(' '));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logger: routing level', () => {
  it('info/debug ke console.log', () => {
    logger.info('halo');
    logger.debug('debug');
    expect(output).toHaveLength(2);
  });

  it('warn ke console.warn', () => {
    const spy = vi.spyOn(console, 'warn');
    logger.warn('awas');
    expect(spy).toHaveBeenCalledOnce();
  });

  it('error ke console.error', () => {
    const spy = vi.spyOn(console, 'error');
    logger.error('rusak');
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe('logger: redaksi secret', () => {
  const SENSITIVE_KEYS = [
    'apiKey',
    'api_key',
    'x-custom-api-key',
    'authorization',
    'password',
    'newPassword',
    'token',
    'cookie',
    'secret',
  ];

  it.each(SENSITIVE_KEYS)('mengaburkan field %s', (key) => {
    logger.info('test', { [key]: 'NILAI-RAHASIA-SEKALI' });
    const line = output.join('\n');

    expect(line).not.toContain('NILAI-RAHASIA-SEKALI');
    expect(line).toContain('[redacted]');
  });

  it('mengaburkan key yang mengandung kata sensitif (mis. accessToken)', () => {
    logger.info('test', { accessToken: 'abc123' });
    expect(output.join('\n')).not.toContain('abc123');
  });

  it('tidak mengaburkan field biasa', () => {
    logger.info('test', { route: '/api/chat', userId: 'user-1' });
    const line = output.join('\n');

    expect(line).toContain('/api/chat');
    expect(line).toContain('user-1');
  });

  it('menserialisasi Error di dalam meta', () => {
    logger.error('gagal', { error: new Error('boom') });
    const line = output.join('\n');

    expect(line).toContain('boom');
    expect(line).toContain('Error');
  });
});

describe('serializeError', () => {
  it('mengambil name, message, code, status', () => {
    const err = Object.assign(new Error('rusak'), { code: 'E_X', status: 503 });
    const result = serializeError(err);

    expect(result).toMatchObject({ name: 'Error', message: 'rusak', code: 'E_X', status: 503 });
  });

  it('mendukung statusCode', () => {
    const err = Object.assign(new Error('x'), { statusCode: 404 });
    expect(serializeError(err).status).toBe(404);
  });

  it('menangani non-Error', () => {
    expect(serializeError('teks')).toEqual({ message: 'teks' });
    expect(serializeError(42)).toEqual({ message: '42' });
    expect(serializeError(null)).toEqual({ message: 'null' });
  });

  it('serializeError tidak mewajibkan field stack', () => {
    // `isProd` dibaca saat import, jadi NODE_ENV tidak bisa diubah di sini.
    // Yang penting: hasilnya selalu punya `message`, dan `stack` opsional.
    const result = serializeError(new Error('x'));
    expect(result.message).toBe('x');
    expect(Object.keys(result)).toContain('message');
  });
});
