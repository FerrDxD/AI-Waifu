import { db } from '@/lib/db';
import { userApiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptSecret, encryptSecret, maskSecret, CryptoConfigError } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { errors } from '@/lib/errors';

/**
 * Pengelolaan API key milik user — SEPENUHNYA di server (M0/H0.1).
 *
 * Sebelumnya: key disimpan di `localStorage` + cookie non-HttpOnly, sehingga
 * bisa dicuri script apa pun di domain (XSS / dependency yang disusupi).
 *
 * Sekarang: key dienkripsi AES-256-GCM, hanya hidup di database, dan client
 * hanya menerima `keyHint` (4 karakter terakhir). Plaintext TIDAK pernah
 * dikirim balik ke browser.
 */

export interface ApiKeyStatus {
  hasKey: boolean;
  keyHint?: string;
  provider?: string;
  updatedAt?: string;
}

/** Provider yang didukung untuk API key pribadi (M8.1). */
export const SUPPORTED_KEY_PROVIDERS = ['gemini', 'openai', 'anthropic', 'openai-compat'] as const;

export type SupportedKeyProvider = (typeof SUPPORTED_KEY_PROVIDERS)[number];

export function isSupportedKeyProvider(value: unknown): value is SupportedKeyProvider {
  return (
    typeof value === 'string' &&
    (SUPPORTED_KEY_PROVIDERS as readonly string[]).includes(value)
  );
}

/** Bentuk API key Gemini: diawali "AIza" lalu ±33 karakter base64url. */
const GEMINI_KEY_RE = /^AIza[0-9A-Za-z_-]{20,}$/;
/** Bentuk API key OpenAI: "sk-" + token. */
const OPENAI_KEY_RE = /^sk-[A-Za-z0-9_-]{20,}$/;
/** Bentuk API key Anthropic: "sk-ant-" + token. */
const ANTHROPIC_KEY_RE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

export function looksLikeGeminiKey(value: string): boolean {
  return GEMINI_KEY_RE.test(value.trim());
}

/**
 * Validasi bentuk key per provider.
 *
 * Provider `openai-compat` (pihak ketiga) tidak punya format yang bisa
 * diandalkan — yang dicek hanya "satu token tanpa spasi, panjang wajar".
 * Validasi sesungguhnya tetap dilakukan provider saat request pertama.
 */
export function looksLikeApiKey(provider: string, value: string): boolean {
  const v = value.trim();
  if (v.length < 16 || v.length > 512 || /\s/.test(v)) return false;

  switch (provider) {
    case 'gemini':
      return GEMINI_KEY_RE.test(v);
    case 'openai':
      return OPENAI_KEY_RE.test(v);
    case 'anthropic':
      return ANTHROPIC_KEY_RE.test(v);
    case 'openai-compat':
      return true;
    default:
      return false;
  }
}

const KEY_FORMAT_HINT: Record<SupportedKeyProvider, string> = {
  gemini: 'Key Gemini biasanya diawali "AIza".',
  openai: 'Key OpenAI biasanya diawali "sk-".',
  anthropic: 'Key Anthropic biasanya diawali "sk-ant-".',
  'openai-compat': 'Key provider harus satu token tanpa spasi (minimal 16 karakter).',
};

export async function getApiKeyStatus(userId: string): Promise<ApiKeyStatus> {
  const rows = await db
    .select({
      keyHint: userApiKeys.keyHint,
      provider: userApiKeys.provider,
      updatedAt: userApiKeys.updatedAt,
    })
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId));

  const row = rows[0];
  if (!row) return { hasKey: false };

  return {
    hasKey: true,
    keyHint: row.keyHint,
    provider: row.provider,
    updatedAt: row.updatedAt?.toISOString(),
  };
}

export async function saveUserApiKey(
  userId: string,
  apiKey: string,
  provider: string = 'gemini'
): Promise<ApiKeyStatus> {
  const trimmed = apiKey.trim();

  if (!isSupportedKeyProvider(provider)) {
    throw errors.badRequest('Provider API key tidak dikenal.', 'INVALID_PROVIDER');
  }

  if (!looksLikeApiKey(provider, trimmed)) {
    throw errors.badRequest(
      `Format API key tidak dikenali. ${KEY_FORMAT_HINT[provider]}`,
      'INVALID_API_KEY'
    );
  }

  const payload = encryptSecret(trimmed);
  const hint = maskSecret(trimmed);

  await db
    .insert(userApiKeys)
    .values({
      userId,
      provider,
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      authTag: payload.authTag,
      keyHint: hint,
    })
    .onConflictDoUpdate({
      target: userApiKeys.userId,
      set: {
        provider,
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        authTag: payload.authTag,
        keyHint: hint,
        updatedAt: new Date(),
      },
    });

  // Catat kejadiannya, tapi JANGAN pernah log key-nya.
  logger.info('user_api_key.saved', { userId, provider, keyLength: trimmed.length });

  return { hasKey: true, keyHint: hint, provider };
}

export async function deleteUserApiKey(userId: string): Promise<void> {
  await db.delete(userApiKeys).where(eq(userApiKeys.userId, userId));
  logger.info('user_api_key.deleted', { userId });
}

export interface StoredApiKey {
  key: string;
  provider: string;
}

/**
 * Ambil API key user dalam bentuk plaintext — HANYA untuk dipakai di server.
 * `undefined` berarti user belum menyimpan key (pakai key server).
 *
 * Provider ikut dikembalikan (M8.1): key Gemini tidak boleh dipakai untuk
 * request ke OpenAI, dan sebaliknya.
 *
 * Kegagalan dekripsi tidak boleh menggagalkan request: kita fallback ke key
 * server supaya Livia tetap bisa menjawab.
 */
export async function getUserApiKey(userId: string): Promise<StoredApiKey | undefined> {
  const rows = await db
    .select({
      ciphertext: userApiKeys.ciphertext,
      iv: userApiKeys.iv,
      authTag: userApiKeys.authTag,
      provider: userApiKeys.provider,
    })
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId));

  const row = rows[0];
  if (!row) return undefined;

  try {
    return { key: decryptSecret(row), provider: row.provider };
  } catch (error) {
    if (error instanceof CryptoConfigError) {
      logger.error('user_api_key.crypto_not_configured', { userId });
    } else {
      logger.error('user_api_key.decrypt_failed', { userId });
    }
    return undefined;
  }
}
