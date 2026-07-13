import type { Metadata } from 'next';
// @ts-ignore
import './globals.css';
import ViewportManager from '@/components/ViewportManager';
import QuestTracker from '@/components/QuestTracker';
import { RadioProvider } from '@/components/RadioProvider';
import AchievementToast from '@/components/ui/AchievementToast';
import CustomAlertModal from '@/components/ui/CustomAlertModal';
import NavigationProgress from '@/components/ui/NavigationProgress';
import { Suspense } from 'react';

import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

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
          <QuestTracker />
          <main className="min-h-screen w-full relative">
            <RadioProvider>
              <AchievementToast />
              <CustomAlertModal />
              {children}
            </RadioProvider>
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}

