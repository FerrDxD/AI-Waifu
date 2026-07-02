'use client';

import { playSfx } from '@/lib/sfx';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardRv: number;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_login: {
    id: 'first_login',
    title: '🌱 Warga Kos Baru',
    description: 'Memulai hari pertamamu tinggal di kos bersama Livia.',
    icon: '🌱',
    rewardRv: 100
  },
  streak_3: {
    id: 'streak_3',
    title: '📅 Teman Setia',
    description: 'Rajin berkunjung dan login 3 hari berturut-turut.',
    icon: '📅',
    rewardRv: 200
  },
  streak_7: {
    id: 'streak_7',
    title: '💖 Pacar Idaman',
    description: 'Menyelesaikan 1 siklus penuh kalender login 7 hari!',
    icon: '💖',
    rewardRv: 500
  },
  rich_1000: {
    id: 'rich_1000',
    title: '💰 Sultan Kos',
    description: 'Mengumpulkan total uang hingga 1.000 Rv dari bekerja.',
    icon: '💰',
    rewardRv: 300
  },
  affection_50: {
    id: 'affection_50',
    title: '🥰 Makin Lengket',
    description: 'Mencapai tingkat afeksi Livia hingga 50% atau lebih.',
    icon: '🥰',
    rewardRv: 400
  },
  affection_80: {
    id: 'affection_80',
    title: '💍 Belahan Jiwa',
    description: 'Mencapai tingkat afeksi Livia hingga 80% atau lebih.',
    icon: '💍',
    rewardRv: 1000
  },
  work_first: {
    id: 'work_first',
    title: '💼 Gajian Pertama',
    description: 'Menyelesaikan mini-game pekerjaan pertamamu.',
    icon: '💼',
    rewardRv: 150
  },
  pomo_first: {
    id: 'pomo_first',
    title: '🎯 Fokus Bersama',
    description: 'Menyelesaikan sesi timer fokus Pomodoro pertamamu.',
    icon: '🎯',
    rewardRv: 150
  }
};

export function getUnlockedAchievements(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('unlocked_achievements');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function unlockAchievement(id: keyof typeof ACHIEVEMENTS) {
  if (typeof window === 'undefined') return;
  const achievement = ACHIEVEMENTS[id];
  if (!achievement) return;

  const unlocked = getUnlockedAchievements();
  if (unlocked.includes(id)) return; // Sudah pernah dapat

  unlocked.push(id);
  try {
    localStorage.setItem('unlocked_achievements', JSON.stringify(unlocked));
  } catch (e) {}

  // Tambahkan reward uang secara lokal/server jika ada
  if (achievement.rewardRv > 0) {
    fetch('/api/work', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ earnedRv: achievement.rewardRv, jobId: 'achievement_reward' }) 
    }).catch(() => {});
  }

  // Putar suara bahagia
  playSfx('chime');

  // Trigger event agar komponen Toast menangkapnya
  window.dispatchEvent(new CustomEvent('achievement_unlocked', { detail: achievement }));
}
