import GardenClient from '@/features/garden/GardenClient';
import CharacterGate from '@/components/characters/CharacterGate';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/garden/GardenClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 *
 * M8.2 Phase B: kebun adalah sistem life-sim milik Livia.
 */
export default function Page() {
  return (
    <CharacterGate feature="lifeSim">
      <GardenClient />
    </CharacterGate>
  );
}
