/**
 * Web Push — client side (M8.5).
 *
 * Bertugas:
 * - mendaftarkan `public/sw.js` (offline cache + push);
 * - subscribe/unsubscribe PushManager + sinkronkan ke server;
 * - menyediakan status untuk UI settings.
 */

export interface PushStatus {
  supported: boolean;
  registered: boolean;
  subscribed: boolean;
  enabled: boolean;
  permission: NotificationPermission | 'unsupported';
  error?: string;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Daftarkan service worker (jika belum). Mengembalikan registration / null. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

/** Ambil VAPID public key dari server. */
export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/vapid');
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Url);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Subscribe ke push (minta izin + VAPID + POST ke server). */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) return false;

  let subscription: PushSubscription;
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  } catch {
    // Sudah subscribe: ambil yang ada.
    const existing = await reg.pushManager.getSubscription();
    if (!existing) return false;
    subscription = existing;
  }

  const key = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');
  if (!key || !auth) return false;

  // Sinkronkan ke server.
  const payload = {
    endpoint: subscription.endpoint,
    p256dh: btoa(String.fromCharCode(...new Uint8Array(key))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    auth: btoa(String.fromCharCode(...new Uint8Array(auth))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  };

  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Unsubscribe & hapus dari server. */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

/** Kirim push pomodoro (fire-and-forget). */
export function notifyServerPomodoroDone(): void {
  if (!isPushSupported()) return;
  fetch('/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'pomodoro' }),
  }).catch(() => {});
}

/** Status push saat ini (untuk UI settings). */
export async function getPushStatus(): Promise<PushStatus> {
  const supported = isPushSupported();
  if (!supported) {
    return { supported: false, registered: false, subscribed: false, enabled: false, permission: 'unsupported' };
  }

  const registered = Boolean(navigator.serviceWorker.controller) || Boolean(await registerServiceWorker());

  let subscribed = false;
  let permission: NotificationPermission | 'unsupported' = 'unsupported';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    subscribed = Boolean(sub);
    permission = Notification.permission;
  } catch {
    permission = 'unsupported';
  }

  const enabled = registered && subscribed && permission === 'granted';
  return { supported, registered, subscribed, enabled, permission };
}
