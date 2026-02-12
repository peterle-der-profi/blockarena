'use client';

interface CountdownTimerProps {
  blocksRemaining: number;
  totalBlocks: number;
  label?: string;
}

export function CountdownTimer({ blocksRemaining, totalBlocks, label }: CountdownTimerProps) {
  const progress = totalBlocks > 0 ? ((totalBlocks - blocksRemaining) / totalBlocks) * 100 : 0;
  const isUrgent = blocksRemaining < totalBlocks * 0.1;

  return (
    <div className="w-full">
      {label && <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>}
      <div className="relative h-2 bg-gray-800/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isUrgent
              ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(255,23,68,0.5)] animate-pulse'
              : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] mt-1">
        <span className={isUrgent ? 'neon-text-red font-bold' : 'text-gray-500'}>
          {blocksRemaining} blocks
        </span>
        <span className="text-gray-600 font-display">{progress.toFixed(0)}%</span>
      </div>
    </div>
  );
}
