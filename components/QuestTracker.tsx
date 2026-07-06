'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordQuestAction } from '@/lib/livia/quests';

export default function QuestTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    
    // Clean route name: "/radio" -> "radio", "/" -> "home", "/home" -> "home"
    const route = pathname.replace(/^\//, '').split('/')[0] || 'home';
    recordQuestAction(`visit_${route}`);
  }, [pathname]);

  return null;
}
