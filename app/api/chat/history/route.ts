import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const messages = await db.select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, session.user.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(30);

  return NextResponse.json({ messages: messages.reverse() });
}