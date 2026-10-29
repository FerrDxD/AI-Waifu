/**
 * Pergantian karakter aktif — lapisan DB (M8.2 Phase B).
 *
 * `userProfiles` hanya menyimpan kondisi karakter AKTIF (afeksi, statistik,
 * koper, outfit, blob memori lama). Karakter yang tidak sedang aktif disimpan
 * sebagai snapshot di `characterProgress` dan ditukar dalam **satu transaksi**:
 *
 * 1. profil aktif saat ini → snapshot karakter lama (upsert)
 * 2. snapshot karakter baru → profil (atau default kalau belum pernah dimainkan)
 * 3. `activeCharacterId` ditulis
 *
 * Konsekuensinya: progres tiap karakter benar-benar terpisah — afeksi, memori
 * (chatMessages/memoryItems/messageSummaries dipartisi per `characterId`),
 * dan bab cerita. Sistem shared (uang, model AI, API key, layar) tidak ikut.
 *
 * Karakter yang tidak dikenal (dihapus dari registry setelah user pernah
 * memilih) ditolak saat beralih, tapi `getActiveCharacter` fail-closed ke
 * Livia supaya aplikasi tidak pecah.
 */
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { characterProgress, userProfiles } from '@/lib/db/schema';
import { errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { characters, getCharacter, type Character } from './registry';

export interface CharacterOption {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  /** Path sprite untuk preview (ekspresi normal). */
  previewSprite: string;
}

export interface CharacterChoice {
  /** Karakter aktif saat ini. */
  characterId: string;
  /** Karakter yang bisa dipilih (beserta yang aktif). */
  characters: CharacterOption[];
}

function toOption(character: Character): CharacterOption {
  return {
    id: character.id,
    name: character.name,
    shortName: character.shortName,
    tagline: character.tagline,
    previewSprite: `/${character.sprite.folder}/${character.sprite.defaultExpression}.webp`,
  };
}

/** Karakter yang sedang aktif untuk user ini (fail-closed ke Livia). */
export async function getActiveCharacter(userId: string): Promise<Character> {
  const rows = await db
    .select({ activeCharacterId: userProfiles.activeCharacterId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  return getCharacter(rows[0]?.activeCharacterId ?? null);
}

/** Karakter aktif + daftar pilihan untuk UI settings/pemilih karakter. */
export async function getCharacterChoice(userId: string): Promise<CharacterChoice> {
  const active = await getActiveCharacter(userId);
  return {
    characterId: active.id,
    characters: characters.map(toOption),
  };
}

type ProfileRow = typeof userProfiles.$inferSelect;

function snapshotFromProfile(profile: ProfileRow) {
  return {
    affection: profile.affection ?? 0,
    affectionLevel: profile.affectionLevel ?? 0,
    activeOutfit: profile.activeOutfit ?? 'default',
    itemsBrought: profile.itemsBrought,
    activeDebuffs: profile.activeDebuffs,
    activeBuffs: profile.activeBuffs,
    hunger: profile.liviaHunger ?? 100,
    energy: profile.liviaEnergy ?? 100,
    hydration: profile.liviaHydration ?? 100,
    cycleAnchor: profile.liviaCycleAnchor,
    statsUpdatedAt: profile.liviaStatsUpdatedAt,
    longTermMemory: profile.longTermMemory ?? '',
  };
}

/**
 * Pindah karakter aktif. Melempar `INVALID_CHARACTER` (400) kalau id tidak
 * ada di registry — berbeda dari `getCharacter` yang fail-closed, karena
 * sebuah *pilihan* tidak boleh diam-diam lebih dari yang dilihat user.
 */
export async function switchActiveCharacter(
  userId: string,
  nextCharacterId: string
): Promise<CharacterChoice> {
  const candidate = characters.find(character => character.id === nextCharacterId);
  if (!candidate) {
    throw errors.badRequest(
      'Karakter itu tidak tersedia. Pilih dari daftar yang ada.',
      'INVALID_CHARACTER'
    );
  }

  const result = await db.transaction(async tx => {
    const profileRows = await tx
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    const profile = profileRows[0];
    if (!profile) throw errors.notFound('Profil');

    const currentId = profile.activeCharacterId ?? 'livia';
    if (currentId === candidate.id) {
      return { characterId: candidate.id };
    }

    // 1. Profil aktif → snapshot karakter yang ditinggalkan.
    const snapshot = snapshotFromProfile(profile);
    await tx
      .insert(characterProgress)
      .values({ userId, characterId: currentId, ...snapshot, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [characterProgress.userId, characterProgress.characterId],
        set: { ...snapshot, updatedAt: new Date() },
      });

    // 2. Snapshot karakter tujuan → profil (atau kondisi awal default).
    const nextRows = await tx
      .select()
      .from(characterProgress)
      .where(
        and(
          eq(characterProgress.userId, userId),
          eq(characterProgress.characterId, candidate.id)
        )
      );
    const next = nextRows[0];

    await tx
      .update(userProfiles)
      .set({
        activeCharacterId: candidate.id,
        affection: next?.affection ?? 0,
        affectionLevel: next?.affectionLevel ?? 0,
        activeOutfit: next?.activeOutfit ?? 'default',
        itemsBrought: next?.itemsBrought ?? null,
        activeDebuffs: next?.activeDebuffs ?? null,
        activeBuffs: next?.activeBuffs ?? null,
        liviaHunger: next?.hunger ?? 100,
        liviaEnergy: next?.energy ?? 100,
        liviaHydration: next?.hydration ?? 100,
        liviaCycleAnchor: next?.cycleAnchor ?? null,
        liviaStatsUpdatedAt: next?.statsUpdatedAt ?? null,
        longTermMemory: next?.longTermMemory ?? '',
        lastSeen: new Date(),
      })
      .where(eq(userProfiles.userId, userId));

    // Snapshot karakter yang baru saja dimuat boleh dihapus: nilainya sudah
    // hidup di profil, dan akan dipotret lagi saat user berganti keluar.
    if (next) {
      await tx
        .delete(characterProgress)
        .where(
          and(
            eq(characterProgress.userId, userId),
            eq(characterProgress.characterId, candidate.id)
          )
        );
    }

    logger.info('character.switched', { userId, from: currentId, to: candidate.id });
    return { characterId: candidate.id };
  });

  return getCharacterChoice(userId).then(choice => ({
    ...choice,
    characterId: result.characterId,
  }));
}
