'use client';

import { useEffect } from 'react';
import { registerServiceWorker, subscribeToPush } from '@/lib/push/push-client';

/**
 * Provider PWA (M8.5).
 *
 * - Mendaftarkan service worker (offline cache + push) saat app dibuka.
 * - Jika user PERNAH memberi izin notifikasi & punya subscription di browser,
 *   sinkronkan ulang ke server (upsert) tanpa meminta izin lagi.
 *
 * Tidak pernah meminta izin notifikasi sendiri — itu hanya dari UI settings
 * (toggle), supaya tidak muncul prompt mendadak.
 */
export default function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const registered = await registerServiceWorker();
      if (cancelled || !registered) return;

      // Restore subscription hanya kalau izin sudah granted (tidak meminta).
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        await subscribeToPush();
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
