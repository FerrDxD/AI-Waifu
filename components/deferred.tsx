'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';

/**
 * Mount komponen global opsional (mis. QuestTracker) SETELAH browser idle, lewat
 * dynamic import — modulnya tidak masuk initial JS chunk. Dipakai untuk komponen
 * yang tidak dibutuhkan pada first paint (M5.7).
 */
export function Deferred({
  loader,
}: {
  loader: () => Promise<{ default: ComponentType<Record<never, never>> }>;
}) {
  const [Comp, setComp] = useState<ComponentType<Record<never, never>> | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mount = () => {
      if (cancelled) return;
      loaderRef.current().then((mod) => {
        if (!cancelled) setComp(mod.default);
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

  return Comp ? <Comp /> : null;
}
