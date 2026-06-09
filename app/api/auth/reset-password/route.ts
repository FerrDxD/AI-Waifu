import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { action, identifier, newPassword } = await req.json();

    if (action === 'verify') {
      const existingUserResults = await db.select().from(users).where(or(eq(users.email, identifier), eq(users.username, identifier)));
      const existingUser = existingUserResults[0];

      if (!existingUser) {
        return NextResponse.json({ error: 'Email atau username tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'reset') {
      const existingUserResults = await db.select().from(users).where(or(eq(users.email, identifier), eq(users.username, identifier)));
      const existingUser = existingUserResults[0];

      if (!existingUser) {
        return NextResponse.json({ error: 'Email atau username tidak ditemukan' }, { status: 404 });
      }

      const hashedPassword = await hash(newPassword, 12);
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, existingUser.id));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
