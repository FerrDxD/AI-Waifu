import GardenClient from '@/features/garden/GardenClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/garden/GardenClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <GardenClient />;
}
