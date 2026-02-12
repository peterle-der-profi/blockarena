'use client';

import { useState } from 'react';
import { TournamentBracket } from '@/components/TournamentBracket';
import { ConnectWallet } from '@/components/ConnectWallet';
import { motion } from 'framer-motion';
import type { Tournament, TournamentMatch } from '@/types';

function generateMockTournament(): Tournament {
  const matches: TournamentMatch[] = [];
  for (let i = 0; i < 4; i++) {
    matches.push({
      id: `r1-${i}`, round: 1, position: i,
      player1: `0x${(i * 2 + 1).toString(16).padStart(40, 'a')}`,
      player2: `0x${(i * 2 + 2).toString(16).padStart(40, 'b')}`,
      winner: i < 3 ? `0x${(i * 2 + 1).toString(16).padStart(40, 'a')}` : null,
      score1: i < 3 ? 180 + i * 5 : undefined,
      score2: i < 3 ? 160 + i * 3 : undefined,
    });
  }
  for (let i = 0; i < 2; i++) {
    matches.push({
      id: `r2-${i}`, round: 2, position: i,
      player1: i < 1 ? `0x${(1).toString(16).padStart(40, 'a')}` : null,
      player2: i < 1 ? `0x${(3).toString(16).padStart(40, 'a')}` : null,
      winner: null,
    });
  }
  matches.push({ id: 'r3-0', round: 3, position: 0, player1: null, player2: null, winner: null });
  return {
    id: 'tournament-1', name: 'MegaETH Championship #1', status: 'active',
    rounds: 3, matches, prizePool: '10', participants: 8, maxParticipants: 8,
  };
}

export default function TournamentPage() {
  const [tournament] = useState<Tournament>(generateMockTournament);
  const [registered, setRegistered] = useState(false);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl font-bold neon-text-purple">⚔️ TOURNAMENT</h1>
        <ConnectWallet />
      </div>

      {tournament.status === 'upcoming' && !registered && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-5 glass-card rounded-2xl border border-purple-500/20 text-center"
        >
          <p className="text-gray-400 mb-3">Registration is open!</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setRegistered(true)}
            className="px-8 py-3 btn-neon-green rounded-xl font-display text-lg tracking-wider"
          >
            ⚡ REGISTER
          </motion.button>
        </motion.div>
      )}

      {registered && (
        <div className="mb-6 p-3 rounded-xl bg-green-900/20 border border-green-500/20 text-center neon-text-green text-sm font-bold">
          ✅ You are registered!
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'PLAYERS', value: tournament.participants.toString(), color: '' },
          { label: 'PRIZE', value: `${tournament.prizePool} ETH`, color: 'neon-text-gold' },
          { label: 'ROUNDS', value: tournament.rounds.toString(), color: '' },
          { label: 'STATUS', value: tournament.status.toUpperCase(), color: 'neon-text-green' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-3 text-center border border-white/5"
          >
            <div className={`font-display text-xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</div>
            <div className="text-[9px] text-gray-600 uppercase tracking-widest font-display mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <TournamentBracket tournament={tournament} />
    </main>
  );
}
