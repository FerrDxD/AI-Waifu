import KitchenClient from '@/features/kitchen/KitchenClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/kitchen/KitchenClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <KitchenClient />;
}
