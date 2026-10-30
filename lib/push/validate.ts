/**
 * Validasi input subscription Web Push (M8.5).
 *
 * Pure function — tidak menyentuh DB/network, supaya bisa di-test langsung.
 * Melindungi server dari menyimpan subscription palsu / berbahaya yang
 * kemudian dipakai untuk mengirim notifikasi ke endpoint yang kita tidak
 * kontrol.
 */
import type { PushSubscription } from 'web-push';

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

export interface ValidPushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Validasi bentuk subscription yang dikirim browser.
 *
 * - `endpoint` WAJIB https:// (menolak http:, data:, javascript:, dll).
 * - `p256dh` & `auth` WAJIB base64url (Spn set karakter aman).
 *
 * @returns subscription yang sudah dibersihkan, atau null kalau tidak valid.
 */
export function validPushSubscription(
  body: Record<string, unknown>
): ValidPushSubscriptionInput | null {
  const endpoint = body.endpoint;
  const p256dh = body.p256dh;
  const auth = body.auth;

  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return null;
  }
  if (!/^https:\/\//.test(endpoint)) return null;
  if (!BASE64URL_RE.test(p256dh) || !BASE64URL_RE.test(auth)) return null;
  // Panjang wajar: kunci p256dh (ELLIPTIC x9.62) 65 byte → 87 base64url,
  // auth 16 byte → 22 base64url. Beri margin besar untuk defensif.
  if (p256dh.length < 20 || p256dh.length > 256) return null;
  if (auth.length < 16 || auth.length > 64) return null;

  return { endpoint, p256dh, auth };
}

/** Konversi bentuk input ke bentuk yang diterima web-push. */
export function toWebPushSubscription(
  sub: ValidPushSubscriptionInput
): PushSubscription {
  return {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
}