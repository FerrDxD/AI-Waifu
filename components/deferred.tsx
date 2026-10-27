'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';

type LazyComponentModule = { default: ComponentType<Record<never, never>> };

/**
 * Mount komponen global opsional (mis. QuestTracker) SETELAH browser idle, lewat
 * dynamic import — modulnya tidak masuk initial JS chunk. Dipakai untuk komponen
 * yang tidak dibutuhkan pada first paint (M5.7).
 *
 * PERINGATAN: state-nya menyimpan OBJEK MODUL, bukan fungsi komponennya.
 * `setX(fn)` dengan `fn` berupa fungsi akan diperlakukan React sebagai
 * "functional updater" (`fn(prevState)` dipanggil di tengah render), sehingga
 * hook komponen tereksekusi di fiber yang salah dan crash —
 * `TypeError: Cannot read properties of undefined (reading 'length')` di
 * `areHookInputsEqual` React 18. Insiden production 2026-10-27 (livia.qzz.io):
 * halaman hidup sebentar lalu "Application error" beberapa detik setelah load
 * (tepat saat requestIdleCallback memuat chunk QuestTracker).
 */
export function Deferred({
  loader,
}: {
  loader: () => Promise<LazyComponentModule>;
}) {
  const [mod, setMod] = useState<LazyComponentModule | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mount = () => {
      if (cancelled) return;
      loaderRef.current().then((m) => {
        if (!cancelled) setMod(m);
      }).catch(() => {});
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = (window as unknown as {
        requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number;
      }).requestIdleCallback(mount, { timeout: 2500 });
    } else {
      timer = setTimeout(mount, 500);
    }
    return () => {
      cancelled = true;
      if (idleHandle !== undefined && 'cancelIdleCallback' in window) {
        (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(idleHandle);
      }
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!mod) return null;
  const Comp = mod.default;
  return <Comp />;
}
