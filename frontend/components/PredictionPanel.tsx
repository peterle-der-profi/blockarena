'use client';

import { useState, useCallback } from 'react';
import { useCommitPrediction, useRevealPrediction, generateSalt } from '@/hooks/useArena';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { GodStreak } from './GodStreak';
import { motion, AnimatePresence } from 'framer-motion';

interface PredictionPanelProps {
  arenaId: bigint;
  numTicks: number;
  isActive: boolean;
  isEnded: boolean;
  onWin?: () => void;
  onStreak?: () => void;
  onShare?: () => void;
}

export function PredictionPanel({ arenaId, numTicks, isActive, isEnded, onWin, onStreak, onShare }: PredictionPanelProps) {
  const [predictions, setPredictions] = useState<boolean[]>(new Array(numTicks).fill(false));
  const [committed, setCommitted] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const commitPrediction = useCommitPrediction();
  const revealPrediction = useRevealPrediction();
  const { playTick, playCorrect, playWin, playStreak: playStreakSound } = useSoundEffects();

  const togglePrediction = useCallback((index: number) => {
    playTick();
    setPredictions(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, [playTick]);

  const setAllUp = () => setPredictions(new Array(numTicks).fill(true));
  const setAllDown = () => setPredictions(new Array(numTicks).fill(false));
  const randomize = () => setPredictions(Array.from({ length: numTicks }, () => Math.random() > 0.5));

  const handleCommit = () => {
    const salt = generateSalt();
    commitPrediction(arenaId, predictions, salt);
    setCommitted(true);
    playWin();
  };

  const handleReveal = () => {
    revealPrediction(arenaId);
    onShare?.();
  };

  // Streak calculation
  let maxStreak = 0;
  let streak = 0;
  for (const p of predictions) {
    if (p) { streak++; maxStreak = Math.max(maxStreak, streak); }
    else streak = 0;
  }
  const upCount = predictions.filter(Boolean).length;

  const isLargeTape = numTicks > 256;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5 border border-purple-500/20"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-white">
          PREDICTIONS
        </h3>
        <span className="text-xs text-gray-500 font-display">{numTicks} TICKS</span>
      </div>

      {/* Live accuracy */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 flex items-center gap-2">
          <div className="text-sm text-gray-400">Accuracy</div>
          <div className="font-display text-lg font-bold neon-text-green">{upCount > 0 ? ((upCount / numTicks) * 100).toFixed(0) : 0}%</div>
        </div>
        {currentStreak > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm font-bold"
          >
            🔥 {currentStreak} in a row!
          </motion.div>
        )}
      </div>

      {maxStreak >= 3 && (
        <div className="mb-4">
          <GodStreak streak={maxStreak} best={maxStreak} />
        </div>
      )}

      {isActive && !committed && (
        <>
          {/* Quick actions */}
          <div className="flex gap-2 mb-4">
            <button onClick={setAllUp} className="flex-1 py-2 text-sm font-bold rounded-lg bg-green-900/30 border border-green-500/20 text-green-400 hover:bg-green-900/50 active:scale-95 transition-all">
              ALL ↑
            </button>
            <button onClick={setAllDown} className="flex-1 py-2 text-sm font-bold rounded-lg bg-red-900/30 border border-red-500/20 text-red-400 hover:bg-red-900/50 active:scale-95 transition-all">
              ALL ↓
            </button>
            <button onClick={randomize} className="flex-1 py-2 text-sm font-bold rounded-lg glass-card hover:bg-white/10 active:scale-95 transition-all">
              🎲 MIX
            </button>
          </div>

          {/* Prediction count */}
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span className="neon-text-green">{upCount} ↑</span>
            <span className="neon-text-red">{numTicks - upCount} ↓</span>
          </div>

          {isLargeTape ? (
            <div className="mb-4">
              <div className="flex h-20 rounded-xl overflow-hidden border border-gray-700/50">
                {Array.from({ length: Math.min(numTicks, 300) }).map((_, i) => {
                  const idx = Math.floor((i / 300) * numTicks);
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        const next = [...predictions];
                        const chunkSize = Math.ceil(numTicks / 300);
                        const start = Math.floor((i / 300) * numTicks);
                        const val = !next[start];
                        for (let j = start; j < Math.min(start + chunkSize, numTicks); j++) next[j] = val;
                        setPredictions(next);
                        playTick();
                      }}
                      className={`flex-1 cursor-pointer transition-colors ${
                        predictions[idx]
                          ? 'bg-green-500 shadow-[inset_0_0_10px_rgba(57,255,20,0.3)]'
                          : 'bg-red-500 shadow-[inset_0_0_10px_rgba(255,23,68,0.3)]'
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Tap to toggle · Each bar ≈ {Math.ceil(numTicks / 300)} ticks</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mb-4 max-h-64 overflow-y-auto pr-1">
              {predictions.map((pred, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => togglePrediction(i)}
                  className={`w-12 h-12 sm:w-10 sm:h-10 rounded-lg text-sm font-bold transition-all touch-manipulation ${
                    pred
                      ? 'bg-green-500 shadow-[0_0_12px_rgba(57,255,20,0.4)] text-black'
                      : 'bg-red-500 shadow-[0_0_12px_rgba(255,23,68,0.4)] text-white'
                  }`}
                >
                  {pred ? '↑' : '↓'}
                </motion.button>
              ))}
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCommit}
            className="w-full py-4 rounded-xl font-display font-bold text-lg tracking-wider bg-gradient-to-r from-purple-600 to-blue-600 shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] transition-all"
          >
            ⚡ COMMIT PREDICTIONS
          </motion.button>
        </>
      )}

      {committed && isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="text-4xl mb-3 animate-heartbeat">✅</div>
          <div className="font-display text-lg font-bold neon-text-green">COMMITTED!</div>
          <div className="text-sm text-gray-400 mt-1">Waiting for arena to end...</div>
        </motion.div>
      )}

      {isEnded && (
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReveal}
            className="w-full py-4 rounded-xl font-display font-bold text-lg tracking-wider btn-neon-green"
          >
            🎯 REVEAL & CLAIM
          </motion.button>
          {onShare && (
            <button
              onClick={onShare}
              className="w-full py-3 rounded-xl font-bold text-sm glass-card border border-purple-500/20 hover:bg-white/5 transition-all"
            >
              📤 Share Result
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
