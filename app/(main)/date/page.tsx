import DateClient from '@/features/date/DateClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/date/DateClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <DateClient />;
}
