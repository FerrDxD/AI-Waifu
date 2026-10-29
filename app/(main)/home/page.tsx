import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import HomeClient from './HomeClient';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const profiles = await db.select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id));
  
  const profile = profiles[0];
  if (!profile) redirect('/onboarding');

  const userResult = await db.select().from(users).where(eq(users.id, session.user.id));
  const actualUserName = userResult[0]?.username || userResult[0]?.name || session.user.name || 'Pemain';

  return (
    <HomeClient
      initialAffection={profile.affection ?? 0}
      userName={actualUserName}
      initialItemsBrought={profile.itemsBrought ?? []}
      initialOutfit={profile.activeOutfit ?? 'default'}
    />
  );
}