import { NextResponse } from 'next/server';
import { generateLiviaResponse } from '@/lib/gemini';
import { aiRateLimit, aiDailyQuota } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateChatMessage } from '@/lib/validation';
import { loadChatTurnContext, persistChatTurn, statsFromContext } from '@/lib/livia/chat-turn';
import { maybeSummarizeChats } from '@/lib/livia/summary';
import { buildToolContext } from '@/lib/tools/context';
import { executeToolCalls } from '@/lib/tools/execute';

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

    // M8.3: muat data reminder & belanja untuk konteks prompt. Fail-open —
    // kalau query gagal, chat tetap jalan tanpa blok itu.
    const toolContext = await buildToolContext(userId).catch(() => ({
      lines: [] as string[],
      overdueCount: 0,
    }));

    const result = await generateLiviaResponse(
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
      ctx.model,
      toolContext
    );

    let reply = result.reply;
    const { affectionDelta, expression, memories, memoryUpdate, tools, crisis } = result;

    // M8.3: eksekusi tool yang diminta Livia. Hasilnya disisipkan sebagai
    // baris konfirmasi faktual ke reply (satu putaran LLM).
    let executedLines: string[] = [];
    if (tools && tools.length > 0) {
      executedLines = await executeToolCalls(tools, { userId });
      if (executedLines.length > 0) {
        const separator = reply.endsWith('.') || reply.endsWith('!') || reply.endsWith('?') ? ' ' : '. ';
        reply = reply + separator + executedLines.join(' ');
      }
    }

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
      // M8.3: jumlah tool yang berhasil dijalankan di turn ini.
      toolsExecuted: executedLines.length,
    });
  }
);
