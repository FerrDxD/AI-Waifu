/**
 * Feedback rating balasan Livia (M7.4).
 *
 * Tombol baik/buruk di UI chat ditulis ke `chatFeedback` (1 baris per user per
 * pesan, re-rating = upsert). Baris-barisnya adalah MATERIAL MENTAH untuk eval
 * loop (M7.3): owner meninjaunya di dashboard `/feedback` lalu menyalin yang
 * cocok menjadi skenario kurasi di `evals/dataset.ts`.
 *
 * Sengaja human-in-the-loop, bukan otomatis: pesan user mentah boleh berisi
 * PII atau percobaan injeksi — tidak boleh masuk dataset eval tanpa kurasi.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { chatFeedback, chatMessages, users } from '@/lib/db/schema';

export type ChatRating = 'up' | 'down';
export const CHAT_RATINGS: readonly ChatRating[] = ['up', 'down'];

// --- Kueri (lapisan DB — diverifikasi migrasi/drift/test route, bukan unit) ---

/**
 * Simpan/ubah rating user untuk satu pesan.
 *
 * Return: rating efektif, atau `null` kalau pesan tidak ada ATAU bukan milik
 * user — route memetakan keduanya ke 404 yang sama (keberadaan pesan orang
 * lain tidak boleh bocor sebagai 403).
 */
export async function saveChatRating(
  userId: string,
  messageId: string,
  rating: ChatRating
): Promise<ChatRating | null> {
  const owned = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)));
  if (owned.length === 0) return null;

  await db
    .insert(chatFeedback)
    .values({ userId, messageId, rating })
    .onConflictDoUpdate({
      target: [chatFeedback.userId, chatFeedback.messageId],
      set: { rating },
    });
  return rating;
}

/** Peta rating milik user untuk daftar pesan (UI chat setelah reload). */
export async function getUserFeedbackMap(
  userId: string,
  messageIds: string[]
): Promise<Record<string, ChatRating>> {
  if (messageIds.length === 0) return {};
  const rows = await db
    .select({ messageId: chatFeedback.messageId, rating: chatFeedback.rating })
    .from(chatFeedback)
    .where(and(eq(chatFeedback.userId, userId), inArray(chatFeedback.messageId, messageIds)));

  const out: Record<string, ChatRating> = {};
  for (const r of rows) {
    if (r.rating === 'up' || r.rating === 'down') out[r.messageId] = r.rating;
  }
  return out;
}

export interface FeedbackRow {
  id: string;
  rating: ChatRating;
  createdAt: Date;
  /** Kolom `users.email` notNull (bisa string kosong untuk akun username-only). */
  email: string;
  liviaReply: string;
  /** Pesan user tepat sebelum balasan (null kalau pesan lama sudah di-prune). */
  userMessage: string | null;
}

/**
 * Baris feedback terbaru untuk dashboard owner `/feedback`.
 * Subquery skalar mengambil pesan user sebelum balasan dalam satu kueri —
 * tanpa N+1 per baris.
 */
export async function getFeedbackRows(limit = 200): Promise<FeedbackRow[]> {
  const rows = await db
    .select({
      id: chatFeedback.id,
      rating: chatFeedback.rating,
      createdAt: chatFeedback.createdAt,
      email: users.email,
      liviaReply: chatMessages.content,
      userMessage: sql<string | null>`(
        select m.content
        from "chatMessages" as m
        where m.user_id = ${chatFeedback.userId}
          and m.role = 'user'
          and m.created_at <= ${chatMessages.createdAt}
        order by m.created_at desc
        limit 1
      )`,
    })
    .from(chatFeedback)
    .innerJoin(chatMessages, eq(chatFeedback.messageId, chatMessages.id))
    .innerJoin(users, eq(chatFeedback.userId, users.id))
    .orderBy(desc(chatFeedback.createdAt))
    .limit(limit);

  return rows.filter((r): r is FeedbackRow => r.rating === 'up' || r.rating === 'down');
}

// --- Fungsi murni (di-unit-test) ---------------------------------------------

export interface FeedbackScenarioInput {
  rating: ChatRating;
  userMessage: string | null;
  liviaReply: string;
  /** ISO — hanya dipakai untuk label deskripsi. */
  createdAt: string;
}

const escapeTemplate = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

/**
 * Sketsa skenario eval dari satu baris feedback — bahan salin-tempel ke
 * `evals/dataset.ts`. Field yang TIDAK bisa diketahui dari baris feedback
 * (kategori, id unik, afeksi saat kejadian) diberi placeholder `GANTI:` —
 * kurasi memang kerja manusia, bukan otomatis.
 */
export function scenarioSnippet(input: FeedbackScenarioInput): string {
  const message = input.userMessage ?? '(tanpa konteks — pesan user sudah di-prune)';
  const label = input.rating === 'down' ? 'balasan buruk' : 'balasan baik';
  const action = input.rating === 'down' ? 'perbaiki perilaku ini' : 'pertahankan perilaku ini';
  return [
    's({',
    `  id: 'GANTI.kategori_subjek',`,
    `  category: 'GANTI', // memory | language | politeness | persona | structure | safety`,
    `  description: 'Feedback produksi ${label} (${input.createdAt.slice(0, 10)}) — ${action}',`,
    `  affection: 50, // GANTI: level afeksi saat kejadian`,
    `  language: 'id',`,
    `  message: \`${escapeTemplate(message)}\`,`,
    '  checks: [...BASE_PROMPT, ...REPLY_SAFE, /* GANTI: cek sesuai kategori */],',
    '}),',
  ].join('\n');
}
