import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { applyAffectionUpdate } from '@/lib/livia/affection.server';
import { RECIPES } from '@/lib/livia/recipes';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipeId } = await req.json();
    const recipe = RECIPES.find(r => r.id === recipeId);
    
    if (!recipe) {
      return NextResponse.json({ error: 'Resep tidak ditemukan' }, { status: 400 });
    }

    const profileResults = await db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id));
    const profile = profileResults[0];

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const currentMoney = profile.money || 0;
    if (currentMoney < recipe.cost) {
      return NextResponse.json({ error: 'Uang (Rv) tidak cukup untuk membeli bahan masakan ini!' }, { status: 400 });
    }

    const currentItems = profile.itemsBrought || [];
    if (!currentItems.includes('recipe_book') && !currentItems.includes('recipe_book_shop')) {
      return NextResponse.json({ error: 'Kamu tidak memiliki Buku Resep Masakan!' }, { status: 403 });
    }

    const newMoney = currentMoney - recipe.cost;
    
    // Increase stats
    const newHunger = Math.min(100, (profile.liviaHunger || 100) + recipe.hungerDelta);
    const newEnergy = Math.min(100, (profile.liviaEnergy || 100) + recipe.energyDelta);

    await db.update(userProfiles).set({
      money: newMoney,
      liviaHunger: newHunger,
      liviaEnergy: newEnergy,
    }).where(eq(userProfiles.userId, session.user.id));

    // Increase Affection
    const updateResult = await applyAffectionUpdate(session.user.id, recipe.affectionDelta);

    return NextResponse.json({
      success: true,
      newMoney,
      newAffection: updateResult.newAffection,
      newHunger,
      newEnergy,
      recipeName: recipe.name
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
