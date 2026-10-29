import KitchenClient from '@/features/kitchen/KitchenClient';
import CharacterGate from '@/components/characters/CharacterGate';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/kitchen/KitchenClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 *
 * M8.2 Phase B: dapur adalah sistem life-sim milik Livia.
 */
export default function Page() {
  return (
    <CharacterGate feature="lifeSim">
      <KitchenClient />
    </CharacterGate>
  );
}
