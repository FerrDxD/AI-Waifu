import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userProfiles } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Cek user yang sudah ada
    const existingUsers = await db.select().from(users).where(
      or(eq(users.email, email), eq(users.username, username))
    );

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user baru
    const insertedUsers = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      provider: 'credentials'
    }).returning();

    const newUser = insertedUsers[0];

    // Buat profile untuk user baru
    await db.insert(userProfiles).values({
      userId: newUser.id
    });

    return NextResponse.json({ success: true, message: 'Registrasi berhasil' }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
