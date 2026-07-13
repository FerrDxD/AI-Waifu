import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatMessages, userProfiles, storyProgress } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateLiviaResponse, extractCustomApiKey, extractLanguage } from '@/lib/gemini';
import { generatePersonalityContext } from '@/lib/livia/personality';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, isVoiceCall } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const customApiKey = extractCustomApiKey(req);
    const language = extractLanguage(req);
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

    const now = new Date();
    const anchor = profile.liviaCycleAnchor ? new Date(profile.liviaCycleAnchor).getTime() : now.getTime();
    const daysDiff = Math.floor((now.getTime() - anchor) / (1000 * 60 * 60 * 24));
    const dayOfCycle = (daysDiff % 28 + 28) % 28 + 1;
    let cyclePhase = 'Luteal';
    if (dayOfCycle <= 5) cyclePhase = 'Menstruasi';
    else if (dayOfCycle <= 14) cyclePhase = 'Folikuler';
    else if (dayOfCycle <= 17) cyclePhase = 'Ovulasi';

    const { reply, affectionDelta, expression, memoryUpdate } = await generateLiviaResponse(
      message,
      chatHistory,
      personalityContext,
      profile.affection || 0,
      profile.itemsBrought || [],
      { 
        hunger: profile.liviaHunger ?? 100, 
        energy: profile.liviaEnergy ?? 100, 
        hydration: profile.liviaHydration ?? 100, 
        cyclePhase, 
        cycleDay: dayOfCycle 
      },
      isVoiceCall,
      profile.longTermMemory || undefined,
      customApiKey,
      language
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
    
    // Update profil user (affection, lastSeen, dan memory)
    const updateData: any = { lastSeen: new Date() };
    if (memoryUpdate && memoryUpdate.trim() !== '') {
      updateData.longTermMemory = profile.longTermMemory ? profile.longTermMemory + '\n- ' + memoryUpdate : '- ' + memoryUpdate;
    }

    if (affectionDelta !== 0) {
      updateResult = await applyAffectionUpdate(userId, affectionDelta);
      // Jika ada affection update, kita tetap perlu update lastSeen dan memory
      await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, userId));
    } else {
      await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, userId));
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