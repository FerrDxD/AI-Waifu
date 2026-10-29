import ShopClient from '@/features/shop/ShopClient';
import CharacterGate from '@/components/characters/CharacterGate';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/shop/ShopClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 *
 * M8.2 Phase B: toko adalah sistem life-sim milik Livia.
 */
export default function Page() {
  return (
    <CharacterGate feature="lifeSim">
      <ShopClient />
    </CharacterGate>
  );
}
