import { NextResponse } from 'next/server';
import { apiHandler, jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';
import {
  listShoppingItems,
  insertShoppingItem,
  updateShoppingItemChecked,
} from '@/lib/tools/store';

/**
 * M8.3 — API daftar belanja.
 *
 * GET  /api/shopping  → daftar belanja user
 * POST /api/shopping  → { name }
 * PATCH /api/shopping → { id, checked }
 *
 * Jalur chat memakai executor tool (`lib/tools/execute.ts`) yang menyimpan
 * lewat fungsi store yang sama — tidak ada duplikasi logika.
 */

export const GET = apiHandler(
  { route: '/api/shopping.GET' },
  async ({ userId }) => {
    const rows = await listShoppingItems(userId);
    return NextResponse.json({ items: rows });
  }
);

type CreateShoppingBody = { name?: unknown };

export const POST = jsonApiHandler<CreateShoppingBody>(
  {
    route: '/api/shopping.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak aktivitas. Istirahat sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw errors.badRequest('Nama barang tidak boleh kosong.', 'INVALID_PAYLOAD');
    }
    const name = body.name.trim().slice(0, 100);
    const row = await insertShoppingItem(userId, name);
    return NextResponse.json({ item: row }, { status: 201 });
  }
);

type UpdateShoppingBody = { id?: unknown; checked?: unknown };

export const PATCH = jsonApiHandler<UpdateShoppingBody>(
  {
    route: '/api/shopping.PATCH',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak perubahan. Istirahat sebentar ya.',
  },
  async ({ userId, body }) => {
    if (typeof body.id !== 'string') {
      throw errors.badRequest('ID barang tidak valid.', 'INVALID_PAYLOAD');
    }
    if (typeof body.checked !== 'boolean') {
      throw errors.badRequest('Nilai checked harus boolean.', 'INVALID_PAYLOAD');
    }

    const row = await updateShoppingItemChecked(userId, body.id, body.checked);
    if (!row) throw errors.notFound('Barang');

    return NextResponse.json({ item: row });
  }
);
