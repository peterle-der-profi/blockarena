export const DIAMOND_ADDRESS = '0x0000000000000000000000000000000000000000' as const; // TODO: deploy and fill

// Backwards compat alias
export const ARENA_ENGINE_ADDRESS = DIAMOND_ADDRESS;

export const ARENA_ENGINE_ABI = [
  // ─── ArenaFacet ───
  {
    type: 'function',
    name: 'createArena',
    inputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'duration', type: 'uint40' },
    ],
    outputs: [{ name: 'arenaId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'joinArena',
    inputs: [{ name: 'arenaId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'commitPrediction',
    inputs: [
      { name: 'arenaId', type: 'uint256' },
      { name: 'commitHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revealPrediction',
    inputs: [
      { name: 'arenaId', type: 'uint256' },
      { name: 'predWords', type: 'uint256[]' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'finalizeArena',
    inputs: [
      { name: 'arenaId', type: 'uint256' },
      { name: 'players', type: 'address[]' },
      { name: 'predWordsList', type: 'uint256[][]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resetArena',
    inputs: [
      { name: 'arenaId', type: 'uint256' },
      { name: 'duration', type: 'uint40' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setMinWalletBalance',
    inputs: [{ name: '_minBalance', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'minWalletBalance',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextArenaId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getArena',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'startBlock', type: 'uint40' },
          { name: 'endBlock', type: 'uint40' },
          { name: 'pot', type: 'uint128' },
          { name: 'playerCount', type: 'uint16' },
          { name: 'tier', type: 'uint8' },
          { name: 'finalized', type: 'bool' },
          { name: 'tournamentId', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'arenaEpoch',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerState',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'p', type: 'address' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'commitHash', type: 'bytes32' },
          { name: 'revealed', type: 'bool' },
          { name: 'score', type: 'uint16' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPriceTape',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOracleState',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'nextBlock', type: 'uint40' },
          { name: 'ticksRecorded', type: 'uint40' },
          { name: 'lastPrice', type: 'int256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'godStreak',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEntryFee',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'getRakeBps',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'computeCommitHash',
    inputs: [
      { name: 'arenaId', type: 'uint256' },
      { name: 'player', type: 'address' },
      { name: 'salt', type: 'bytes32' },
      { name: 'predWords', type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  // ─── OracleFacet ───
  {
    type: 'function',
    name: 'setOracle',
    inputs: [{ name: 'priceFeed', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'oracle',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'recordTick',
    inputs: [{ name: 'arenaId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'recordTicks',
    inputs: [
      { name: 'arenaId', type: 'uint256' },
      { name: 'maxTicks', type: 'uint40' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // ─── TournamentFacet ───
  {
    type: 'function',
    name: 'createTournament',
    inputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'roundCount', type: 'uint8' },
      { name: 'arenasPerRound', type: 'uint8' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'addArenaToTournament',
    inputs: [
      { name: 'tid', type: 'uint256' },
      { name: 'arenaId', type: 'uint256' },
      { name: 'round', type: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'advanceTournamentRound',
    inputs: [{ name: 'tid', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'finalizeTournament',
    inputs: [
      { name: 'tid', type: 'uint256' },
      { name: 'winners', type: 'address[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'depositTournamentPot',
    inputs: [{ name: 'tid', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'nextTournamentId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTournament',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'tier', type: 'uint8' },
          { name: 'roundCount', type: 'uint8' },
          { name: 'arenasPerRound', type: 'uint8' },
          { name: 'currentRound', type: 'uint8' },
          { name: 'finalized', type: 'bool' },
          { name: 'pot', type: 'uint128' },
          { name: 'creator', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  // ─── FeeFacet ───
  {
    type: 'function',
    name: 'setReferrer',
    inputs: [{ name: '_ref', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawReferralEarnings',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawTreasury',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'treasuryBalance',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'referrer',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'referrerBalance',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setHighlightsNFT',
    inputs: [{ name: '_nft', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'highlightsNFT',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // ─── StreakFacet ───
  {
    type: 'function',
    name: 'getGodStreak',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
  },
  // ─── EmergencyFacet ───
  {
    type: 'function',
    name: 'pause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unpause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'emergencyWithdraw',
    inputs: [
      { name: 'arenaId', type: 'uint256' },
      { name: 'players', type: 'address[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // ─── OwnershipFacet ───
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: '_newOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'acceptOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pendingOwner',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // ─── Events ───
  {
    type: 'event',
    name: 'ArenaCreated',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
      { name: 'tier', type: 'uint8', indexed: false },
      { name: 'entryFee', type: 'uint128', indexed: false },
      { name: 'startBlock', type: 'uint40', indexed: false },
      { name: 'endBlock', type: 'uint40', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PlayerJoined',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true },
      { name: 'ref', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'PredictionCommitted',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'PredictionRevealed',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'ArenaFinalized',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
      { name: 'winnerCount', type: 'uint256', indexed: false },
      { name: 'bestScore', type: 'uint16', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PotDistributed',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'GodStreakUpdate',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'streak', type: 'uint16', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BotDetected',
    inputs: [
      { name: 'player', type: 'address', indexed: false },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ReferralPaid',
    inputs: [
      { name: 'ref', type: 'address', indexed: true },
      { name: 'player', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ArenaReset',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
      { name: 'newEpoch', type: 'uint32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OracleSet',
    inputs: [{ name: 'oracle', type: 'address', indexed: true }],
  },
  {
    type: 'event',
    name: 'TicksRecorded',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
      { name: 'count', type: 'uint40', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TournamentCreated',
    inputs: [
      { name: 'tournamentId', type: 'uint256', indexed: true },
      { name: 'tier', type: 'uint8', indexed: false },
      { name: 'roundCount', type: 'uint8', indexed: false },
      { name: 'arenasPerRound', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TournamentArenaAdded',
    inputs: [
      { name: 'tournamentId', type: 'uint256', indexed: true },
      { name: 'round', type: 'uint8', indexed: false },
      { name: 'arenaId', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TournamentFinalized',
    inputs: [{ name: 'tournamentId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'TournamentPlayerQualified',
    inputs: [
      { name: 'tournamentId', type: 'uint256', indexed: true },
      { name: 'round', type: 'uint8', indexed: false },
      { name: 'player', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'ReferrerSet',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'ref', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'TreasuryWithdrawn',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Paused',
    inputs: [],
  },
  {
    type: 'event',
    name: 'Unpaused',
    inputs: [],
  },
  {
    type: 'event',
    name: 'EmergencyWithdraw',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;
