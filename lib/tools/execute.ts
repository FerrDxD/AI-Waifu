/**
 * Executor tool M8.3.
 *
 * Murni per-tool: validasi zod → eksekusi via `lib/tools/store.ts` →
 * kembalikan `{ ok, message }`. Hasilnya disisipkan route sebagai baris
 * konfirmasi faktual di balasan Livia.
 *
 * Tool TIDAK boleh melempar ke route: kegagalan apa pun (skema, waktu tak
 * terbaca, error DB) menjadi `ok: false` dengan pesan yang aman — model
 * tetap bisa membalas in-character.
 */
import { logger } from '@/lib/logger';
import { TOOL_REGISTRY, type ToolName } from './registry';
import { parseRemindTime, formatDateTime } from './time';
import { insertReminder, insertShoppingItem, listShoppingItems } from './store';
import type { LiviaToolCall } from '@/lib/ai/schemas';

export interface ExecutableToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  /** Baris konfirmasi faktual untuk disisipkan ke reply. */
  message: string;
}

export interface ExecuteToolContext {
  userId: string;
  /** Offset zona waktu user dalam menit (JS convention). Default 0. */
  offsetMinutes?: number;
  /** Untuk test; default `new Date()`. */
  now?: Date;
}

/**
 * Jalankan semua panggilan tool dari satu balasan Livia (M8.3).
 *
 * Mengembalikan `{ lines, tools }`:
 * - `lines` hanya yang layak disisipkan ke reply:
 *   - sukses → baris `[✓] <pesan>`;
 *   - gagal karena butuh kejelasan (mis. waktu tak terbaca) → `[?] <pesan>`;
 *   - gagal internal → di-skip (di-log), jangan membebani reply user.
 * - `tools` = nama tool yang SUKSES (M8.4: dipakai untuk merekam quest).
 */
export async function executeToolCalls(
  calls: LiviaToolCall[],
  ctx: ExecuteToolContext
): Promise<{ lines: string[]; tools: string[] }> {
  const lines: string[] = [];
  const tools: string[] = [];

  for (const call of calls) {
    const result = await executeToolCall(
      { name: call.name, args: call.args },
      ctx
    );

    if (result.ok) {
      lines.push(`[✓] ${result.message}`);
      tools.push(call.name);
    } else if (result.message.includes('belum jelas')) {
      lines.push(`[?] ${result.message}`);
    } else {
      logger.warn('executeToolCalls.skipped', {
        userId: ctx.userId,
        tool: call.name,
        reason: result.message,
      });
    }
  }

  return { lines, tools };
}

export async function executeToolCall(
  call: ExecutableToolCall,
  ctx: ExecuteToolContext
): Promise<ToolResult> {
  const def = TOOL_REGISTRY.find((t) => t.name === call.name);
  if (!def) {
    return { ok: false, message: `Tool "${String(call.name)}" tidak dikenal.` };
  }

  const parsed = def.argsSchema.safeParse(call.args);
  if (!parsed.success) {
    return { ok: false, message: `Argumen tool "${call.name}" tidak valid.` };
  }

  const offsetMinutes = ctx.offsetMinutes ?? 0;

  try {
    switch (call.name as ToolName) {
      case 'create_reminder': {
        const { text, time } = parsed.data as { text: string; time: string };
        const remindAt = parseRemindTime(time, { now: ctx.now, offsetMinutes });
        if (!remindAt) {
          return {
            ok: false,
            message: `Waktu "${time}" belum jelas — tanya user jam berapa persisnya (mis. "jam 7 pagi").`,
          };
        }
        const row = await insertReminder(ctx.userId, text, remindAt);
        return {
          ok: true,
          message: `Pengingat dibuat: "${row.content}" untuk ${formatDateTime(remindAt, offsetMinutes)}.`,
        };
      }

      case 'add_shopping_item': {
        const { item } = parsed.data as { item: string };
        const row = await insertShoppingItem(ctx.userId, item);
        return {
          ok: true,
          message: `"${row.name}" ditambahkan ke daftar belanja.`,
        };
      }

      case 'list_shopping_items': {
        const rows = await listShoppingItems(ctx.userId);
        if (rows.length === 0) {
          return { ok: true, message: 'Daftar belanja kosong.' };
        }
        const lines = rows
          .map((r) => `${r.checked ? '[x]' : '[ ]'} ${r.name}`)
          .join('; ');
        return { ok: true, message: `Daftar belanja saat ini: ${lines}.` };
      }

      default:
        return { ok: false, message: 'Tool tidak dikenal.' };
    }
  } catch (error) {
    logger.error('executeToolCall.failed', {
      error,
      userId: ctx.userId,
      tool: call.name,
    });
    return { ok: false, message: 'Server gagal menjalankan tool itu, coba lagi ya.' };
  }
}
