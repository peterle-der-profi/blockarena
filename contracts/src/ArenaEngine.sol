// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface IBlockArenaHighlights {
    function mintHighlight(
        address player, uint40 arenaId, uint40 startBlock, uint40 endBlock,
        uint16 score, uint16 streak
    ) external returns (uint256);
}

/// @title ArenaEngine — Real-time prediction game for MegaETH (v2)
/// @notice Players predict price direction (UP/DOWN) each tick, commit-reveal, top scorers split the pot.
/// @dev Storage-optimized for MegaETH: packed structs, slot reuse, minimal new allocations.
contract ArenaEngine is Pausable {

    // ─── Types ────────────────────────────────────────────────────────

    /// @notice Arena tier determines entry fee and rake percentage
    enum Tier { Low, Mid, High, VIP }

    /// @dev Packed into 2 storage slots (Arena struct = 40 bytes)
    struct Arena {
        uint40  startBlock;    // 5 bytes
        uint40  endBlock;      // 5 bytes
        uint128 pot;           // 16 bytes
        uint16  playerCount;   // 2 bytes
        Tier    tier;          // 1 byte
        bool    finalized;     // 1 byte
        // --- slot boundary (30 bytes above) ---
        uint256 tournamentId;  // 32 bytes (0 = not part of tournament; stored as id+1)
    }

    /// @dev Tournament data
    struct Tournament {
        Tier    tier;           // 1 byte
        uint8   roundCount;     // 1 byte
        uint8   arenasPerRound; // 1 byte
        uint8   currentRound;   // 1 byte
        bool    finalized;      // 1 byte
        uint128 pot;            // 16 bytes
        address creator;        // 20 bytes
    }

    // ─── Constants ────────────────────────────────────────────────────

    /// @dev Entry fees per tier (in wei)
    uint128 internal constant FEE_LOW  = 0.001 ether;
    uint128 internal constant FEE_MID  = 0.01 ether;
    uint128 internal constant FEE_HIGH = 0.1 ether;
    uint128 internal constant FEE_VIP  = 1 ether;

    /// @dev Rake basis points per tier (5%, 4%, 3%, 2%)
    uint16 internal constant RAKE_LOW  = 500;
    uint16 internal constant RAKE_MID  = 400;
    uint16 internal constant RAKE_HIGH = 300;
    uint16 internal constant RAKE_VIP  = 200;

    /// @dev Fee split: 80% treasury, 20% referrer
    uint16 internal constant TREASURY_SHARE_BPS = 8000;
    uint16 internal constant REFERRER_SHARE_BPS = 2000;

    /// @dev Emergency withdraw: arena must be stuck for this many blocks
    uint40 internal constant EMERGENCY_BLOCK_DELAY = 50000;

    /// @dev Streak multiplier constants (basis points: 10000 = 1x)
    uint16 internal constant STREAK_2_MULT  = 11000; // 1.1x
    uint16 internal constant STREAK_3_MULT  = 12000; // 1.2x
    uint16 internal constant STREAK_5_MULT  = 15000; // 1.5x

    // ─── Storage ──────────────────────────────────────────────────────

    uint256 public nextArenaId;
    uint256 public nextTournamentId;
    address public owner;
    address public highlightsNFT;

    /// @dev Accumulated treasury balance
    uint256 public treasuryBalance;

    /// @dev arenaId → Arena metadata
    mapping(uint256 => Arena) public arenas;

    /// @dev arenaId → packed price tape (owner sets after arena ends)
    mapping(uint256 => bytes) public priceTapes;

    /// @dev arenaId → player → commit hash
    mapping(uint256 => mapping(address => bytes32)) public commits;

    /// @dev arenaId → player → revealed predictions (bit-packed)
    mapping(uint256 => mapping(address => uint256)) public reveals;

    /// @dev arenaId → player → bool (joined)
    mapping(uint256 => mapping(address => bool)) public joined;

    /// @dev arenaId → player → score (set during finalize)
    mapping(uint256 => mapping(address => uint256)) public scores;

    /// @dev arenaId → player list for iteration during finalize
    mapping(uint256 => address[]) internal _players;

    /// @dev God streak: consecutive arena wins per player
    mapping(address => uint16) public godStreak;

    /// @dev Referral: player → referrer (one-time, immutable)
    mapping(address => address) public referrer;

    /// @dev Referrer accumulated earnings
    mapping(address => uint256) public referrerBalance;

    /// @dev Tournament data
    mapping(uint256 => Tournament) public tournaments;

    /// @dev Tournament → round → list of arena IDs
    mapping(uint256 => mapping(uint8 => uint256[])) public tournamentRoundArenas;

    /// @dev Tournament → round → qualified players
    mapping(uint256 => mapping(uint8 => mapping(address => bool))) public tournamentQualified;

    /// @dev Tournament → round → qualified player list
    mapping(uint256 => mapping(uint8 => address[])) internal _tournamentQualifiedList;

    // ─── Events ───────────────────────────────────────────────────────

    event ArenaCreated(uint256 indexed arenaId, Tier tier, uint128 entryFee, uint40 startBlock, uint40 endBlock);
    event PlayerJoined(uint256 indexed arenaId, address indexed player);
    event PredictionCommitted(uint256 indexed arenaId, address indexed player);
    event PredictionRevealed(uint256 indexed arenaId, address indexed player, uint256 predictions);
    event ArenaFinalized(uint256 indexed arenaId);
    event PotDistributed(uint256 indexed arenaId, address indexed winner, uint256 amount);
    event GodStreakUpdate(address indexed player, uint16 streak);
    event ReferralPaid(address indexed referrer, address indexed player, uint256 amount);
    event ReferrerSet(address indexed player, address indexed referrer);
    event EmergencyWithdraw(uint256 indexed arenaId, uint256 amount);
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    event HighlightsNFTSet(address indexed nft);
    event TournamentCreated(uint256 indexed tournamentId, Tier tier, uint8 roundCount, uint8 arenasPerRound);
    event TournamentArenaAdded(uint256 indexed tournamentId, uint8 round, uint256 arenaId);
    event TournamentPlayerQualified(uint256 indexed tournamentId, uint8 round, address indexed player);
    event TournamentFinalized(uint256 indexed tournamentId, address indexed winner, uint256 prize);

    // ─── Errors ───────────────────────────────────────────────────────

    error NotOwner();
    error ArenaNotFound();
    error ArenaAlreadyStarted();
    error ArenaNotStarted();
    error ArenaNotEnded();
    error ArenaAlreadyFinalized();
    error AlreadyJoined();
    error InsufficientFee();
    error AlreadyCommitted();
    error NotJoined();
    error InvalidReveal();
    error NoPlayers();
    error ReferrerAlreadySet();
    error SelfReferral();
    error ZeroAddress();
    error ArenaNotStuck();
    error NothingToWithdraw();
    error TournamentNotFound();
    error TournamentAlreadyFinalized();
    error NotQualified();
    error InvalidRound();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Configuration ────────────────────────────────────────────────

    /// @notice Set the Highlights NFT contract address
    function setHighlightsNFT(address _nft) external onlyOwner {
        if (_nft == address(0)) revert ZeroAddress();
        highlightsNFT = _nft;
        emit HighlightsNFTSet(_nft);
    }

    /// @notice Pause all state-changing operations
    function pause() external onlyOwner { _pause(); }

    /// @notice Unpause
    function unpause() external onlyOwner { _unpause(); }

    // ─── Fee Helpers ──────────────────────────────────────────────────

    /// @notice Get entry fee for a tier
    function getEntryFee(Tier tier) public pure returns (uint128) {
        if (tier == Tier.Low)  return FEE_LOW;
        if (tier == Tier.Mid)  return FEE_MID;
        if (tier == Tier.High) return FEE_HIGH;
        return FEE_VIP;
    }

    /// @notice Get rake basis points for a tier
    function getRakeBps(Tier tier) public pure returns (uint16) {
        if (tier == Tier.Low)  return RAKE_LOW;
        if (tier == Tier.Mid)  return RAKE_MID;
        if (tier == Tier.High) return RAKE_HIGH;
        return RAKE_VIP;
    }

    // ─── Referral System ──────────────────────────────────────────────

    /// @notice Set referrer — one-time per player
    function setReferrer(address _referrer) external {
        if (_referrer == address(0)) revert ZeroAddress();
        if (_referrer == msg.sender) revert SelfReferral();
        if (referrer[msg.sender] != address(0)) revert ReferrerAlreadySet();
        referrer[msg.sender] = _referrer;
        emit ReferrerSet(msg.sender, _referrer);
    }

    /// @notice Referrer withdraws accumulated earnings
    function withdrawReferralEarnings() external {
        uint256 bal = referrerBalance[msg.sender];
        if (bal == 0) revert NothingToWithdraw();
        referrerBalance[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: bal}("");
        if (!ok) revert TransferFailed();
    }

    // ─── Treasury ─────────────────────────────────────────────────────

    /// @notice Owner withdraws accumulated treasury
    function withdrawTreasury() external onlyOwner {
        uint256 bal = treasuryBalance;
        if (bal == 0) revert NothingToWithdraw();
        treasuryBalance = 0;
        (bool ok,) = msg.sender.call{value: bal}("");
        if (!ok) revert TransferFailed();
        emit TreasuryWithdrawn(msg.sender, bal);
    }

    // ─── Arena Lifecycle ──────────────────────────────────────────────

    /// @notice Create a new arena with a specific tier
    function createArena(Tier tier, uint40 durationInBlocks) external onlyOwner whenNotPaused returns (uint256 arenaId) {
        arenaId = nextArenaId++;
        uint40 start = uint40(block.number) + 100;
        uint128 entryFee = getEntryFee(tier);
        arenas[arenaId] = Arena({
            startBlock: start,
            endBlock: start + durationInBlocks,
            pot: 0,
            playerCount: 0,
            tier: tier,
            finalized: false,
            tournamentId: 0
        });
        emit ArenaCreated(arenaId, tier, entryFee, start, start + durationInBlocks);
    }

    /// @notice Join an arena before it starts, paying the entry fee.
    function joinArena(uint256 arenaId) external payable whenNotPaused {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number >= a.startBlock) revert ArenaAlreadyStarted();
        if (joined[arenaId][msg.sender]) revert AlreadyJoined();
        uint128 fee = getEntryFee(a.tier);
        if (msg.value < fee) revert InsufficientFee();

        joined[arenaId][msg.sender] = true;
        _players[arenaId].push(msg.sender);
        a.playerCount++;
        a.pot += uint128(msg.value);

        emit PlayerJoined(arenaId, msg.sender);
    }

    /// @notice Commit hashed prediction during the arena.
    function commitPrediction(uint256 arenaId, bytes32 commitHash) external whenNotPaused {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number < a.startBlock) revert ArenaNotStarted();
        if (block.number > a.endBlock) revert ArenaNotEnded();
        if (!joined[arenaId][msg.sender]) revert NotJoined();
        if (commits[arenaId][msg.sender] != bytes32(0)) revert AlreadyCommitted();

        commits[arenaId][msg.sender] = commitHash;
        emit PredictionCommitted(arenaId, msg.sender);
    }

    /// @notice Reveal prediction after arena ends.
    function revealPrediction(uint256 arenaId, uint256 bitPackedPredictions, bytes32 salt) external whenNotPaused {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number <= a.endBlock) revert ArenaNotEnded();
        if (a.finalized) revert ArenaAlreadyFinalized();
        if (!joined[arenaId][msg.sender]) revert NotJoined();

        bytes32 expected = keccak256(abi.encodePacked(arenaId, msg.sender, salt, bitPackedPredictions));
        if (commits[arenaId][msg.sender] != expected) revert InvalidReveal();

        reveals[arenaId][msg.sender] = bitPackedPredictions;
        emit PredictionRevealed(arenaId, msg.sender, bitPackedPredictions);
    }

    /// @notice Owner submits the actual price tape after arena ends.
    function submitPriceTape(uint256 arenaId, bytes calldata packedPriceTape) external onlyOwner {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number <= a.endBlock) revert ArenaNotEnded();
        priceTapes[arenaId] = packedPriceTape;
    }

    /// @notice Finalize arena: score players, distribute pot to top scorer(s).
    /// @dev Takes rake, splits fees, tracks god streaks, mints highlight NFT.
    function finalizeArena(uint256 arenaId) external whenNotPaused {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number <= a.endBlock) revert ArenaNotEnded();
        if (a.finalized) revert ArenaAlreadyFinalized();
        if (a.playerCount == 0) revert NoPlayers();

        bytes memory tape = priceTapes[arenaId];
        uint256 tapeWord;
        if (tape.length >= 32) {
            assembly { tapeWord := mload(add(tape, 32)) }
        } else {
            for (uint256 i = 0; i < tape.length; i++) {
                tapeWord |= uint256(uint8(tape[i])) << (248 - i * 8);
            }
        }

        uint256 numTicks = (a.endBlock - a.startBlock);
        if (numTicks > 256) numTicks = 256;

        address[] storage players = _players[arenaId];
        uint256 len = players.length;

        // Score each player
        uint256 bestScore = 0;
        for (uint256 i = 0; i < len; i++) {
            uint256 pred = reveals[arenaId][players[i]];
            if (pred == 0 && commits[arenaId][players[i]] == bytes32(0)) continue;

            uint256 diff = pred ^ tapeWord;
            uint256 mask = numTicks == 256 ? type(uint256).max : ((1 << numTicks) - 1) << (256 - numTicks);
            uint256 wrong = _popcount(diff & mask);
            uint256 score = numTicks - wrong;

            scores[arenaId][players[i]] = score;
            if (score > bestScore) bestScore = score;
        }

        // Calculate rake
        uint256 totalPot = a.pot;
        uint16 rakeBps = getRakeBps(a.tier);
        uint256 rake = (totalPot * rakeBps) / 10000;
        uint256 distributablePot = totalPot - rake;

        // Split rake: treasury + referrer fees
        _distributeRake(rake, players, len);

        // Find winners and distribute
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < len; i++) {
            if (scores[arenaId][players[i]] == bestScore && bestScore > 0) {
                winnerCount++;
            }
        }

        if (winnerCount > 0) {
            // Calculate base share
            uint256 baseShare = distributablePot / winnerCount;

            for (uint256 i = 0; i < len; i++) {
                address player = players[i];
                bool isWinner = scores[arenaId][player] == bestScore && bestScore > 0;

                if (isWinner) {
                    // Update god streak
                    godStreak[player]++;
                    uint16 streak = godStreak[player];
                    emit GodStreakUpdate(player, streak);

                    // Apply streak multiplier
                    uint256 share = _applyStreakMultiplier(baseShare, streak);

                    // Cap share to available balance (multiplier can exceed pot in edge cases)
                    if (share > address(this).balance) share = address(this).balance;

                    (bool ok,) = player.call{value: share}("");
                    if (ok) emit PotDistributed(arenaId, player, share);

                    // Mint highlight NFT for top scorer (first winner only)
                    if (i == _firstWinnerIndex(players, len, bestScore, arenaId) && highlightsNFT != address(0)) {
                        try IBlockArenaHighlights(highlightsNFT).mintHighlight(
                            player,
                            uint40(arenaId),
                            a.startBlock,
                            a.endBlock,
                            uint16(bestScore),
                            streak
                        ) {} catch {}
                    }

                    // Qualify for tournament if applicable (tournamentId stored as id+1)
                    if (a.tournamentId != 0) {
                        _qualifyForTournament(a.tournamentId - 1, player);
                    }
                } else {
                    // Reset god streak on loss (player participated but didn't win)
                    if (godStreak[player] > 0) {
                        godStreak[player] = 0;
                        emit GodStreakUpdate(player, 0);
                    }
                }
            }
        }

        a.finalized = true;
        emit ArenaFinalized(arenaId);
    }

    // ─── Emergency Controls ───────────────────────────────────────────

    /// @notice Emergency withdraw if arena is stuck (not finalized after EMERGENCY_BLOCK_DELAY blocks past end)
    function emergencyWithdraw(uint256 arenaId) external onlyOwner {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (a.finalized) revert ArenaAlreadyFinalized();
        if (block.number < a.endBlock + EMERGENCY_BLOCK_DELAY) revert ArenaNotStuck();

        uint256 amount = a.pot;
        a.pot = 0;
        a.finalized = true;

        // Refund equally to all players
        address[] storage players = _players[arenaId];
        uint256 len = players.length;
        if (len > 0) {
            uint256 refund = amount / len;
            for (uint256 i = 0; i < len; i++) {
                (bool ok,) = players[i].call{value: refund}("");
                if (ok) {} // best effort
            }
        }

        emit EmergencyWithdraw(arenaId, amount);
    }

    // ─── Tournament Mode ──────────────────────────────────────────────

    /// @notice Create a tournament
    function createTournament(
        Tier tier,
        uint8 roundCount,
        uint8 arenasPerRound
    ) external onlyOwner whenNotPaused returns (uint256 tournamentId) {
        tournamentId = nextTournamentId++;
        tournaments[tournamentId] = Tournament({
            tier: tier,
            roundCount: roundCount,
            arenasPerRound: arenasPerRound,
            currentRound: 0,
            finalized: false,
            pot: 0,
            creator: msg.sender
        });
        emit TournamentCreated(tournamentId, tier, roundCount, arenasPerRound);
    }

    /// @notice Add an arena to a tournament round
    function addArenaToTournament(uint256 tournamentId, uint256 arenaId, uint8 round) external onlyOwner {
        if (tournaments[tournamentId].roundCount == 0) revert TournamentNotFound();
        if (round >= tournaments[tournamentId].roundCount) revert InvalidRound();

        arenas[arenaId].tournamentId = tournamentId + 1; // +1 so 0 means "no tournament"
        tournamentRoundArenas[tournamentId][round].push(arenaId);
        emit TournamentArenaAdded(tournamentId, round, arenaId);
    }

    /// @notice Advance tournament to next round
    function advanceTournamentRound(uint256 tournamentId) external onlyOwner {
        Tournament storage t = tournaments[tournamentId];
        if (t.roundCount == 0) revert TournamentNotFound();
        if (t.finalized) revert TournamentAlreadyFinalized();
        t.currentRound++;
    }

    /// @notice Finalize tournament — award pot to winner (must be last round, single qualified player)
    function finalizeTournament(uint256 tournamentId) external onlyOwner {
        Tournament storage t = tournaments[tournamentId];
        if (t.roundCount == 0) revert TournamentNotFound();
        if (t.finalized) revert TournamentAlreadyFinalized();

        uint8 lastRound = t.roundCount - 1;
        address[] storage qualifiedPlayers = _tournamentQualifiedList[tournamentId][lastRound];
        uint256 len = qualifiedPlayers.length;

        if (len > 0) {
            uint256 prize = t.pot / len;
            for (uint256 i = 0; i < len; i++) {
                (bool ok,) = qualifiedPlayers[i].call{value: prize}("");
                if (ok) emit TournamentFinalized(tournamentId, qualifiedPlayers[i], prize);
            }
        }

        t.finalized = true;
    }

    /// @notice Deposit into tournament pot
    function depositTournamentPot(uint256 tournamentId) external payable onlyOwner {
        if (tournaments[tournamentId].roundCount == 0) revert TournamentNotFound();
        tournaments[tournamentId].pot += uint128(msg.value);
    }

    // ─── View Helpers ─────────────────────────────────────────────────

    function getPlayers(uint256 arenaId) external view returns (address[] memory) {
        return _players[arenaId];
    }

    function getArena(uint256 arenaId) external view returns (Arena memory) {
        return arenas[arenaId];
    }

    function getTournament(uint256 tournamentId) external view returns (Tournament memory) {
        return tournaments[tournamentId];
    }

    function getTournamentRoundArenas(uint256 tournamentId, uint8 round) external view returns (uint256[] memory) {
        return tournamentRoundArenas[tournamentId][round];
    }

    function getTournamentQualifiedPlayers(uint256 tournamentId, uint8 round) external view returns (address[] memory) {
        return _tournamentQualifiedList[tournamentId][round];
    }

    function getStreakMultiplier(uint16 streak) external pure returns (uint16) {
        return _getStreakMultiplier(streak);
    }

    /// @notice Compute commit hash off-chain helper
    function computeCommitHash(
        uint256 arenaId, address player, bytes32 salt, uint256 bitPackedPredictions
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(arenaId, player, salt, bitPackedPredictions));
    }

    // ─── Internal ─────────────────────────────────────────────────────

    /// @dev Distribute rake: 80% treasury, 20% to referrers of participating players
    function _distributeRake(uint256 rake, address[] storage players, uint256 len) internal {
        uint256 referrerTotal = 0;

        for (uint256 i = 0; i < len; i++) {
            address ref = referrer[players[i]];
            if (ref != address(0)) {
                // Each player's share of referrer portion: (rake * 20%) / playerCount
                uint256 playerReferrerShare = (rake * REFERRER_SHARE_BPS) / (10000 * len);
                referrerBalance[ref] += playerReferrerShare;
                referrerTotal += playerReferrerShare;
                emit ReferralPaid(ref, players[i], playerReferrerShare);
            }
        }

        treasuryBalance += (rake - referrerTotal);
    }

    /// @dev Apply god streak multiplier to pot share
    function _applyStreakMultiplier(uint256 baseShare, uint16 streak) internal pure returns (uint256) {
        uint16 mult = _getStreakMultiplier(streak);
        return (baseShare * mult) / 10000;
    }

    /// @dev Get streak multiplier in basis points (10000 = 1x)
    function _getStreakMultiplier(uint16 streak) internal pure returns (uint16) {
        if (streak >= 5) return STREAK_5_MULT;
        if (streak >= 3) return STREAK_3_MULT;
        if (streak >= 2) return STREAK_2_MULT;
        return 10000; // 1x
    }

    /// @dev Find first winner index (for NFT minting)
    function _firstWinnerIndex(
        address[] storage players, uint256 len, uint256 bestScore, uint256 arenaId
    ) internal view returns (uint256) {
        for (uint256 i = 0; i < len; i++) {
            if (scores[arenaId][players[i]] == bestScore) return i;
        }
        return 0;
    }

    /// @dev Qualify player for current tournament round
    function _qualifyForTournament(uint256 tournamentId, address player) internal {
        Tournament storage t = tournaments[tournamentId];
        uint8 round = t.currentRound;
        if (!tournamentQualified[tournamentId][round][player]) {
            tournamentQualified[tournamentId][round][player] = true;
            _tournamentQualifiedList[tournamentId][round].push(player);
            emit TournamentPlayerQualified(tournamentId, round, player);
        }
    }

    /// @dev Popcount (Hamming weight) of a uint256.
    function _popcount(uint256 x) internal pure returns (uint256 count) {
        while (x != 0) {
            x &= x - 1;
            count++;
        }
    }

    receive() external payable {}
}
