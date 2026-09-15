import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatMessages, userProfiles, storyProgress } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateLiviaResponse, extractCustomApiKey, extractLanguage } from '@/lib/gemini';
import { generatePersonalityContext } from '@/lib/livia/personality';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';

import { aiRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limiter
    const { success } = await aiRateLimit.limit(`chat_${session.user.id}`);
    if (!success) {
      return NextResponse.json({ error: 'Terlalu banyak request, tunggu sebentar.' }, { status: 429 });
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

    // Fetch chatHistory (last 30 messages in room) — ambil SEBELUM simpan pesan baru
    const historyResults = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(30);

    // Reverse ke urutan kronologis
    const chatHistory = historyResults.reverse().map((msg: any) => ({
      role: msg.role as 'user' | 'livia',
      content: msg.content
    }));


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

    const updateData: any = { lastSeen: new Date() };

    // Update affection terlebih dahulu jika ada delta
    if (affectionDelta !== 0) {
      updateResult = await applyAffectionUpdate(userId, profile.affection || 0, affectionDelta);
      updateData.affection = updateResult.newAffection;
      updateData.affectionLevel = updateResult.affectionLevel;
    }

    // Update memory terstruktur & bebas duplikasi
    if (memoryUpdate && memoryUpdate.trim() !== '') {
      const cleanFact = memoryUpdate.trim().replace(/^[-*•]\s*/, '');
      const existing = (profile.longTermMemory || '').split('\n').map(s => s.trim()).filter(Boolean);
      const factLine = `- ${cleanFact}`;
      if (!existing.some(f => f.toLowerCase() === factLine.toLowerCase())) {
        existing.push(factLine);
        updateData.longTermMemory = existing.slice(-20).join('\n');
      }
    }
    await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, userId));


    return NextResponse.json({
      reply,
      expression,
      affectionDelta,
      newAffection: updateResult.newAffection,
      newLevel: updateResult.affectionLevel,
      unlockedChapter: updateResult.unlockedChapter
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}