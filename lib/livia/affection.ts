// Shared affection logic for both client and server
export type AffectionLevel = {
  level: number;
  name: string;
  min: number;
  max: number;
  unlocksChapter: number;
};

export const AFFECTION_LEVELS: AffectionLevel[] = [
  { level: 0, name: 'Orang Asing', min: 0, max: 19, unlocksChapter: 0 },
  { level: 1, name: 'Kenalan', min: 20, max: 39, unlocksChapter: 1 },
  { level: 2, name: 'Tetangga', min: 40, max: 59, unlocksChapter: 2 },
  { level: 3, name: 'Teman', min: 60, max: 79, unlocksChapter: 3 },
  { level: 4, name: 'Sahabat', min: 80, max: 99, unlocksChapter: 4 },
  { level: 5, name: 'Rumah', min: 100, max: 100, unlocksChapter: 5 },
];

export function getAffectionLevel(affection: number): AffectionLevel {
  const clampedAffection = Math.max(0, Math.min(100, affection));
  return AFFECTION_LEVELS.find(
    (level) => clampedAffection >= level.min && clampedAffection <= level.max
  ) || AFFECTION_LEVELS[0];
}

export type LiviaResponse = {
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
};

export function calculateAffectionDelta(response: LiviaResponse): number {
  switch (response.sentiment) {
    case 'positive':
      return 3;
    case 'negative':
      return -2;
    default:
      return 0;
  }
}

export function shouldUnlockChapter(oldAffection: number, newAffection: number): number | null {
  const oldLevel = getAffectionLevel(oldAffection);
  const newLevel = getAffectionLevel(newAffection);
  
  if (newLevel.level > oldLevel.level) {
    return newLevel.unlocksChapter;
  }
  return null;
}
