import LoungeClient from '@/features/lounge/LoungeClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/lounge/LoungeClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <LoungeClient />;
}
