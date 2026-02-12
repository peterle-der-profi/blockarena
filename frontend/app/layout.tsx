import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import { BottomNav } from '@/components/BottomNav';
import { SoundToggle } from '@/components/SoundToggle';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0f',
};

export const metadata: Metadata = {
  title: 'BlockArena ⚡ Real-time Prediction Game',
  description: 'Predict price movements at MegaETH speed. Play, streak, win.',
  openGraph: {
    title: 'BlockArena ⚡',
    description: 'Real-time crypto prediction arena on MegaETH',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--bg-primary)] text-white min-h-screen overflow-x-hidden">
        <Providers>
          {children}
          <BottomNav />
          <SoundToggle />
        </Providers>
      </body>
    </html>
  );
}
