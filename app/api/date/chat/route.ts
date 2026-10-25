import { NextResponse } from 'next/server';
import { generateDateResponse, extractLanguage, resolveApiKey } from '@/lib/gemini';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { apiErrorResponse, errors } from '@/lib/errors';
import { aiRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
  validateChatMessage,
  validateDateLocation,
  validateHistory,
  sanitizeUserName,
} from '@/lib/validation';

export async function POST(req: Request) {
  let userId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) throw errors.unauthorized();
    userId = session.user.id;
    const uid = userId;

    const limit = await aiRateLimit.limit(`datechat_${uid}`);
    if (!limit.success) {
      return rateLimitResponse(limit, 'Terlalu banyak permintaan. Tunggu sebentar ya.');
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    // H0.5: semua input yang masuk prompt divalidasi & dibatasi.
    const location = validateDateLocation(body?.location);
    const message = validateChatMessage(body?.message);
    const history = validateHistory(body?.history);
    const userName = sanitizeUserName(session.user?.name);

    const language = extractLanguage(req);
    const customApiKey = await resolveApiKey(uid, req);

    const profileResults = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, uid));
    const profile = profileResults[0];

    const now = new Date();
    const anchor = profile?.liviaCycleAnchor ? new Date(profile.liviaCycleAnchor).getTime() : now.getTime();
    const daysDiff = Math.floor((now.getTime() - anchor) / (1000 * 60 * 60 * 24));
    const dayOfCycle = ((daysDiff % 28) + 28) % 28 + 1;
    let cyclePhase = 'Luteal';
    if (dayOfCycle <= 5) cyclePhase = 'Menstruasi';
    else if (dayOfCycle <= 14) cyclePhase = 'Folikuler';
    else if (dayOfCycle <= 17) cyclePhase = 'Ovulasi';

    const { reply, expression, affectionDelta, memoryUpdate } = await generateDateResponse(
      location,
      message,
      history,
      profile?.affection || 0,
      userName,
      {
        hunger: profile?.liviaHunger ?? 100,
        energy: profile?.liviaEnergy ?? 100,
        hydration: profile?.liviaHydration ?? 100,
        cyclePhase,
        cycleDay: dayOfCycle,
      },
      profile?.longTermMemory || undefined,
      customApiKey,
      language
    );

    let updateResult: {
      newAffection: number | null | undefined;
      affectionLevel?: number;
      unlockedChapter: number | null;
    } = { newAffection: profile?.affection, unlockedChapter: null };

    if (profile) {
      const updateData: Record<string, unknown> = { lastSeen: new Date() };

      if (memoryUpdate && memoryUpdate.trim() !== '') {
        const cleanFact = memoryUpdate.trim().replace(/^[-*•]\s*/, '');
        const existing = (profile.longTermMemory || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const factLine = `- ${cleanFact}`;
        if (!existing.some((f) => f.toLowerCase() === factLine.toLowerCase())) {
          existing.push(factLine);
          updateData.longTermMemory = existing.slice(-20).join('\n');
        }
      }

      if (affectionDelta !== 0) {
        updateResult = await applyAffectionUpdate(uid, profile.affection || 0, affectionDelta);
        updateData.affection = updateResult.newAffection;
        updateData.affectionLevel = updateResult.affectionLevel;
      }

      await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, uid));
    }

    return NextResponse.json({
      reply,
      expression,
      affectionDelta,
      newAffection: updateResult.newAffection,
      unlockedChapter: updateResult.unlockedChapter,
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'api/date/chat.POST', userId });
  }
}
