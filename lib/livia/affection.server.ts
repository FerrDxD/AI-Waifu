import { db } from '@/lib/db';
import { userProfiles, storyProgress } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getAffectionLevel, getUnlockedChapters } from './affection';
import { hasFeature, type Character } from '@/lib/characters/registry';

/**
 * Pastikan chapter yang sudah seharusnya terbuka (berdasarkan affection hasil)
 * benar-benar ada di `storyProgress`. IDempoten: menggabungkan ke set, bukan
 * menambah, jadi aman dipanggil dari jalur apa pun (atomic affection maupun
 * update profil majemuk). Mengembalikan daftar chapter yang dijamin terbuka.
 *
 * M8.2 Phase B: progres bab dipartisi per karakter; karakter tanpa konten
 * cerita (`features.story` false) tidak pernah menyentuh tabel ini.
 */
export async function ensureUnlockedChapters(
  userId: string,
  affection: number,
  character?: Character
): Promise<number[]> {
  const chapters = getUnlockedChapters(-1, affection);
  if (chapters.length === 0) return chapters;
  if (character && !hasFeature(character, 'story')) return chapters;
  const characterId = character?.id ?? 'livia';
  try {
    const storyResults = await db
      .select()
      .from(storyProgress)
      .where(
        and(eq(storyProgress.userId, userId), eq(storyProgress.characterId, characterId))
      );
    const story = storyResults[0];
    if (story) {
      const set = new Set(story.unlockedChapters || [0]);
      chapters.forEach((c) => set.add(c));
      await db
        .update(storyProgress)
        .set({ unlockedChapters: Array.from(set) })
        .where(
          and(eq(storyProgress.userId, userId), eq(storyProgress.characterId, characterId))
        );
    } else {
      await db.insert(storyProgress).values({
        userId,
        characterId,
        unlockedChapters: Array.from(new Set([0, ...chapters])),
      });
    }
  } catch (err) {
    console.error('Failed to update story progress on level up:', err);
  }
  return chapters;
}

/**
 * Perubahan afeksi ATOMIK (M5.4).
 *
 * Versi lama baca-lalu-tulis: `SELECT affection` → hitung → `UPDATE`. Dua PATCH
 * bersamaan (mis. mengelus + sentuh yang ter-debounce) bisa saling menimpa
 * hasil satu sama lain — update yang "hilang" itu. Di sini seluruh penjumlahan
 * + pembulatan ke [0,100] terjadi di SATU statement `UPDATE ... RETURNING`:
 * Postgres menjamin `affection + ?` dibaca & ditulis atomik per baris, jadi
 * update yang bersaing di-queue oleh lock baris, bukan ditimpa.
 *
 * `character` (opsional, M8.2 Phase B) menentukan partition bab cerita yang
 * ikut disinkronkan. Tidak diisi = Livia (perilaku lama).
 */
export async function applyAffectionAtomic(
  userId: string,
  delta: number,
  character?: Character
) {
  const updated = await db
    .update(userProfiles)
    .set({
      affection: sql`GREATEST(0, LEAST(100, ${userProfiles.affection} + ${delta}))`,
      lastSeen: new Date(),
    })
    .where(eq(userProfiles.userId, userId))
    .returning({ affection: userProfiles.affection });

  const row = updated[0];
  if (!row) return null;
  const newAffection = row.affection ?? 0;

  const levelInfo = getAffectionLevel(newAffection);
  const newChapters = await ensureUnlockedChapters(userId, newAffection, character);

  return {
    newAffection,
    affectionLevel: levelInfo.level,
    unlockedChapter: newChapters.length > 0 ? newChapters[newChapters.length - 1] : null,
    unlockedChapters: newChapters,
  };
}


