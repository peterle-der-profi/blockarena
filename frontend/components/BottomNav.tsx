'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/', icon: '⚡', label: 'Arena' },
  { href: '/leaderboard', icon: '🏆', label: 'Ranks' },
  { href: '/history', icon: '📊', label: 'Stats' },
  { href: '/gallery', icon: '🖼️', label: 'NFTs' },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/overlay')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="glass-card border-t border-white/5">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="relative flex flex-col items-center gap-0.5 px-4 py-1">
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-px left-2 right-2 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                  />
                )}
                <span className={`text-xl transition-transform ${active ? 'scale-110' : ''}`}>{item.icon}</span>
                <span className={`text-[9px] font-bold tracking-wider uppercase ${
                  active ? 'text-white' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
