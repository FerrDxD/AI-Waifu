import ScheduleClient from '@/features/schedule/ScheduleClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/schedule/ScheduleClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <ScheduleClient />;
}
