import PomodoroClient from '@/features/pomodoro/PomodoroClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/pomodoro/PomodoroClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <PomodoroClient />;
}
