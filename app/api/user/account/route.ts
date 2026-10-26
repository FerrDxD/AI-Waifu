import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { errors } from '@/lib/errors';
import { mutationRateLimit } from '@/lib/rate-limit';
import { deleteUserAccount } from '@/lib/safety/data-control.server';
import { isDeleteConfirmationValid, DELETE_ACCOUNT_PHRASE } from '@/lib/safety/data-control';
import { recordAuditEvent } from '@/lib/safety/audit';
import { logger } from '@/lib/logger';

/**
 * Hapus akun & seluruh data (M4.4).
 *
 * `DELETE /api/user/account` dengan body `{ confirm: "HAPUS AKUN SAYA" }`.
 *
 * Kenapa frasa konfirmasi diperiksa DI SERVER: ini satu-satunya rem antara
 * klik tidak sengaja (atau skrip yang salah) dan kehilangan permanen. Kalau
 * pemeriksaannya hanya di UI, siapa pun yang memanggil endpoint langsung
 * melewatinya.
 *
 * Kenapa hard delete: user meminta datanya hilang. Soft delete yang bisa
 * dipulihkan diam-diam adalah kebohongan, dan menyimpan data yang diminta
 * dihapus justru melanggar prinsip yang fitur ini janjikan.
 *
 * Catatan: audit `account.delete` ditulis SETELAH penghapusan, dengan
 * `userId` masih diisi. Kolom `auditEvents.user_id` sengaja tanpa FK cascade,
 * jadi baris auditnya tetap ada meski baris `users`-nya sudah tidak ada.
 */

const ROUTE = '/api/user/account';

type DeleteBody = { confirm?: unknown };

export const DELETE = jsonApiHandler<DeleteBody>(
  {
    route: `${ROUTE}.DELETE`,
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak percobaan. Coba lagi nanti.',
  },
  async ({ userId, body }) => {
    if (!isDeleteConfirmationValid(body?.confirm)) {
      throw errors.badRequest(
        `Ketik "${DELETE_ACCOUNT_PHRASE}" untuk mengonfirmasi penghapusan akun.`,
        'CONFIRMATION_REQUIRED'
      );
    }

    // Catat niat SEBELUM eksekusi: kalau penghapusan gagal di tengah jalan,
    // percobaannya tetap terlacak.
    await recordAuditEvent({
      userId,
      action: 'account.delete',
      outcome: 'success',
      metadata: { route: `${ROUTE}.DELETE`, reason: 'user_requested' },
    });

    const result = await deleteUserAccount(userId);

    if (!result.ok) {
      // Akun tidak ditemukan (sudah terhapus / sesi basi). Tidak melempar 500:
      // tujuan user sudah tercapai — akunnya memang tidak ada.
      logger.warn('account.delete_noop', { userId });
      return NextResponse.json({ deleted: false }, { status: 200 });
    }

    logger.info('account.delete_success', {
      userId,
      deletedChats: result.deletedChats,
      deletedMemories: result.deletedMemories,
    });

    return NextResponse.json({
      deleted: true,
      removed: {
        chats: result.deletedChats,
        memories: result.deletedMemories,
      },
    });
  }
);

/**
 * Info prasyarat hapus akun.
 *
 * `GET` dipakai UI untuk menampilkan frasa konfirmasi & memastikan user masih
 * terautentikasi sebelum menampilkan tombol berbahaya.
 */
export const GET = apiHandler({ route: `${ROUTE}.GET` }, async ({ userId }) => {
  const rows = await db
    .select({ provider: users.provider, username: users.username })
    .from(users)
    .where(eq(users.id, userId));

  const account = rows[0];
  if (!account) throw errors.notFound('Akun');

  return NextResponse.json(
    {
      confirmationPhrase: DELETE_ACCOUNT_PHRASE,
      provider: account.provider,
      username: account.username,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
});
