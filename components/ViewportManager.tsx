'use client';

import { useEffect } from 'react';

export default function ViewportManager() {
  useEffect(() => {
    const handleOrientation = () => {
      let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
      }

      // Check if the device is likely a mobile/tablet device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile && window.matchMedia('(orientation: landscape)').matches) {
        // Force a wider layout width so desktop UI (md: classes) activates
        viewport.content = 'width=1024';
      } else {
        viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1';
      }
    };

    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    
    // Run once on mount
    handleOrientation();

    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  return null;
}
