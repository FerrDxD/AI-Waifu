import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { apiHandler } from '@/lib/api-handler';
import { mutationRateLimit } from '@/lib/rate-limit';

export const POST = apiHandler(
  {
    route: '/api/bedroom/sleep.POST',
    rateLimit: mutationRateLimit,
    rateLimitMessage: 'Terlalu banyak permintaan. Tunggu sebentar ya.',
  },
  async ({ userId }) => {
    // Bangun tidur: energi Livia penuh.
    await db
      .update(userProfiles)
      .set({ liviaEnergy: 100, liviaStatsUpdatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({ success: true, liviaEnergy: 100 });
  }
);
