import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { apiHandler } from '@/lib/api-handler';
import { getUserFeedbackMap } from '@/lib/feedback';

/**
 * GET /api/chat/history — 30 pesan terakhir + rating feedback yang sudah ada.
 *
 * Sebelumnya route ini tidak punya try/catch sama sekali: error DB menjadi 500
 * mentah milik Next, tanpa log terstruktur dan tanpa pesan yang aman.
 *
 * `feedback` (M7.4): peta `{ [messageId]: 'up' | 'down' }` supaya tombol
 * baik/buruk di UI langsung menampilkan rating lama setelah reload, bukan
 * mulai dari kosong.
 */
export const GET = apiHandler({ route: '/api/chat/history.GET' }, async ({ userId }) => {
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(30);

  const ids = messages.map((m) => m.id);
  const feedback = await getUserFeedbackMap(userId, ids);

  return NextResponse.json({ messages: messages.reverse(), feedback });
});
