import { streamLiviaReply } from '@/lib/gemini';
import { aiRateLimit, aiDailyQuota } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { AppError, errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateChatMessage } from '@/lib/validation';
import {
  loadChatTurnContext,
  persistChatTurn,
  statsFromContext,
} from '@/lib/livia/chat-turn';
import { maybeSummarizeChats } from '@/lib/livia/summary';

type SseEvent = Record<string, unknown> & { type: string };

/**
 * `/api/chat/stream` (M2.1) — versi streaming dari `/api/chat`.
 *
 * Protokol: Server-Sent Events. Event yang dikirim:
 *   {type:'delta', text}  potongan teks balasan (bisa berkali-kali)
 *   {type:'done', reply, affectionDelta, expression, newAffection, newLevel, unlockedChapter}
 *   {type:'error', code, message}
 *
 * Kenapa bukan WebSocket: hanya butuh aliran satu arah server→client, dan SSE
 * tidak menambah infrastruktur (PROXY/CDN umum sudah mendukung).
 */
export const POST = apiHandler(
  {
    route: '/api/chat/stream.POST',
    rateLimit: aiRateLimit,
    rateLimitKey: ({ userId }) => `chat_${userId}`,
    rateLimitMessage: 'Terlalu banyak pesan. Tunggu sebentar ya.',
  },
  async ({ userId, req }) => {
    // Sama persis dengan /api/chat: kuota dilakukan SEBELUM stream dibuka,
    // supaya user yang habis kuota tidak menerima event setengah jalan.
    const daily = await aiDailyQuota.limit(`chat_${userId}`);
    if (!daily.success) {
      logger.warn('chatstream.daily_quota_exhausted', { userId });
      throw errors.tooManyRequests(
        'Kuota obrolan harianmu sudah habis. Lanjut lagi besok ya — Livia juga butuh istirahat.'
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const message = validateChatMessage(body?.message);
    const isVoiceCall = body?.isVoiceCall === true;

    const ctx = await loadChatTurnContext({ userId, req, isVoiceCall, message });

    const reply = streamLiviaReply({
      userMessage: message,
      chatHistory: ctx.chatHistory,
      affectionLevel: ctx.profile.affection || 0,
      itemsBrought: ctx.profile.itemsBrought || [],
      stats: statsFromContext(ctx),
      isVoiceCall,
      longTermMemory: ctx.profile.longTermMemory || undefined,
      customApiKey: ctx.customApiKey,
      language: ctx.language,
      highestChapter: ctx.highestChapter,
      earlierSummary: ctx.earlierSummary,
    });

    const encoder = new TextEncoder();

    const sse = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: SseEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            // Client sudah pergi (tab ditutup) — sudut mati normal di SSE.
          }
        };

        try {
          for await (const delta of reply.deltas) {
            send({ type: 'delta', text: delta });
          }

          const final = await reply.final;
          const update = await persistChatTurn(ctx, message, final);

          send({
            type: 'done',
            reply: final.reply,
            expression: final.expression,
            affectionDelta: final.affectionDelta,
            newAffection: update.newAffection,
            newLevel: update.affectionLevel,
            unlockedChapter: update.unlockedChapter,
          });

          // M2.5: pemicu ringkasan bergulir. Satu `done` = satu turn tersimpan,
          // jadi ini titik aman. Sloppy error sudah ditelan di dalam; kalau
          // proses mati sebelum selesai, giliran berikutnya menjalankannya lagi.
          void maybeSummarizeChats(userId, ctx.customApiKey);
        } catch (error) {
          if (error instanceof AppError) {
            logger.warn('chatstream.failed', { code: error.code, userId });
            send({ type: 'error', code: error.code, message: error.message });
          } else {
            logger.error('chatstream.unexpected', {
              error: error instanceof Error ? error.message : String(error),
              userId,
            });
            send({
              type: 'error',
              code: 'AI_GENERATION_FAILED',
              message: 'Gagal menghubungi server AI Google.',
            });
          }
        } finally {
          try {
            controller.close();
          } catch {
            // Sudah ditutup — tidak penting.
          }
        }
      },
    });

    return new Response(sse, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // Beberapa proxy menampung SSE sampai buffer penuh; header ini yang
        // dibaca nginx untuk mematikan buffering itu.
        'X-Accel-Buffering': 'no',
      },
    });
  }
);
