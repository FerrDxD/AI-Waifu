import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatMessages, userProfiles, storyProgress } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateLiviaResponse } from '@/lib/gemini';
import { generatePersonalityContext } from '@/lib/livia/personality';
import { shouldUnlockChapter } from '@/lib/livia/affection';

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

    // Update affection
    const oldAffection = profile.affection || 0;
    const newAffection = Math.max(0, Math.min(100, oldAffection + affectionDelta));
    // ✅ FIX: Level calculation konsisten — max level 5
    const newLevel = newAffection >= 100 ? 5 : Math.floor(newAffection / 20);

    await db.update(userProfiles)
      .set({ 
        affection: newAffection, 
        affectionLevel: newLevel,
        lastSeen: new Date(),
      })
      .where(eq(userProfiles.userId, userId));

    // Unlock chapter check
    const unlockedChapter = shouldUnlockChapter(oldAffection, newAffection);
    if (unlockedChapter !== null) {
      const storyResults = await db.select().from(storyProgress).where(eq(storyProgress.userId, userId));
      const story = storyResults[0];
      if (story) {
        const chapters = new Set(story.unlockedChapters || []);
        chapters.add(unlockedChapter);
        await db.update(storyProgress)
          .set({ unlockedChapters: Array.from(chapters) })
          .where(eq(storyProgress.userId, userId));
      }
    }

    return NextResponse.json({
      reply,
      expression,
      affectionDelta,
      newAffection,
      newLevel,
      unlockedChapter: unlockedChapter ?? null
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}