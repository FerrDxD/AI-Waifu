import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { screenTimeLogs, userProfiles } from '@/lib/db/schema';
import { jsonApiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';
import { errors } from '@/lib/errors';

type ScreenTimeBody = {
  action?: unknown;
  sessionId?: unknown;
};

export const POST = jsonApiHandler<ScreenTimeBody>(
  {
    route: '/api/screentime.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak permintaan pencatatan waktu. Tunggu sebentar ya.',
  },
  async ({ userId, body }) => {
    const now = new Date();

    if (body.action === 'start') {
      const inserted = await db
        .insert(screenTimeLogs)
        .values({
          userId,
          sessionStart: now,
          date: now.toISOString().split('T')[0],
        })
        .returning({ id: screenTimeLogs.id });

      return NextResponse.json({ sessionId: inserted[0].id });
    }

    if (body.action === 'end') {
      if (typeof body.sessionId !== 'string' || body.sessionId.length === 0) {
        throw errors.badRequest('sessionId wajib diisi.', 'INVALID_SESSION');
      }

      const logResults = await db
        .select()
        .from(screenTimeLogs)
        .where(
          and(eq(screenTimeLogs.id, body.sessionId), eq(screenTimeLogs.userId, userId))
        );
      const log = logResults[0];

      if (!log || !log.sessionStart) throw errors.notFound('Sesi');

      const profileResults = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId));
      const profile = profileResults[0];

      // Idempoten: sesi yang sudah ditutup tidak boleh menambah total dua kali.
      if (log.sessionEnd) {
        return NextResponse.json({
          totalToday: log.durationSeconds ?? 0,
          totalAllTime: profile?.totalScreenTime || 0,
        });
      }

      const durationSeconds = Math.max(
        0,
        Math.floor((now.getTime() - new Date(log.sessionStart).getTime()) / 1000)
      );

      await db
        .update(screenTimeLogs)
        .set({ sessionEnd: now, durationSeconds })
        .where(eq(screenTimeLogs.id, log.id));

      const newTotal = (profile?.totalScreenTime || 0) + durationSeconds;

      await db
        .update(userProfiles)
        .set({ totalScreenTime: newTotal })
        .where(eq(userProfiles.userId, userId));

      return NextResponse.json({ totalToday: durationSeconds, totalAllTime: newTotal });
    }

    throw errors.badRequest('Aksi tidak dikenal.', 'INVALID_ACTION');
  }
);
