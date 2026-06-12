import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatMessages, userProfiles, storyProgress } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateLiviaResponse } from '@/lib/gemini';
import { generatePersonalityContext } from '@/lib/livia/personality';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Fetch userProfile
    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    const profile = profileResults[0];
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch chatHistory (last 20) — ambil SEBELUM simpan pesan baru
    const historyResults = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(20);

    // Reverse ke chronological order
    const chatHistory = historyResults.reverse().map((msg: any) => ({
      role: msg.role as 'user' | 'livia',
      content: msg.content
    }));

    // ✅ FIX: Pastikan history selalu diakhiri dengan 'livia'
    // Kalau pesan terakhir adalah 'user', ada orphan message — buang
    while (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
      chatHistory.pop();
    }

    const personalityContext = generatePersonalityContext(profile.itemsBrought || []);

    const { reply, affectionDelta, expression } = await generateLiviaResponse(
      message,
      chatHistory,
      personalityContext,
      profile.affection || 0,
      profile.itemsBrought || []
    );

    // ✅ FIX: Simpan user message dan reply dalam satu transaksi
    await db.insert(chatMessages).values([
      {
        userId,
        role: 'user',
        content: message.trim(),
        affectionDelta: 0,
      },
      {
        userId,
        role: 'livia',
        content: reply,
        affectionDelta,
      }
    ]);

    let updateResult = { newAffection: profile.affection, affectionLevel: profile.affectionLevel, unlockedChapter: null as number | null };
    if (affectionDelta !== 0) {
      updateResult = await applyAffectionUpdate(userId, affectionDelta);
    } else {
      await db.update(userProfiles).set({ lastSeen: new Date() }).where(eq(userProfiles.userId, userId));
    }

    return NextResponse.json({
      reply,
      expression,
      affectionDelta,
      newAffection: updateResult.newAffection,
      newLevel: updateResult.affectionLevel,
      unlockedChapter: updateResult.unlockedChapter
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}