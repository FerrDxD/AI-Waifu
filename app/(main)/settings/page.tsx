import SettingsClient from '@/features/settings/SettingsClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/settings/SettingsClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <SettingsClient />;
}
