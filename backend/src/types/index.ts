export interface ArenaRow {
  id: number;
  arena_id: string;
  tier: number;
  entry_fee: string;
  duration_sec: number;
  start_block: number;
  end_block: number;
  status: 'upcoming' | 'active' | 'revealing' | 'finalized';
  asset_pair: string;
  created_at: string;
  finalized_at: string | null;
  tx_hash: string;
}

export interface PlayerRow {
  id: number;
  arena_id: string;
  address: string;
  joined_at: string;
  commitment_hash: string | null;
  prediction: number | null; // 1 = up, 0 = down
  revealed: boolean;
  score: number | null;
  payout: string | null;
}

export interface PlayerStatsRow {
  address: string;
  total_arenas: number;
  wins: number;
  losses: number;
  total_pnl: string;
  current_streak: number;
  best_streak: number;
  god_streak: number;
}

export interface ReferralRow {
  id: number;
  referrer: string;
  referee: string;
  arena_id: string;
  reward: string;
  created_at: string;
}

export interface TournamentRow {
  id: number;
  tournament_id: string;
  name: string;
  status: 'upcoming' | 'active' | 'finalized';
  start_time: string;
  end_time: string;
  arena_ids: string; // JSON array
}

export interface LeaderboardEntry {
  address: string;
  wins: number;
  total_arenas: number;
  win_rate: number;
  total_pnl: string;
  best_streak: number;
}

export interface WSMessage {
  type: string;
  data: unknown;
}

export const ARENA_ENGINE_ABI = [
  // ArenaFacet
  "event ArenaCreated(uint256 indexed arenaId, uint8 tier, uint128 entryFee, uint40 startBlock, uint40 endBlock)",
  "event PlayerJoined(uint256 indexed arenaId, address indexed player, address indexed ref)",
  "event PredictionCommitted(uint256 indexed arenaId, address indexed player)",
  "event PredictionRevealed(uint256 indexed arenaId, address indexed player)",
  "event ArenaFinalized(uint256 indexed arenaId, uint256 winnerCount, uint16 bestScore)",
  "event GodStreakUpdate(address indexed player, uint16 streak)",
  "event PotDistributed(uint256 indexed arenaId, address indexed winner, uint256 amount)",
  "event ReferralPaid(address indexed ref, address indexed player, uint256 amount)",
  "event ArenaReset(uint256 indexed arenaId, uint32 newEpoch)",
  "event BotDetected(address player, string reason)",
  "event TournamentPlayerQualified(uint256 indexed tournamentId, uint8 round, address indexed player)",
  "function createArena(uint8 tier, uint40 duration) external returns (uint256)",
  "function joinArena(uint256 arenaId) external payable",
  "function commitPrediction(uint256 arenaId, bytes32 commitHash) external",
  "function revealPrediction(uint256 arenaId, uint256[] calldata predWords, bytes32 salt) external",
  "function finalizeArena(uint256 arenaId, address[] calldata players, uint256[][] calldata predWordsList) external",
  "function resetArena(uint256 arenaId, uint40 duration) external",
  "function setMinWalletBalance(uint256 _minBalance) external",
  "function minWalletBalance() external view returns (uint256)",
  "function nextArenaId() external view returns (uint256)",
  "function getArena(uint256 id) external view returns (tuple(uint40 startBlock, uint40 endBlock, uint128 pot, uint16 playerCount, uint8 tier, bool finalized, uint256 tournamentId))",
  "function arenaEpoch(uint256 id) external view returns (uint32)",
  "function getPlayerState(uint256 id, address p) external view returns (tuple(bytes32 commitHash, bool revealed, uint16 score))",
  "function getPriceTape(uint256 id) external view returns (uint256[])",
  "function getOracleState(uint256 id) external view returns (tuple(uint40 nextBlock, uint40 ticksRecorded, int256 lastPrice))",
  "function godStreak(address player) external view returns (uint16)",
  "function getEntryFee(uint8 tier) external pure returns (uint128)",
  "function getRakeBps(uint8 tier) external pure returns (uint16)",
  "function computeCommitHash(uint256 arenaId, address player, bytes32 salt, uint256[] calldata predWords) external pure returns (bytes32)",
  // OracleFacet
  "event OracleSet(address indexed oracle)",
  "event TicksRecorded(uint256 indexed arenaId, uint40 count)",
  "function setOracle(address priceFeed) external",
  "function oracle() external view returns (address)",
  "function recordTick(uint256 arenaId) external",
  "function recordTicks(uint256 arenaId, uint40 maxTicks) external",
  // TournamentFacet
  "event TournamentCreated(uint256 indexed tournamentId, uint8 tier, uint8 roundCount, uint8 arenasPerRound)",
  "event TournamentArenaAdded(uint256 indexed tournamentId, uint8 round, uint256 arenaId)",
  "event TournamentFinalized(uint256 indexed tournamentId)",
  "function createTournament(uint8 tier, uint8 roundCount, uint8 arenasPerRound) external returns (uint256)",
  "function addArenaToTournament(uint256 tid, uint256 arenaId, uint8 round) external",
  "function advanceTournamentRound(uint256 tid) external",
  "function finalizeTournament(uint256 tid, address[] calldata winners) external",
  "function depositTournamentPot(uint256 tid) external payable",
  "function nextTournamentId() external view returns (uint256)",
  "function getTournament(uint256 id) external view returns (tuple(uint8 tier, uint8 roundCount, uint8 arenasPerRound, uint8 currentRound, bool finalized, uint128 pot, address creator))",
  // FeeFacet
  "event ReferrerSet(address indexed player, address indexed ref)",
  "event TreasuryWithdrawn(address indexed to, uint256 amount)",
  "function setReferrer(address _ref) external",
  "function withdrawReferralEarnings() external",
  "function withdrawTreasury() external",
  "function treasuryBalance() external view returns (uint256)",
  "function referrer(address player) external view returns (address)",
  "function referrerBalance(address player) external view returns (uint256)",
  "function setHighlightsNFT(address _nft) external",
  "function highlightsNFT() external view returns (address)",
  // StreakFacet
  "function getGodStreak(address player) external view returns (uint16)",
  // EmergencyFacet
  "event Paused()",
  "event Unpaused()",
  "event EmergencyWithdraw(uint256 indexed arenaId, address indexed player, uint256 amount)",
  "function pause() external",
  "function unpause() external",
  "function paused() external view returns (bool)",
  "function emergencyWithdraw(uint256 arenaId, address[] calldata players) external",
  // OwnershipFacet
  "function transferOwnership(address _newOwner) external",
  "function acceptOwnership() external",
  "function owner() external view returns (address)",
  "function pendingOwner() external view returns (address)"
];

export const REDSTONE_PRICE_FEED_ABI = [
  "function getLatestPrice(bytes32 dataFeedId) external view returns (uint256, uint256)",
  "function getPriceAtBlock(bytes32 dataFeedId, uint256 blockNumber) external view returns (uint256)"
];
