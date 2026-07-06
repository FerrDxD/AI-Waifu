'use client';

import { unlockAchievement } from '@/lib/achievements';
import { playSfx } from '@/lib/sfx';

export interface DailyStampData {
  lastLoginDate: string;
  streak: number;
  claimedDays: number[]; // 1 to 7
}

export const DAILY_REWARDS = [
  { day: 1, title: 'Hari ke-1', rewardText: '+100 Rv Uang Kos', rv: 100, icon: '💵' },
  { day: 2, title: 'Hari ke-2', rewardText: '+150 Rv & Afeksi +2%', rv: 150, icon: '💖' },
  { day: 3, title: 'Hari ke-3', rewardText: '+200 Rv & Permen Manis', rv: 200, icon: '🍬' },
  { day: 4, title: 'Hari ke-4', rewardText: '+250 Rv Uang Jajan', rv: 250, icon: '🪙' },
  { day: 5, title: 'Hari ke-5', rewardText: '+300 Rv Tiket Kencan', rv: 300, icon: '🎟️' },
  { day: 6, title: 'Hari ke-6', rewardText: '+400 Rv & Afeksi +5%', rv: 400, icon: '🌟' },
  { day: 7, title: 'Hari ke-7 (Grand Reward)', rewardText: '+777 Rv & Hadiah Spesial!', rv: 777, icon: '🎁' },
];

export function getDailyData(): DailyStampData {
  if (typeof window === 'undefined') return { lastLoginDate: '', streak: 0, claimedDays: [] };
  try {
    const saved = localStorage.getItem('daily_login_stamp');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return { lastLoginDate: '', streak: 0, claimedDays: [] };
}

export function checkDailyStatus(): { shouldShow: boolean; nextDay: number; streak: number; claimedDays: number[] } {
  const data = getDailyData();
  const today = new Date().toISOString().split('T')[0];

  if (data.lastLoginDate === today) {
    // Sudah klaim hari ini
    return { shouldShow: false, nextDay: data.claimedDays.length, streak: data.streak, claimedDays: data.claimedDays };
  }

  let nextDay = data.claimedDays.length + 1;
  if (nextDay > 7) {
    nextDay = 1; // Reset siklus baru
  }

  return { shouldShow: true, nextDay, streak: data.streak + 1, claimedDays: nextDay === 1 ? [] : data.claimedDays };
}

export async function claimDailyReward(day: number): Promise<DailyStampData> {
  const data = getDailyData();
  const today = new Date().toISOString().split('T')[0];

  let newClaimed = [...data.claimedDays];
  if (day === 1 && newClaimed.length >= 7) {
    newClaimed = [1];
  } else if (!newClaimed.includes(day)) {
    newClaimed.push(day);
  }

  const newData: DailyStampData = {
    lastLoginDate: today,
    streak: data.streak + 1,
    claimedDays: newClaimed
  };

  try {
    localStorage.setItem('daily_login_stamp', JSON.stringify(newData));
  } catch (e) {}

  // Tambah reward uang ke backend/lokal tanpa memblokir UI
  const rewardObj = DAILY_REWARDS.find(r => r.day === day);
  if (rewardObj && rewardObj.rv > 0) {
    fetch('/api/work', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ earnedRv: rewardObj.rv, jobId: `daily_stamp_day_${day}` }) 
    }).catch(() => {});
  }

  playSfx('coin');

  // Trigger achievement checks
  unlockAchievement('first_login');
  if (newData.streak >= 3) unlockAchievement('streak_3');
  if (newData.streak >= 7 || day === 7) unlockAchievement('streak_7');

  return newData;
}
