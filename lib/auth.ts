import NextAuth, { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';
import { users, userProfiles } from './db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifierStr = credentials.identifier as string;

        const userResults = await db.select().from(users).where(
          or(
            eq(users.email, identifierStr),
            eq(users.username, identifierStr)
          )
        );

        const user = userResults[0];

        if (!user || !user.password) return null;

        const isValidPassword = await bcrypt.compare(credentials.password as string, user.password);

        if (!isValidPassword) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email!;
        const existingUsers = await db.select().from(users).where(eq(users.email, email));
        
        let dbUser = existingUsers[0];
        
        if (!dbUser) {
          const insertedUsers = await db.insert(users).values({
            email,
            name: user.name,
            image: user.image,
            provider: 'google'
          }).returning();
          dbUser = insertedUsers[0];
        }

        const existingProfile = await db.select().from(userProfiles).where(eq(userProfiles.userId, dbUser.id));
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
        const profile = await db.select({ onboardingDone: userProfiles.onboardingDone })
          .from(userProfiles)
          .where(eq(userProfiles.userId, token.id as string));
        
        if (profile.length > 0) {
          token.onboardingDone = profile[0].onboardingDone;
        }
      }

      if (trigger === "update" && session?.onboardingDone !== undefined) {
        token.onboardingDone = session.onboardingDone;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).onboardingDone = token.onboardingDone;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
