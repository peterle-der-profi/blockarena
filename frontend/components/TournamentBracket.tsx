'use client';

import type { Tournament, TournamentMatch } from '@/types';

function MatchCard({ match }: { match: TournamentMatch }) {
  return (
    <div className="glass-card rounded-lg p-2 w-48 border border-white/5">
      <div className={`flex justify-between items-center p-1.5 rounded text-sm ${
        match.winner === match.player1 ? 'bg-green-900/30 neon-text-green' : 'text-gray-400'
      }`}>
        <span className="font-mono truncate max-w-[120px] text-xs">
          {match.player1 ? `${match.player1.slice(0, 6)}...` : 'TBD'}
        </span>
        <span className="font-display font-bold">{match.score1 ?? '-'}</span>
      </div>
      <div className="h-px bg-white/5 my-0.5" />
      <div className={`flex justify-between items-center p-1.5 rounded text-sm ${
        match.winner === match.player2 ? 'bg-green-900/30 neon-text-green' : 'text-gray-400'
      }`}>
        <span className="font-mono truncate max-w-[120px] text-xs">
          {match.player2 ? `${match.player2.slice(0, 6)}...` : 'TBD'}
        </span>
        <span className="font-display font-bold">{match.score2 ?? '-'}</span>
      </div>
    </div>
  );
}

export function TournamentBracket({ tournament }: { tournament: Tournament }) {
  const rounds: TournamentMatch[][] = [];
  for (let r = 1; r <= tournament.rounds; r++) {
    rounds.push(tournament.matches.filter((m) => m.round === r));
  }

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white">{tournament.name}</h3>
          <span className="text-xs font-display neon-text-green tracking-wider">{tournament.status.toUpperCase()}</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-600 uppercase tracking-widest font-display">PRIZE</div>
          <div className="font-display text-lg font-bold neon-text-gold">{tournament.prizePool} ETH</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max items-center py-4">
          {rounds.map((roundMatches, ri) => (
            <div key={ri} className="flex flex-col gap-4">
              <div className="text-[10px] text-gray-600 text-center font-display uppercase tracking-widest mb-1">
                {ri === rounds.length - 1 ? 'FINAL' : `ROUND ${ri + 1}`}
              </div>
              {roundMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
