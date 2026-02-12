export const ARENA_ENGINE_ADDRESS = '0x0000000000000000000000000000000000000000' as const; // TODO: deploy and fill

export const ARENA_ENGINE_ABI = [
  {
    type: 'function',
    name: 'createArena',
    inputs: [
      { name: 'entryFee', type: 'uint128' },
      { name: 'durationInBlocks', type: 'uint40' },
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
      { name: 'bitPackedPredictions', type: 'uint256' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'finalizeArena',
    inputs: [{ name: 'arenaId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getArena',
    inputs: [{ name: 'arenaId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'startBlock', type: 'uint40' },
          { name: 'endBlock', type: 'uint40' },
          { name: 'pot', type: 'uint128' },
          { name: 'playerCount', type: 'uint16' },
          { name: 'entryFee', type: 'uint128' },
          { name: 'finalized', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayers',
    inputs: [{ name: 'arenaId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
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
    name: 'computeCommitHash',
    inputs: [
      { name: 'arenaId', type: 'uint256' },
      { name: 'player', type: 'address' },
      { name: 'salt', type: 'bytes32' },
      { name: 'bitPackedPredictions', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'scores',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'joined',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ArenaCreated',
    inputs: [
      { name: 'arenaId', type: 'uint256', indexed: true },
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
    ],
  },
  {
    type: 'event',
    name: 'ArenaFinalized',
    inputs: [{ name: 'arenaId', type: 'uint256', indexed: true }],
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
] as const;
