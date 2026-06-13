import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

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
        <main className="min-h-screen w-full relative">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
