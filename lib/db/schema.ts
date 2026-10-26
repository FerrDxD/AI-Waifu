import { pgTable, uuid, text, timestamp, boolean, integer, date, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique(),
  email: text('email').notNull().unique(),
  password: text('password'),
  name: text('name'),
  image: text('image'),
  provider: text('provider').notNull().default('credentials'),
  /**
   * Age gate (M4.1).
   *
   * Yang disimpan hanya WAKTU konfirmasi, bukan tanggal lahir: menyimpan DOB
   * berarti menyimpan PII baru yang tidak kita butuhkan. `null` = belum
   * dikonfirmasi → modal gate muncul dan blokir fitur AI.
   */
  ageConfirmedAt: timestamp('age_confirmed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userProfiles = pgTable('userProfiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  onboardingDone: boolean('onboarding_done').default(false),
  itemsBrought: text('items_brought').array(),
  activeDebuffs: text('active_debuffs').array(),
  activeBuffs: text('active_buffs').array(),
  affection: integer('affection').default(0),
  affectionLevel: integer('affection_level').default(0),
  activeOutfit: text('active_outfit').default('default'),
  money: integer('money').default(0),
  totalScreenTime: integer('total_screen_time').default(0),
  totalPomodoroSessions: integer('total_pomodoro_sessions').default(0),
  jobStats: jsonb('job_stats').default({}),
  liviaHunger: integer('livia_hunger').default(100),
  liviaEnergy: integer('livia_energy').default(100),
  liviaHydration: integer('livia_hydration').default(100),
  liviaCycleAnchor: timestamp('livia_cycle_anchor').defaultNow(),
  liviaStatsUpdatedAt: timestamp('livia_stats_updated_at').defaultNow(),
  longTermMemory: text('long_term_memory').default(''),
  lastSeen: timestamp('last_seen').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * API key milik user disimpan TERENKRIPSI di server (AES-256-GCM).
 * Tabel terpisah dari userProfiles agar data sensitif bisa dihapus / diaudit sendiri.
 * Key plaintext TIDAK PERNAH dikirim balik ke client.
 */
export const userApiKeys = pgTable('userApiKeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  provider: text('provider').notNull().default('gemini'),
  ciphertext: text('ciphertext').notNull(),
  iv: text('iv').notNull(),
  authTag: text('auth_tag').notNull(),
  keyHint: text('key_hint').notNull(), // 4 karakter terakhir, untuk ditampilkan ke user
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const chatMessages = pgTable('chatMessages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'user' | 'livia'
  content: text('content').notNull(),
  affectionDelta: integer('affection_delta').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Ringkasan bergulir percakapan lama (M2.5).
 *
 * Dulu context window = "30 pesan terakhir mentah". Akibatnya ingatan bentrok
 * dua arah: fakta dari awal kenalan keluar dari window dan Livia melupakan, sambil
 * 30 pesan itu sendiri menjaga biaya token tetap membengkak.
 *
 * Tabel ini menyimpan RINGKASAN (bukan teks mentah) atas rentang pesan lama.
 * `coveredCount` menjumlahkan berapa banyak pesan yang sudah dibahas supaya
 * summarizer tahu di mana dia berhenti tanpa harus membaca isi ringkasannya.
 */
export const messageSummaries = pgTable('messageSummaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  summary: text('summary').notNull(),
  /** Berapa banyak chatMessages yang tercakup oleh ringkasan ini. */
  coveredCount: integer('covered_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Memori berlapis Livia tentang user (M3).
 *
 * Sebelumnya seluruh memori hidup di satu kolom teks `userProfiles.longTermMemory`
 * yang dibaca apa adanya ke prompt dan dipotong `slice(-20)`. Akibatnya:
 *   - fakta lama hilang begitu 20 baris terlampaui,
 *   - semua fakta masuk prompt setiap turn (boros token),
 *   - user tidak bisa melihat/menghapus apa yang diingat.
 *
 * Sekarang satu fakta = satu baris. `type` membedakan bobotnya:
 *   - core     : identitas inti (nama panggilan, alergi) — tidak meluruh.
 *   - semantic : fakta stabil (hobi, pekerjaan, makanan favorit).
 *   - episodic : kejadian/rencana tertentu (janji Sabtu, kejadian lucu).
 *   - diary    : hasil "merenung" — padatan beberapa memori lama (M3.4).
 *
 * `decayScore` adalah snapshot 0–100 saat terakhir dihitung; nilai yang
 * dipakai untuk ranking selalu dihitung ulang dari `lastRecalledAt` supaya
 * tidak pernah basi. Kolom `longTermMemory` lama dibiarkan (dormant) supaya
 * migrasi bisa berjalan tanpa memutus versi lama.
 */
export const memoryItems = pgTable('memoryItems', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  /** 'core' | 'episodic' | 'semantic' | 'diary' */
  type: text('type').notNull(),
  content: text('content').notNull(),
  /** Keyakinan 0–100 bahwa fakta ini benar. */
  confidence: integer('confidence').notNull().default(60),
  /** Snapshot kekuatan memori 0–100 (dihitung ulang saat dibaca). */
  decayScore: integer('decay_score').notNull().default(100),
  createdAt: timestamp('created_at').defaultNow(),
  /** Terakhir kali memori ini masuk konteks — dasar perhitungan decay. */
  lastRecalledAt: timestamp('last_recalled_at'),
});

export const screenTimeLogs = pgTable('screenTimeLogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionStart: timestamp('session_start').notNull(),
  sessionEnd: timestamp('session_end'),
  durationSeconds: integer('duration_seconds').default(0),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pomodoroSessions = pgTable('pomodoroSessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  completedAt: timestamp('completed_at').notNull(),
  wasCompleted: boolean('was_completed').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const storyProgress = pgTable('storyProgress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  unlockedChapters: integer('unlocked_chapters').array().default(sql`ARRAY[0]::integer[]`),
  lastReadChapter: integer('last_read_chapter').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gardenPots = pgTable('gardenPots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  potIndex: integer('pot_index').notNull(), // 1 to 6
  plantId: text('plant_id'), // e.g. 'tomato', 'strawberry'
  stage: text('stage'), // 'seed', 'sprout', 'growing', 'harvest'
  hydration: integer('hydration').default(0),
  lastWateredAt: timestamp('last_watered_at'),
  plantedAt: timestamp('planted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Audit log peristiwa sensitif (M4.6).
 *
 * Tujuannya investigasi insiden, bukan analitik produk. Karena itu:
 *   - `userId` sengaja TIDAK di-cascade. Kalau user dihapus, jejak "akun ini
 *     pernah minta hapus data" harus tetap ada untuk membuktikan kepatuhan.
 *     Karena FK-nya tidak cascade, kolomnya dibuat nullable tanpa referensi.
 *   - Tidak pernah menyimpan isi pesan, email, atau IP mentah. Hanya aksi,
 *     hasil, dan metadata yang sudah dibersihkan pemanggil.
 *
 * Ini BUKAN log aplikasi (itu `lib/logger.ts`). Log aplikasi untuk debugging
 * dan boleh hilang; tabel ini untuk pertanggungjawaban dan harus tahan lama.
 */
export const auditEvents = pgTable('auditEvents', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Nullable: null berarti aksi anonim (login gagal sebelum identifikasi). */
  userId: uuid('user_id'),
  /** Nama aksi stabil, mis. `account.delete`, `data.export`, `apikey.save`. */
  action: text('action').notNull(),
  /** `success` | `failure` | `denied`. */
  outcome: text('outcome').notNull().default('success'),
  /** Konteks tambahan yang sudah dibersihkan (tanpa PII). */
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
