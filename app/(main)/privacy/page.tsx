import PrivacyClient from '@/features/privacy/PrivacyClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/privacy/PrivacyClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <PrivacyClient />;
}
