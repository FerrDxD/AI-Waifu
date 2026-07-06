'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Selesaikan animasi progress bar saat rute atau query berubah
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || target.getAttribute('target') === '_blank') {
        return;
      }

      try {
        const targetUrl = new URL(target.href);
        const currentUrl = new URL(window.location.href);
        
        // Hanya picu jika berpindah ke halaman internal yang berbeda
        if (
          targetUrl.origin === currentUrl.origin &&
          (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search)
        ) {
          setIsNavigating(true);
          setProgress(20);
          
          // Simulasi progres berlari cepat agar UI terasa instan & responsif
          const interval = setInterval(() => {
            setProgress((prev) => {
              if (prev >= 85) {
                clearInterval(interval);
                return 85;
              }
              return prev + Math.floor(Math.random() * 12) + 8;
            });
          }, 150);

          const timeout = setTimeout(() => {
            clearInterval(interval);
            setIsNavigating(false);
            setProgress(0);
          }, 8000); // Safety fallback jika halaman terlalu lama compile di localhost
        }
      } catch (err) {}
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-1 md:h-1.5 z-[99999] pointer-events-none overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-[#ff758c] via-[#ff0844] to-[#ff758c] shadow-[0_0_12px_#ff758c,0_0_5px_#ff0844] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
