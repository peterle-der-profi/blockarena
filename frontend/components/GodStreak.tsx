'use client';

import { motion } from 'framer-motion';

interface GodStreakProps {
  streak: number;
  best: number;
  animate?: boolean;
}

const MILESTONES = [5, 10, 25, 50, 100];

function getFireEmoji(streak: number): string {
  if (streak >= 100) return '🔥🔥🔥🔥🔥';
  if (streak >= 50) return '🔥🔥🔥🔥';
  if (streak >= 25) return '🔥🔥🔥';
  if (streak >= 10) return '🔥🔥';
  if (streak >= 5) return '🔥';
  return '';
}

export function GodStreak({ streak, best, animate = true }: GodStreakProps) {
  const fire = getFireEmoji(streak);
  const isAtMilestone = MILESTONES.includes(streak) && streak > 0;
  const fireIntensity = streak >= 25 ? 3 : streak >= 10 ? 2 : streak >= 5 ? 1 : 0;

  return (
    <div
      className={`relative p-4 rounded-xl bg-gradient-to-r from-orange-950/60 to-red-950/60 border overflow-hidden ${
        fireIntensity >= 2 ? 'animate-fire-border border-orange-500' : 'border-orange-600/30'
      } ${isAtMilestone && animate ? 'animate-god-streak-milestone' : ''}`}
    >
      {/* Fire border glow based on streak size */}
      {fireIntensity >= 1 && (
        <div className={`absolute inset-0 rounded-xl pointer-events-none ${
          fireIntensity >= 3 ? 'shadow-[inset_0_0_30px_rgba(255,102,0,0.3)]' :
          fireIntensity >= 2 ? 'shadow-[inset_0_0_20px_rgba(255,102,0,0.2)]' :
          'shadow-[inset_0_0_10px_rgba(255,102,0,0.1)]'
        }`} />
      )}

      <div className="flex items-center justify-between relative z-10">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-display">GOD STREAK</div>
          <div className={`font-display text-3xl font-black ${animate && streak > 0 ? 'animate-streak-pulse' : ''}`}>
            {fire} {streak}x
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-display">BEST</div>
          <div className="font-display text-xl font-bold neon-text-gold">{best}x</div>
        </div>
      </div>

      {/* Milestone progress */}
      <div className="mt-3 relative z-10">
        <div className="flex gap-1">
          {MILESTONES.map((m) => (
            <div
              key={m}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                streak >= m
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-400 shadow-[0_0_6px_rgba(255,153,0,0.5)]'
                  : 'bg-gray-800'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-gray-600 mt-1 font-display">
          {MILESTONES.map((m) => (
            <span key={m} className={streak >= m ? 'text-orange-400' : ''}>{m}</span>
          ))}
        </div>
      </div>

      {/* Milestone celebration particles */}
      {isAtMilestone && animate && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -80, opacity: 0, scale: 0 }}
              transition={{ duration: 1, delay: i * 0.08 }}
              className="absolute text-lg"
              style={{ left: `${(i / 15) * 100}%`, bottom: '10%' }}
            >
              ✨
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlayerProfileCard({
  address, streak, bestStreak, wins, losses,
}: {
  address: string; streak: number; bestStreak: number; wins: number; losses: number;
}) {
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0';

  return (
    <div className="glass-card rounded-2xl p-4 border border-purple-500/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-display text-sm font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)]">
          {address.slice(2, 4).toUpperCase()}
        </div>
        <div>
          <div className="font-mono text-sm text-white">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          <div className="text-[11px] text-gray-500">
            {winRate}% win rate · {wins + losses} games
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-gray-600 uppercase">RANK</div>
          <div className="font-display text-sm font-bold neon-text-blue">#47</div>
        </div>
      </div>
      <GodStreak streak={streak} best={bestStreak} />
    </div>
  );
}
