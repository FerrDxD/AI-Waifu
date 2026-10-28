import { pgTable, uuid, text, timestamp, boolean, integer, date, jsonb, index, customType, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Kolom `bytea` (M6.4). drizzle-orm 0.30 belum punya kolom bytea bawaan —
 * `customType` dengan mapping identitas (driver neon-http mengembalikan
 * `Buffer` untuk bytea; normalisasi defensive ada di `lib/tts/cache.ts`).
 */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

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
}, (table) => ({
  /** M5.3: akses riwayat selalu per-user + urut waktu terbaru dulu. */
  chatUserCreatedAt: index('idx_chat_user_created_at').on(table.userId, table.createdAt).desc(),
}));

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
}, (table) => ({
  /** M5.3: ranking memori = per-user, urut yang paling baru diingat dulu. */
  memoriesUserRecalled: index('idx_memories_user_last_recalled').on(table.userId, table.lastRecalledAt),
}));

export const screenTimeLogs = pgTable('screenTimeLogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionStart: timestamp('session_start').notNull(),
  sessionEnd: timestamp('session_end'),
  durationSeconds: integer('duration_seconds').default(0),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  /** M5.3: total harian per user (SUM group by user+date) + laporan bulanan. */
  screentimeUserDate: index('idx_screentime_user_date').on(table.userId, table.date),
}));

export const pomodoroSessions = pgTable('pomodoroSessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  completedAt: timestamp('completed_at').notNull(),
  wasCompleted: boolean('was_completed').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  /** M5.3: rangkuman pomodoro = per-user, urut selesai terbaru (statistik). */
  pomodoroUserCompleted: index('idx_pomodoro_user_completed').on(table.userId, table.completedAt).desc(),
}));

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

/**
 * Counter rate limit terdistribusi (M5.5).
 *
 * Menggantikan `Map` in-memory (`lib/rate-limit.ts` versi M0) yang reset tiap
 * cold start serverless, tidak dibagi antar instance, dan bisa bocor memori.
 * Sekarang counter hidup di Postgres (Neon) sehingga berlaku lintas instance
 * dan bertahan antar redeploy.
 *
 * `key` sudah menyandikan `${name}:${scope}:${windowMs}:${bucketStart}`, jadi
 * tiap window (menit/hari/bulan) punya baris sendiri. Increment dilakukan atomik
 * (`INSERT ... ON CONFLICT DO UPDATE count = count + 1`) dalam SATU statement —
 * aman di driver neon-http yang tidak punya koneksi persisten. Baris window lama
 * dibuang oleh `db:prune`.
 */
export const rateLimitCounters = pgTable('rateLimitCounters', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(1),
  /** Awal bucket window (epoch-aligned). Dipakai `db:prune` untuk membuang baris tua. */
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
});

/**
 * Cache audio TTS (M6.4).
 *
 * Menghemat biaya ElevenLabs untuk kalimat yang berulang (Livia banyak
 * mengulang sapaan/gambaran kasarnya). Key = `sha256(voiceId|modelId|text)`
 * sehingga cache otomatis berbeda per suara & model. Audio disimpan `bytea`
 * (tanpa infra storage baru — Neon cukup untuk skala ini). Baris paling lama
 * tidak dipakai dibuang oleh eviction LRU di `lib/tts/cache.ts`
 * (dibatasi `TTS_CACHE_MAX_ROWS`).
 */
export const ttsCache = pgTable('ttsCache', {
  /** `sha256(voiceId|modelId|text)` — deterministik, unik per kombinasi. */
  key: text('key').primaryKey(),
  audio: bytea('audio').notNull(),
  mimeType: text('mime_type').notNull().default('audio/mpeg'),
  createdAt: timestamp('created_at').defaultNow(),
  /** Waktu akses terakhir — dasar urut LRU untuk eviction. */
  lastHitAt: timestamp('last_hit_at', { withTimezone: true }).defaultNow(),
});

/**
 * Penggunaan TTS per user per hari (M6.4) — pencatatan biaya & cap harian.
 *
 * `charsBilled` hanya dihitung saat cache MISS (saat benar-benar memanggil
 * ElevenLabs); hit tidak membebani. Baris per (user, hari-UTC). Increment
 * atomik `INSERT ... ON CONFLICT DO UPDATE` dalam satu statement (pola
 * `rateLimitCounters`) — aman di driver neon-http tanpa koneksi persisten.
 */
export const ttsUsage = pgTable(
  'ttsUsage',
  {
    userId: uuid('user_id').notNull(),
    /** Awal hari UTC (epoch-aligned) — 1 baris per user per hari. */
    day: timestamp('day', { withTimezone: true }).notNull(),
    /** Total request TTS (hit + miss) hari ini. */
    requests: integer('requests').notNull().default(0),
    /** Berapa request yang terlayani dari cache (tanpa biaya). */
    cacheHits: integer('cache_hits').notNull().default(0),
    /** Jumlah karakter yang benar-benar dikirim ke ElevenLabs (miss saja). */
    charsBilled: integer('chars_billed').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.day] }),
  })
);

/**
 * Log pemakaian AI per request (M7.1).
 *
 * Tiap panggilan ke LLM (chat, date, ringkasan, konsolidasi memori)
 * dicatat di sini: provider, model, operasi, user, token in/out, dan
 * estimasi biaya. Ini sumber "tiap request tercatat" di milestone M7.1 —
 * agregasi & tampilan di `lib/ai/usage.ts` + halaman `/usage`.
 *
 * `costMicros` = micro-USD (1e-6 USD), integer: akumulasi tanpa error
 * pembulatan float (satu micro = $0.000001). int4 cukup besar (~$2.146
 * per baris-hari) — alert budget jauh lebih dulu menyala sebelum batas itu.
 *
 * Retensi: dibuang `db:prune` setelah 30 hari (riwayat biaya, bukan data
 * user — agregasi harian di `aiUsageDaily` tidak pernah dihapus).
 */
export const aiUsageLogs = pgTable(
  'aiUsageLogs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    /** Nama operasi dari provider (`chat`, `date.dialogue`, `chat.summary`, ...). */
    operation: text('operation').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costMicros: integer('cost_micros').notNull().default(0),
    /** `true` kalau memakai API key pribadi user — biayanya ditanggung user, bukan server. */
    userKey: boolean('user_key').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index('ai_usage_logs_created_at_idx').on(t.createdAt),
  })
);

/**
 * Agregasi pemakaian AI harian, global (M7.1) — 1 baris per hari UTC.
 *
 * Increment atomik `INSERT ... ON CONFLICT DO UPDATE` per request (pola
 * `ttsUsage`/`rateLimitCounters`) supaya total hari ini selalu konsisten
 * walau banyak request konkuren di serverless — dan alert budget cukup
 * membaca baris yang baru di-upsert, tanpa query tambahan.
 *
 * `capExceededAt` = stempel waktu cap harian LEBIH dulu dilewati (env
 * `AI_DAILY_COST_LIMIT_USD`). Di-set sekali per hari supaya warning
 * `ai.budget_alert` tidak spam — satu warning per hari yang melewati,
 * bukan per request.
 */
export const aiUsageDaily = pgTable('aiUsageDaily', {
  /** Awal hari UTC (epoch-aligned) — 1 baris per hari. */
  day: timestamp('day', { withTimezone: true }).primaryKey().notNull(),
  requests: integer('requests').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costMicros: integer('cost_micros').notNull().default(0),
  capExceededAt: timestamp('cap_exceeded_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Hari aktif user (M7.2) — 1 baris per (user, hari-UTC).
 *
 * Sumber metrik retensi D1/D7/D30 & DAU di dashboard `/analytics`.
 * "Aktif" didefinisikan sempit: minimal SATU interaksi chat atau kencan
 * yang selesai tersimpan (chat turn, date, date chat). Sengaja TIDAK
 * mencakup kunjungan halaman — signal-nya terlalu bising untuk retensi.
 *
 * Tabel ini TIDAK PERNAH di-prune (kecuali cascade hapus akun): 1 baris
 * kecil per user per hari aktif, dan menghapusnya akan merusak retensi
 * kohort lama. chatMessages sendiri tetap di-prune 90 hari — tabel ini
 * itulah yang membuat retensi tetap akurat setelah pesan mentah dibuang.
 */
export const userActivityDaily = pgTable(
  'userActivityDaily',
  {
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    /** Awal hari UTC (epoch-aligned). */
    day: timestamp('day', { withTimezone: true }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.day] }),
  })
);
