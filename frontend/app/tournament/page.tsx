'use client';

import { useState } from 'react';
import { TournamentBracket } from '@/components/TournamentBracket';
import { ConnectWallet } from '@/components/ConnectWallet';
import type { Tournament, TournamentMatch } from '@/types';

function generateMockTournament(): Tournament {
  const matches: TournamentMatch[] = [];
  // Quarter finals (4 matches)
  for (let i = 0; i < 4; i++) {
    matches.push({
      id: `r1-${i}`,
      round: 1,
      position: i,
      player1: `0x${(i * 2 + 1).toString(16).padStart(40, 'a')}`,
      player2: `0x${(i * 2 + 2).toString(16).padStart(40, 'b')}`,
      winner: i < 3 ? `0x${(i * 2 + 1).toString(16).padStart(40, 'a')}` : null,
      score1: i < 3 ? 180 + i * 5 : undefined,
      score2: i < 3 ? 160 + i * 3 : undefined,
    });
  }
  // Semi finals (2 matches)
  for (let i = 0; i < 2; i++) {
    matches.push({
      id: `r2-${i}`,
      round: 2,
      position: i,
      player1: i < 1 ? `0x${(1).toString(16).padStart(40, 'a')}` : null,
      player2: i < 1 ? `0x${(3).toString(16).padStart(40, 'a')}` : null,
      winner: null,
    });
  }
  // Final
  matches.push({
    id: 'r3-0',
    round: 3,
    position: 0,
    player1: null,
    player2: null,
    winner: null,
  });

  return {
    id: 'tournament-1',
    name: 'MegaETH Championship #1',
    status: 'active',
    rounds: 3,
    matches,
    prizePool: '10',
    participants: 8,
    maxParticipants: 8,
  };
}

export default function TournamentPage() {
  const [tournament] = useState<Tournament>(generateMockTournament);
  const [registered, setRegistered] = useState(false);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🏆 Tournament</h1>
        <ConnectWallet />
      </div>

      {/* Registration */}
      {tournament.status === 'upcoming' && !registered && (
        <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-400 mb-3">Registration is open!</p>
          <button
            onClick={() => setRegistered(true)}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold"
          >
            Register for Tournament
          </button>
        </div>
      )}

      {registered && (
        <div className="mb-6 p-3 bg-green-900/30 border border-green-700 rounded-lg text-center text-green-400 text-sm">
          ✅ You are registered!
        </div>
      )}

      {/* Qualification info */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-900 rounded-xl border border-gray-700 text-center">
          <div className="text-lg font-bold">{tournament.participants}</div>
          <div className="text-xs text-gray-400">Players</div>
        </div>
        <div className="p-3 bg-gray-900 rounded-xl border border-gray-700 text-center">
          <div className="text-lg font-bold text-yellow-400">{tournament.prizePool} ETH</div>
          <div className="text-xs text-gray-400">Prize Pool</div>
        </div>
        <div className="p-3 bg-gray-900 rounded-xl border border-gray-700 text-center">
          <div className="text-lg font-bold">{tournament.rounds}</div>
          <div className="text-xs text-gray-400">Rounds</div>
        </div>
        <div className="p-3 bg-gray-900 rounded-xl border border-gray-700 text-center">
          <div className="text-lg font-bold text-green-400">{tournament.status.toUpperCase()}</div>
          <div className="text-xs text-gray-400">Status</div>
        </div>
      </div>

      {/* Bracket */}
      <TournamentBracket tournament={tournament} />
    </main>
  );
}
