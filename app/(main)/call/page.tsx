import CallClient from '@/features/call/CallClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/call/CallClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <CallClient />;
}
