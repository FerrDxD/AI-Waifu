'use client';

import { useState, useEffect } from 'react';

/**
 * Sprite NPC dengan double-buffering (M5.1, logika verbatim dari versi lama).
 *
 * Impor sprite baru untuk scene berikutnya dimuat di belakang layar dulu;
 * <img> sendiri baru berganti URL SETELAH preload selesai. Tanpa ini setiap
 * ganti ekspresi membuat sprite berkedip putih satu frame — di jalur cerita
 * yang berganti ekspresi setiap kalimat, kedipan itu terasa berantakan.
 */
export default function StoryNPCSprite({
  src,
  alt,
  fallbackSrc,
  className = '',
}: {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
}) {
  const [displayedSrc, setDisplayedSrc] = useState(src);

  useEffect(() => {
    if (src === displayedSrc) return;
    let active = true;
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      if (active) setDisplayedSrc(src);
    };
    img.onerror = () => {
      if (!active) return;
      if (fallbackSrc) setDisplayedSrc(fallbackSrc);
    };
    return () => {
      active = false;
    };
  }, [src, displayedSrc, fallbackSrc]);

  return (
    <img
      src={displayedSrc}
      alt={alt}
      decoding="async"
      className={`transition-opacity duration-150 ${className}`}
      onError={() => {
        if (fallbackSrc && displayedSrc !== fallbackSrc) {
          setDisplayedSrc(fallbackSrc);
        }
      }}
    />
  );
}
