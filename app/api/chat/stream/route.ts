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
import { buildToolContext } from '@/lib/tools/context';
import { executeToolCalls } from '@/lib/tools/execute';

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

    // M8.3: muat data reminder & belanja untuk konteks prompt. Fail-open —
    // kalau query gagal, chat tetap jalan tanpa blok itu.
    const toolContext = await buildToolContext(userId).catch(() => ({
      lines: [] as string[],
      overdueCount: 0,
    }));

    const reply = streamLiviaReply({
      userMessage: message,
      chatHistory: ctx.chatHistory,
      affectionLevel: ctx.profile.affection || 0,
      itemsBrought: ctx.profile.itemsBrought || [],
      stats: statsFromContext(ctx),
      isVoiceCall,
      memoryLines: ctx.memoryLines,
      customApiKey: ctx.customApiKey,
      language: ctx.language,
      highestChapter: ctx.highestChapter,
      earlierSummary: ctx.earlierSummary,
      userId,
      model: ctx.model,
      toolContext,
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

          // M8.3: eksekusi tool yang diminta Livia. Hasilnya disisipkan
          // sebagai baris konfirmasi faktual ke reply (satu putaran LLM).
          let toolsExecuted = 0;
          if (final.tools && final.tools.length > 0) {
            const lines = await executeToolCalls(final.tools, { userId });
            toolsExecuted = lines.length;
            if (lines.length > 0) {
              const separator = final.reply.endsWith('.') || final.reply.endsWith('!') || final.reply.endsWith('?') ? ' ' : '. ';
              final.reply = final.reply + separator + lines.join(' ');
            }
          }

          const update = await persistChatTurn(ctx, message, final);

          send({
            type: 'done',
            reply: final.reply,
            expression: final.expression,
            affectionDelta: final.affectionDelta,
            newAffection: update.newAffection,
            newLevel: update.affectionLevel,
            unlockedChapter: update.unlockedChapter,
            // M4.2: hanya terisi kalau deteksi krisis terpicu.
            crisis: final.crisis,
            // M7.4: ID baris Livia di DB — dipakai tombol feedback di client.
            messageId: update.liviaMessageId,
            // M8.3: jumlah tool yang berhasil dijalankan di turn ini.
            toolsExecuted,
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
