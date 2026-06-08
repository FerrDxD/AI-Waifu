import { pgTable, uuid, text, timestamp, boolean, integer, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique(),
  email: text('email').notNull().unique(),
  password: text('password'),
  name: text('name'),
  image: text('image'),
  provider: text('provider').notNull().default('credentials'),
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
  totalScreenTime: integer('total_screen_time').default(0),
  totalPomodoroSessions: integer('total_pomodoro_sessions').default(0),
  lastSeen: timestamp('last_seen').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatMessages = pgTable('chatMessages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'user' | 'livia'
  content: text('content').notNull(),
  affectionDelta: integer('affection_delta').default(0),
  createdAt: timestamp('created_at').defaultNow(),
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
