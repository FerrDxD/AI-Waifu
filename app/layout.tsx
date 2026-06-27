import type { Metadata } from 'next';
// @ts-ignore
import './globals.css';
import ViewportManager from '@/components/ViewportManager';
import { RadioProvider } from '@/components/RadioProvider';

export const metadata: Metadata = {
  title: 'Teman Kos',
  description: 'Productivity web app with an AI companion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <ViewportManager />
        <main className="min-h-screen w-full relative">
          <RadioProvider>
            {children}
          </RadioProvider>
        </main>
      </body>
    </html>
  );
}
