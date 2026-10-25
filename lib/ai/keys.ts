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

/** Bentuk API key Gemini: diawali "AIza" lalu ±33 karakter base64url. */
const GEMINI_KEY_RE = /^AIza[0-9A-Za-z_-]{20,}$/;

export function looksLikeGeminiKey(value: string): boolean {
  return GEMINI_KEY_RE.test(value.trim());
}

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

export async function saveUserApiKey(userId: string, apiKey: string): Promise<ApiKeyStatus> {
  const trimmed = apiKey.trim();

  if (!looksLikeGeminiKey(trimmed)) {
    throw errors.badRequest(
      'Format API key tidak dikenali. Key Gemini biasanya diawali "AIza".',
      'INVALID_API_KEY'
    );
  }

  const payload = encryptSecret(trimmed);
  const hint = maskSecret(trimmed);

  await db
    .insert(userApiKeys)
    .values({
      userId,
      provider: 'gemini',
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      authTag: payload.authTag,
      keyHint: hint,
    })
    .onConflictDoUpdate({
      target: userApiKeys.userId,
      set: {
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        authTag: payload.authTag,
        keyHint: hint,
        updatedAt: new Date(),
      },
    });

  // Catat kejadiannya, tapi JANGAN pernah log key-nya.
  logger.info('user_api_key.saved', { userId, keyLength: trimmed.length });

  return { hasKey: true, keyHint: hint, provider: 'gemini' };
}

export async function deleteUserApiKey(userId: string): Promise<void> {
  await db.delete(userApiKeys).where(eq(userApiKeys.userId, userId));
  logger.info('user_api_key.deleted', { userId });
}

/**
 * Ambil API key user dalam bentuk plaintext — HANYA untuk dipakai di server.
 * `undefined` berarti user belum menyimpan key (pakai key server).
 *
 * Kegagalan dekripsi tidak boleh menggagalkan request: kita fallback ke key
 * server supaya Livia tetap bisa menjawab.
 */
export async function getUserApiKey(userId: string): Promise<string | undefined> {
  const rows = await db
    .select({
      ciphertext: userApiKeys.ciphertext,
      iv: userApiKeys.iv,
      authTag: userApiKeys.authTag,
    })
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId));

  const row = rows[0];
  if (!row) return undefined;

  try {
    return decryptSecret(row);
  } catch (error) {
    if (error instanceof CryptoConfigError) {
      logger.error('user_api_key.crypto_not_configured', { userId });
    } else {
      logger.error('user_api_key.decrypt_failed', { userId });
    }
    return undefined;
  }
}
