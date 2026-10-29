import ShopClient from '@/features/shop/ShopClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/shop/ShopClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <ShopClient />;
}
