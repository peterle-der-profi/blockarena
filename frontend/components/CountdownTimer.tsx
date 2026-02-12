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
      {label && <div className="text-xs text-gray-400 mb-1">{label}</div>}
      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isUrgent ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-green-500 to-blue-500'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className={isUrgent ? 'text-red-400 font-bold animate-pulse' : 'text-gray-400'}>
          {blocksRemaining} blocks left
        </span>
        <span className="text-gray-500">{progress.toFixed(0)}%</span>
      </div>
    </div>
  );
}
