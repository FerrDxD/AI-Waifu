import WorkClient from '@/features/work/WorkClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/work/WorkClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <WorkClient />;
}
