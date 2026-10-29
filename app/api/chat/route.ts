import { NextResponse } from 'next/server';
import { generateLiviaResponse } from '@/lib/gemini';
import { aiRateLimit, aiDailyQuota } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateChatMessage } from '@/lib/validation';
import { loadChatTurnContext, persistChatTurn, statsFromContext } from '@/lib/livia/chat-turn';
import { maybeSummarizeChats } from '@/lib/livia/summary';

export const POST = apiHandler(
  {
    route: '/api/chat.POST',
    rateLimit: aiRateLimit,
    rateLimitKey: ({ userId }) => `chat_${userId}`,
    rateLimitMessage: 'Terlalu banyak pesan. Tunggu sebentar ya.',
  },
  async ({ userId, req }) => {
    // Pengaman biaya: kuota harian per user.
    const daily = await aiDailyQuota.limit(`chat_${userId}`);
    if (!daily.success) {
      logger.warn('chat.daily_quota_exhausted', { route: '/api/chat.POST', userId });
      throw errors.tooManyRequests(
        'Kuota obrolan harianmu sudah habis. Lanjut lagi besok ya — Livia juga butuh istirahat.'
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    // H0.5: batas panjang + sanitasi, supaya prompt raksasa tidak sampai ke Gemini.
    const message = validateChatMessage(body?.message);
    const isVoiceCall = body?.isVoiceCall === true;

    const ctx = await loadChatTurnContext({ userId, req, isVoiceCall, message });

    const { reply, affectionDelta, expression, memories, memoryUpdate, crisis } =
      await generateLiviaResponse(
        message,
        ctx.chatHistory,
        ctx.profile.affection || 0,
        ctx.profile.itemsBrought || [],
        statsFromContext(ctx),
        isVoiceCall,
        ctx.memoryLines,
        ctx.customApiKey,
        ctx.language,
        ctx.highestChapter,
        ctx.earlierSummary,
        userId,
        ctx.model
      );

    const updateResult = await persistChatTurn(ctx, message, {
      reply,
      affectionDelta,
      expression,
      memories,
      memoryUpdate,
    });

    // M2.5: pemicu ringkasan bergulir. Fire-and-forget — ringkasan menelan
    // segalanya (diekan di dalamnya) supaya turn chat tidak bisa gagal.
    void maybeSummarizeChats(userId, ctx.customApiKey);

    return NextResponse.json({
      reply,
      expression,
      affectionDelta,
      newAffection: updateResult.newAffection,
      newLevel: updateResult.affectionLevel,
      unlockedChapter: updateResult.unlockedChapter,
      // M4.2: hanya ada kalau pesan user memicu deteksi krisis.
      crisis,
      // M7.4: ID baris Livia di DB (dipakai tombol feedback).
      messageId: updateResult.liviaMessageId,
    });
  }
);
