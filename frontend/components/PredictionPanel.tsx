'use client';

import { useState } from 'react';
import { useCommitPrediction, useRevealPrediction } from '@/hooks/useArena';
import { keccak256, toHex } from 'viem';
import { GodStreak } from './GodStreak';

interface PredictionPanelProps {
  arenaId: bigint;
  numTicks: number;
  isActive: boolean;
  isEnded: boolean;
}

export function PredictionPanel({ arenaId, numTicks, isActive, isEnded }: PredictionPanelProps) {
  const tickCount = Math.min(numTicks, 256);
  const [predictions, setPredictions] = useState<boolean[]>(new Array(tickCount).fill(false));
  const [committed, setCommitted] = useState(false);
  const commitPrediction = useCommitPrediction();
  const revealPrediction = useRevealPrediction();

  const togglePrediction = (index: number) => {
    const next = [...predictions];
    next[index] = !next[index];
    setPredictions(next);
  };

  const packPredictions = (): bigint => {
    let packed = 0n;
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i]) packed |= 1n << BigInt(255 - i);
    }
    return packed;
  };

  const handleCommit = () => {
    const salt = keccak256(toHex(crypto.getRandomValues(new Uint8Array(32))));
    commitPrediction(arenaId, packPredictions(), salt as `0x${string}`);
    setCommitted(true);
  };

  const handleReveal = () => {
    revealPrediction(arenaId);
  };

  // Streak calculation
  let maxStreak = 0;
  let currentStreak = 0;
  for (const p of predictions) {
    if (p) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else currentStreak = 0;
  }

  return (
    <div className="border border-gray-700 rounded-xl p-4 bg-gray-900 animate-slide-up">
      <h3 className="text-lg font-bold mb-3">Predictions</h3>

      {maxStreak >= 3 && (
        <div className="mb-4">
          <GodStreak streak={maxStreak} best={maxStreak} />
        </div>
      )}

      {isActive && !committed && (
        <>
          {/* Mobile-friendly large UP/DOWN buttons */}
          <div className="flex flex-wrap gap-1.5 mb-4 max-h-60 overflow-y-auto">
            {predictions.map((pred, i) => (
              <button
                key={i}
                onClick={() => togglePrediction(i)}
                className={`w-12 h-12 sm:w-10 sm:h-10 rounded-lg text-sm font-bold transition-all active:scale-90 touch-manipulation ${
                  pred
                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/30 shadow-lg'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/30 shadow-lg'
                }`}
              >
                {pred ? '↑' : '↓'}
              </button>
            ))}
          </div>
          <button
            onClick={handleCommit}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-lg active:scale-95 transition-transform"
          >
            Commit Predictions
          </button>
        </>
      )}

      {committed && isActive && (
        <div className="text-center text-green-400 py-4">✅ Committed! Wait for arena to end.</div>
      )}

      {isEnded && (
        <button
          onClick={handleReveal}
          className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold text-lg active:scale-95 transition-transform"
        >
          Reveal Predictions
        </button>
      )}
    </div>
  );
}
