/**
 * Lapisan akses data untuk tool & route M8.3 (reminders + shoppingItems).
 *
 * Dipisah dari executor supaya test bisa mem-mock file kecil ini saja, tanpa
 * menyentuh `@/lib/db` global (pola yang sama dengan `lib/feedback`,
 * `lib/analytics/queries`).
 */
import { and, asc, eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reminders, shoppingItems } from '@/lib/db/schema';

export type ReminderRow = typeof reminders.$inferSelect;
export type ShoppingItemRow = typeof shoppingItems.$inferSelect;

export interface ReminderContext {
  /** Sudah lewat waktunya (masih status active). */
  overdue: ReminderRow[];
  /** Belum waktunya. */
  upcoming: ReminderRow[];
}

export async function listReminderContext(
  userId: string,
  now = new Date()
): Promise<ReminderContext> {
  const rows = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.status, 'active')))
    .orderBy(asc(reminders.remindAt))
    .limit(8);

  const overdue: ReminderRow[] = [];
  const upcoming: ReminderRow[] = [];
  for (const row of rows) {
    if (row.remindAt.getTime() <= now.getTime()) overdue.push(row);
    else upcoming.push(row);
  }
  return { overdue, upcoming };
}

export async function listReminders(userId: string): Promise<ReminderRow[]> {
  return db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy(desc(reminders.remindAt));
}

export async function insertReminder(
  userId: string,
  content: string,
  remindAt: Date
): Promise<ReminderRow> {
  const [row] = await db
    .insert(reminders)
    .values({ userId, content, remindAt })
    .returning();
  return row;
}

export async function updateReminderStatus(
  userId: string,
  id: string,
  status: 'active' | 'done' | 'cancelled'
): Promise<ReminderRow | null> {
  const [row] = await db
    .update(reminders)
    .set({ status })
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .returning();
  return row ?? null;
}

export async function listShoppingItems(userId: string): Promise<ShoppingItemRow[]> {
  return db
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.userId, userId))
    .orderBy(desc(shoppingItems.createdAt))
    .limit(50);
}

export async function insertShoppingItem(userId: string, name: string): Promise<ShoppingItemRow> {
  const [row] = await db
    .insert(shoppingItems)
    .values({ userId, name })
    .returning();
  return row;
}

export async function updateShoppingItemChecked(
  userId: string,
  id: string,
  checked: boolean
): Promise<ShoppingItemRow | null> {
  const [row] = await db
    .update(shoppingItems)
    .set({ checked })
    .where(and(eq(shoppingItems.id, id), eq(shoppingItems.userId, userId)))
    .returning();
  return row ?? null;
}
