/**
 * Blok konteks tool untuk prompt chat (M8.3).
 *
 * Data reminder & belanja diambil dari DB (via `lib/tools/store.ts`) dan
 * disusun menjadi baris `- ...` yang disisipkan ke `buildChatReplyPrompt`.
 * Tujuannya: Livia "tahu" reminder aktif & daftar belanja tanpa harus query
 * tool — ia bisa menyebutkan reminder yang lewat saat user ngobrol lagi,
 * dan tidak menanyakan ulang barang yang sudah tercatat.
 */
import { listReminderContext, listShoppingItems } from './store';
import { formatDateTime } from './time';

export interface ToolContextBlock {
  /** Baris prompt siap pakai (kosong kalau tidak ada data). */
  lines: string[];
  /** Jumlah reminder yang sudah lewat waktunya (belum di-done). */
  overdueCount: number;
}

export async function buildToolContext(
  userId: string,
  opts: { now?: Date; offsetMinutes?: number } = {}
): Promise<ToolContextBlock> {
  const now = opts.now ?? new Date();
  const offsetMinutes = opts.offsetMinutes ?? 0;

  const { overdue, upcoming } = await listReminderContext(userId, now);
  const shopping = await listShoppingItems(userId);

  const lines: string[] = [];

  for (const r of overdue) {
    lines.push(`- REMINDER LEWAT (belum selesai): "${r.content}" — waktunya ${formatDateTime(r.remindAt, offsetMinutes)}.`);
  }
  for (const r of upcoming) {
    lines.push(`- REMINDER DATANG: "${r.content}" — ${formatDateTime(r.remindAt, offsetMinutes)}.`);
  }

  if (shopping.length > 0) {
    const items = shopping.map((s) => `${s.checked ? '[x]' : '[ ]'} ${s.name}`).join('; ');
    lines.push(`- DAFTAR BELANJA saat ini: ${items}.`);
  }

  return { lines, overdueCount: overdue.length };
}
