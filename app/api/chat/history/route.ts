import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { apiHandler } from '@/lib/api-handler';

/**
 * GET /api/chat/history — 30 pesan terakhir.
 *
 * Sebelumnya route ini tidak punya try/catch sama sekali: error DB menjadi 500
 * mentah milik Next, tanpa log terstruktur dan tanpa pesan yang aman.
 */
export const GET = apiHandler({ route: '/api/chat/history.GET' }, async ({ userId }) => {
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(30);

  return NextResponse.json({ messages: messages.reverse() });
});
