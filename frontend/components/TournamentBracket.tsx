'use client';

import type { Tournament, TournamentMatch } from '@/types';

function MatchCard({ match }: { match: TournamentMatch }) {
  return (
    <div className="bg-gray-800 rounded-lg p-2 w-48 border border-gray-700">
      <div
        className={`flex justify-between items-center p-1.5 rounded text-sm ${
          match.winner === match.player1 ? 'bg-green-900/40 text-green-400' : 'text-gray-300'
        }`}
      >
        <span className="font-mono truncate max-w-[120px]">
          {match.player1 ? `${match.player1.slice(0, 6)}...` : 'TBD'}
        </span>
        <span className="font-bold">{match.score1 ?? '-'}</span>
      </div>
      <div className="h-px bg-gray-700 my-0.5" />
      <div
        className={`flex justify-between items-center p-1.5 rounded text-sm ${
          match.winner === match.player2 ? 'bg-green-900/40 text-green-400' : 'text-gray-300'
        }`}
      >
        <span className="font-mono truncate max-w-[120px]">
          {match.player2 ? `${match.player2.slice(0, 6)}...` : 'TBD'}
        </span>
        <span className="font-bold">{match.score2 ?? '-'}</span>
      </div>
    </div>
  );
}

export function TournamentBracket({ tournament }: { tournament: Tournament }) {
  const rounds: TournamentMatch[][] = [];
  for (let r = 1; r <= tournament.rounds; r++) {
    rounds.push(tournament.matches.filter((m) => m.round === r));
  }

  const statusColors: Record<string, string> = {
    upcoming: 'text-blue-400',
    qualifying: 'text-yellow-400',
    active: 'text-green-400',
    completed: 'text-gray-400',
  };

  return (
    <div className="p-4 rounded-xl bg-gray-900 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold">{tournament.name}</h3>
          <span className={`text-sm ${statusColors[tournament.status]}`}>
            {tournament.status.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Prize Pool</div>
          <div className="text-lg font-bold text-yellow-400">{tournament.prizePool} ETH</div>
        </div>
      </div>

      <div className="flex justify-between text-sm text-gray-400 mb-4">
        <span>
          {tournament.participants}/{tournament.maxParticipants} players
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max items-center">
          {rounds.map((roundMatches, ri) => (
            <div key={ri} className="flex flex-col gap-4">
              <div className="text-xs text-gray-500 text-center mb-1">
                {ri === rounds.length - 1 ? 'Final' : `Round ${ri + 1}`}
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
