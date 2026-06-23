import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storyProgress } from '@/lib/db/schema';

export async function GET() {
  try {
    const chapters = Array.from({length: 22}, (_, i) => i);
    // Since this is a dev/sandbox environment, just update all users
    await db.update(storyProgress).set({ unlockedChapters: chapters });
    return NextResponse.json({ success: true, message: "Unlocked all chapters" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
