import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import { BottomNav } from '@/components/BottomNav';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'BlockArena — Real-time Prediction Game',
  description: 'Predict price movements at MegaETH speed (10ms blocks)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen">
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
