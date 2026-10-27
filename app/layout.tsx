import type { Metadata } from 'next';
// @ts-ignore
import './globals.css';
import ViewportManager from '@/components/ViewportManager';
import DeferredQuestTracker from '@/components/DeferredQuestTracker';
import { RadioProvider } from '@/components/RadioProvider';
import AchievementToast from '@/components/ui/AchievementToast';
import CustomAlertModal from '@/components/ui/CustomAlertModal';
import NavigationProgress from '@/components/ui/NavigationProgress';
import AgeGateModal from '@/components/ui/AgeGateModal';
import { Suspense } from 'react';

import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

/**
 * PAKSA render dinamis untuk SEMUA halaman (fix CSP nonce).
 *
 * Middleware (M0/H0.3) mengirim Content-Security-Policy dengan nonce
 * per-request; Next.js menempelkan nonce ke tag <script> SAAT render.
 * Halaman yang di-pre-render statis (○) tidak pernah dapat nonce, sehingga
 * browser memblokir script inline `__next_f` (CSP strict-dynamic) dan React
 * tidak ter-hydrate — seluruh interaksi frontend mati (toggle password,
 * form, tombol submit) padahal HTML tetap tampil normal.
 *
 * Dev tidak terdampak karena dev selalu render on-demand. Halaman dinamis
 * (ƒ, mis. /home) juga tidak terdampak. Halaman statis publik (○) adalah
 * yang mati — jadi semua halaman dipaksa dinamis. Trade-off: tidak ada
 * pre-render build-time (TTFB naik sedikit, diabaikan untuk app ini).
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Teman Kos',
  description: 'Productivity web app with an AI companion',
  manifest: '/manifest.json',
  themeColor: '#ff758c',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <LanguageProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <ViewportManager />
          <DeferredQuestTracker />
          <main className="min-h-screen w-full relative">
            <RadioProvider>
              <AchievementToast />
              <CustomAlertModal />
              {/* M4.1: gate untuk akun yang dibuat sebelum M4. Tidak merender
                  apa pun kalau user sudah mengonfirmasi atau belum login. */}
              <AgeGateModal />
              {children}
            </RadioProvider>
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}

