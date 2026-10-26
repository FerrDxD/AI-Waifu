import NextAuth, { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';
import { users, userProfiles } from './db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { logger } from './logger';
import {
  clearLoginFailures,
  getLockoutState,
  recordFailedLogin,
  LOCKOUT_POLICY,
} from './auth-lockout';
import { recordAuditEvent } from './safety/audit';

/**
 * Catatan keamanan (M0/H0.4):
 *
 * 1. `authorize()` sekarang memeriksa lockout SEBELUM query database, sehingga
 *    brute force 5x gagal terkunci 15 menit.
 * 2. Pesan gagal login sengaja seragam ("identifier atau password salah"),
 *    tidak membedakan "user tidak ada" vs "password salah".
 * 3. Cost bcrypt dinaikkan ke 12 (dari 10).
 */
const BCRYPT_ROUNDS = 12;

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifierStr = String(credentials.identifier).trim();
        const passwordStr = String(credentials.password);

        // Tolak lebih awal kalau akun ini sedang terkunci.
        const lockout = getLockoutState(identifierStr);
        if (lockout.locked) {
          logger.warn('auth.login.locked_out', {
            identifier: identifierStr.slice(0, 3) + '***',
            retryAfterSeconds: lockout.retryAfterSeconds,
          });
          // M4.6: percobaan login saat terkunci tetap diaudit — pola percobaan
          // berulang justru sinyal serangan yang paling berguna.
          await recordAuditEvent({
            userId: null,
            action: 'auth.login.failure',
            outcome: 'denied',
            metadata: { reason: 'locked_out', provider: 'credentials' },
          });
          return null;
        }

        const userResults = await db
          .select()
          .from(users)
          .where(or(eq(users.email, identifierStr), eq(users.username, identifierStr)));

        const user = userResults[0];

        if (!user || !user.password) {
          recordFailedLogin(identifierStr);
          await recordAuditEvent({
            userId: null,
            action: 'auth.login.failure',
            outcome: 'failure',
            metadata: { reason: 'unknown_account', provider: 'credentials' },
          });
          return null;
        }

        const isValidPassword = await bcrypt.compare(passwordStr, user.password);

        if (!isValidPassword) {
          const state = recordFailedLogin(identifierStr);
          logger.warn('auth.login.failed', {
            userId: user.id,
            remainingAttempts: state.remainingAttempts,
            maxAttempts: LOCKOUT_POLICY.maxFailedAttempts,
          });
          await recordAuditEvent({
            userId: user.id,
            action: 'auth.login.failure',
            outcome: 'failure',
            metadata: {
              reason: 'bad_password',
              provider: 'credentials',
              count: state.remainingAttempts,
            },
          });
          return null;
        }

        clearLoginFailures(identifierStr);

        await recordAuditEvent({
          userId: user.id,
          action: 'auth.login.success',
          metadata: { provider: 'credentials' },
        });

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email!;
        const existingUsers = await db.select().from(users).where(eq(users.email, email));

        let dbUser = existingUsers[0];

        if (!dbUser) {
          const insertedUsers = await db
            .insert(users)
            .values({
              email,
              name: user.name,
              image: user.image,
              provider: 'google',
            })
            .returning();
          dbUser = insertedUsers[0];
        }

        const existingProfile = await db
          .select({ id: userProfiles.id })
          .from(userProfiles)
          .where(eq(userProfiles.userId, dbUser.id));

        if (existingProfile.length === 0) {
          await db.insert(userProfiles).values({ userId: dbUser.id });
        }

        user.id = dbUser.id;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      if (token.id) {
        const profile = await db
          .select({ onboardingDone: userProfiles.onboardingDone })
          .from(userProfiles)
          .where(eq(userProfiles.userId, token.id as string));

        if (profile.length > 0) {
          token.onboardingDone = profile[0].onboardingDone;
        }
      }

      if (trigger === 'update' && session?.onboardingDone !== undefined) {
        token.onboardingDone = session.onboardingDone;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { onboardingDone?: boolean }).onboardingDone =
          token.onboardingDone === true;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
