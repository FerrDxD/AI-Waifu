import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
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

  return (
    <HomeClient
      initialAffection={profile.affection ?? 0}
      userName={session.user.name ?? 'Kamu'}
      initialItemsBrought={profile.itemsBrought ?? []}
      initialOutfit={profile.activeOutfit ?? 'default'}
    />
  );
}