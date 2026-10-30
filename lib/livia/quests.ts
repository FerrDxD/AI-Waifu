/**
 * Quest harian — sisi client (M8.4).
 *
 * Server sekarang jadi otoritas penuh (`lib/livia/quests.server.ts` + tabel
 * `dailyQuests`). File ini hanya:
 *  - re-export katalog murni (`quests.pool.ts`) untuk UI & test, dan
 *  - `recordQuestAction` → kirim aksi ke server (fire-and-forget) + event
 *    lokal untuk refresh UI instan. Angka otoritatif tetap dari server.
 */
import { getTodayDateString } from './quests.pool';

export type { DailyQuest } from './quests.pool';
export { QUEST_POOL, getTodayDateString, getDailyQuests } from './quests.pool';

/**
 * Catat aksi (visit route / sentuh Livia). Dikirim ke server; kalau gagal
 * (offline/error), diam saja — server tetap otoritas. Event lokal dikirim
 * supaya UI yang menampilkan progress bisa refresh tanpa menunggu response.
 */
export function recordQuestAction(
  actionType: string,
  amount: number = 1,
  dateStr?: string
): Record<string, number> {
  if (typeof window === 'undefined') return {};

  const date = dateStr || getTodayDateString();

  // Fire-and-forget ke server.
  fetch('/api/quests/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: actionType, amount, date }),
  }).catch(() => {
    /* offline / error — abaikan */
  });

  // Event lokal untuk UI (nilai optimistik; server tetap sumber utama).
  const current: Record<string, number> = {};
  try {
    const saved = localStorage.getItem(`quest_progress_${date}`);
    if (saved) Object.assign(current, JSON.parse(saved));
  } catch {
    /* abaikan */
  }
  const nextVal = (current[actionType] || 0) + amount;
  const updated = { ...current, [actionType]: nextVal };

  try {
    localStorage.setItem(`quest_progress_${date}`, JSON.stringify(updated));
  } catch {
    /* abaikan */
  }

  window.dispatchEvent(
    new CustomEvent('daily_quests_updated', { detail: { date, progress: updated } })
  );
  return updated;
}
