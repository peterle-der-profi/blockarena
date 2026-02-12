'use client';

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

function getMilestone(streak: number): number {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (streak >= MILESTONES[i]) return MILESTONES[i];
  }
  return 0;
}

export function GodStreak({ streak, best, animate = true }: GodStreakProps) {
  const fire = getFireEmoji(streak);
  const milestone = getMilestone(streak);
  const isAtMilestone = MILESTONES.includes(streak) && streak > 0;

  return (
    <div
      className={`relative p-4 rounded-xl bg-gradient-to-r from-orange-900/50 to-red-900/50 border border-orange-600/50 ${
        isAtMilestone && animate ? 'animate-god-streak-milestone' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">God Streak</div>
          <div
            className={`text-3xl font-black ${
              animate && streak > 0 ? 'animate-streak-pulse' : ''
            }`}
          >
            {fire} {streak}x
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Best</div>
          <div className="text-xl font-bold text-orange-400">{best}x</div>
        </div>
      </div>

      {milestone > 0 && (
        <div className="mt-2">
          <div className="flex gap-1">
            {MILESTONES.map((m) => (
              <div
                key={m}
                className={`h-1 flex-1 rounded-full ${
                  streak >= m ? 'bg-orange-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            {MILESTONES.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
      )}

      {isAtMilestone && animate && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute animate-confetti-particle text-lg"
              style={{
                left: `${(i / 12) * 100}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              ✨
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlayerProfileCard({
  address,
  streak,
  bestStreak,
  wins,
  losses,
}: {
  address: string;
  streak: number;
  bestStreak: number;
  wins: number;
  losses: number;
}) {
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0';
  return (
    <div className="p-4 rounded-xl bg-gray-900 border border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold">
          {address.slice(2, 4).toUpperCase()}
        </div>
        <div>
          <div className="font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          <div className="text-xs text-gray-400">
            {winRate}% win rate · {wins + losses} games
          </div>
        </div>
      </div>
      <GodStreak streak={streak} best={bestStreak} />
    </div>
  );
}
