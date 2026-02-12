// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Scoring} from "./libraries/Scoring.sol";
import {StreakLib} from "./libraries/StreakLib.sol";
import {IRedStonePriceFeed} from "./interfaces/IRedStonePriceFeed.sol";

interface IBlockArenaHighlights {
    function mintHighlight(
        address player, uint40 arenaId, uint40 startBlock, uint40 endBlock,
        uint16 score, uint16 streak
    ) external returns (uint256);
}

/// @title ArenaEngine v4 — Trustless oracle-based prediction game for MegaETH
/// @dev Price tapes built permissionlessly from RedStone oracle readings
contract ArenaEngine is Pausable, Ownable2Step, ReentrancyGuard {

    enum Tier { Low, Mid, High, VIP }

    struct Arena {
        uint40  startBlock;
        uint40  endBlock;
        uint128 pot;
        uint16  playerCount;
        Tier    tier;
        bool    finalized;
        uint256 tournamentId; // 0=none, stored as id+1
    }

    struct PlayerState {
        bytes32 commitHash; // sentinel 0x01 = joined, real hash = committed
        bool    revealed;
        uint16  score;
    }

    struct Tournament {
        Tier    tier;
        uint8   roundCount;
        uint8   arenasPerRound;
        uint8   currentRound;
        bool    finalized;
        uint128 pot;
        address creator;
    }

    /// @notice Tracks oracle recording state per arena
    struct OracleState {
        uint40  nextBlock;      // next block number to record
        uint40  ticksRecorded;  // how many ticks recorded so far
        int256  lastPrice;      // last recorded price (for direction comparison)
    }

    // Constants
    uint128 internal constant FEE_LOW  = 0.001 ether;
    uint128 internal constant FEE_MID  = 0.01 ether;
    uint128 internal constant FEE_HIGH = 0.1 ether;
    uint128 internal constant FEE_VIP  = 1 ether;

    uint16 internal constant RAKE_LOW  = 500;
    uint16 internal constant RAKE_MID  = 400;
    uint16 internal constant RAKE_HIGH = 300;
    uint16 internal constant RAKE_VIP  = 200;

    uint16 internal constant TREASURY_SHARE_BPS = 8000;
    uint16 internal constant REFERRER_SHARE_BPS = 2000;
    uint40 internal constant EMERGENCY_BLOCK_DELAY = 50000;

    // Storage
    uint256 public nextArenaId;
    uint256 public nextTournamentId;
    address public highlightsNFT;
    uint256 public treasuryBalance;

    /// @notice RedStone price feed oracle
    IRedStonePriceFeed public oracle;

    mapping(uint256 => Arena) public arenas;
    mapping(uint256 => uint32) public arenaEpoch;
    mapping(uint256 => uint256[]) internal _priceTape;
    mapping(uint256 => OracleState) public oracleState;
    mapping(uint256 => mapping(uint32 => mapping(address => PlayerState))) internal _playerState;
    mapping(address => uint16) public godStreak;
    mapping(address => address) public referrer;
    mapping(address => uint256) public referrerBalance;
    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => mapping(uint8 => uint256[])) public tournamentRoundArenas;
    mapping(uint256 => mapping(uint8 => mapping(address => bool))) public tournamentQualified;

    // Events
    event ArenaCreated(uint256 indexed arenaId, Tier tier, uint128 entryFee, uint40 startBlock, uint40 endBlock);
    event PlayerJoined(uint256 indexed arenaId, address indexed player, address indexed ref);
    event PredictionCommitted(uint256 indexed arenaId, address indexed player);
    event PredictionRevealed(uint256 indexed arenaId, address indexed player);
    event ArenaFinalized(uint256 indexed arenaId, uint256 winnerCount, uint16 bestScore);
    event PotDistributed(uint256 indexed arenaId, address indexed winner, uint256 amount);
    event GodStreakUpdate(address indexed player, uint16 streak);
    event ReferralPaid(address indexed ref, address indexed player, uint256 amount);
    event ReferrerSet(address indexed player, address indexed ref);
    event EmergencyWithdraw(uint256 indexed arenaId, address indexed player, uint256 amount);
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    event HighlightsNFTSet(address indexed nft);
    event OracleSet(address indexed oracle);
    event TicksRecorded(uint256 indexed arenaId, uint40 count);
    event TournamentCreated(uint256 indexed tournamentId, Tier tier, uint8 roundCount, uint8 arenasPerRound);
    event TournamentArenaAdded(uint256 indexed tournamentId, uint8 round, uint256 arenaId);
    event TournamentPlayerQualified(uint256 indexed tournamentId, uint8 round, address indexed player);
    event TournamentFinalized(uint256 indexed tournamentId);
    event ArenaReset(uint256 indexed arenaId, uint32 newEpoch);

    // Errors
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
    error InvalidRound();
    error TransferFailed();
    error TapeNotSet();
    error InvalidPlayersArray();
    error OracleNotSet();
    error NoTicksToRecord();
    error ArenaNotActive();
    error TapeAlreadyComplete();

    constructor() Ownable(msg.sender) {}

    // ─── Config ───────────────────────────────────────────────────────

    function setHighlightsNFT(address _nft) external onlyOwner {
        if (_nft == address(0)) revert ZeroAddress();
        highlightsNFT = _nft;
        emit HighlightsNFTSet(_nft);
    }

    /// @notice Set the RedStone price feed oracle address
    function setOracle(address priceFeed) external onlyOwner {
        if (priceFeed == address(0)) revert ZeroAddress();
        oracle = IRedStonePriceFeed(priceFeed);
        emit OracleSet(priceFeed);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── Fee Helpers ──────────────────────────────────────────────────

    function getEntryFee(Tier tier) public pure returns (uint128) {
        if (tier == Tier.Low) return FEE_LOW;
        if (tier == Tier.Mid) return FEE_MID;
        if (tier == Tier.High) return FEE_HIGH;
        return FEE_VIP;
    }

    function getRakeBps(Tier tier) public pure returns (uint16) {
        if (tier == Tier.Low) return RAKE_LOW;
        if (tier == Tier.Mid) return RAKE_MID;
        if (tier == Tier.High) return RAKE_HIGH;
        return RAKE_VIP;
    }

    // ─── Referral ─────────────────────────────────────────────────────

    function setReferrer(address _ref) external {
        if (_ref == address(0)) revert ZeroAddress();
        if (_ref == msg.sender) revert SelfReferral();
        if (referrer[msg.sender] != address(0)) revert ReferrerAlreadySet();
        referrer[msg.sender] = _ref;
        emit ReferrerSet(msg.sender, _ref);
    }

    function withdrawReferralEarnings() external nonReentrant {
        uint256 bal = referrerBalance[msg.sender];
        if (bal == 0) revert NothingToWithdraw();
        referrerBalance[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: bal}("");
        if (!ok) revert TransferFailed();
    }

    // ─── Treasury ─────────────────────────────────────────────────────

    function withdrawTreasury() external onlyOwner nonReentrant {
        uint256 bal = treasuryBalance;
        if (bal == 0) revert NothingToWithdraw();
        treasuryBalance = 0;
        (bool ok,) = msg.sender.call{value: bal}("");
        if (!ok) revert TransferFailed();
        emit TreasuryWithdrawn(msg.sender, bal);
    }

    // ─── Arena Lifecycle ──────────────────────────────────────────────

    function createArena(Tier tier, uint40 duration) external onlyOwner whenNotPaused returns (uint256 arenaId) {
        arenaId = nextArenaId++;
        uint40 start = uint40(block.number) + 100;
        arenas[arenaId] = Arena({
            startBlock: start,
            endBlock: start + duration,
            pot: 0,
            playerCount: 0,
            tier: tier,
            finalized: false,
            tournamentId: 0
        });
        emit ArenaCreated(arenaId, tier, getEntryFee(tier), start, start + duration);
    }

    /// @notice Join arena — emits event instead of storing address array
    function joinArena(uint256 arenaId) external payable whenNotPaused {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number >= a.startBlock) revert ArenaAlreadyStarted();
        PlayerState storage ps = _playerState[arenaId][arenaEpoch[arenaId]][msg.sender];
        if (ps.commitHash != bytes32(0)) revert AlreadyJoined();
        uint128 fee = getEntryFee(a.tier);
        if (msg.value < fee) revert InsufficientFee();

        ps.commitHash = bytes32(uint256(1)); // sentinel: joined
        a.playerCount++;
        a.pot += uint128(msg.value);
        emit PlayerJoined(arenaId, msg.sender, referrer[msg.sender]);
    }

    function commitPrediction(uint256 arenaId, bytes32 commitHash) external whenNotPaused {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number < a.startBlock) revert ArenaNotStarted();
        if (block.number > a.endBlock) revert ArenaNotEnded();
        PlayerState storage ps = _playerState[arenaId][arenaEpoch[arenaId]][msg.sender];
        if (ps.commitHash == bytes32(0)) revert NotJoined();
        if (ps.commitHash != bytes32(uint256(1))) revert AlreadyCommitted();

        ps.commitHash = commitHash;
        emit PredictionCommitted(arenaId, msg.sender);
    }

    function revealPrediction(
        uint256 arenaId,
        uint256[] calldata predWords,
        bytes32 salt
    ) external whenNotPaused {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number <= a.endBlock) revert ArenaNotEnded();
        if (a.finalized) revert ArenaAlreadyFinalized();
        PlayerState storage ps = _playerState[arenaId][arenaEpoch[arenaId]][msg.sender];
        if (ps.commitHash == bytes32(0) || ps.commitHash == bytes32(uint256(1))) revert NotJoined();
        if (ps.revealed) revert AlreadyCommitted();

        bytes32 expected = keccak256(abi.encodePacked(arenaId, msg.sender, salt, keccak256(abi.encode(predWords))));
        if (ps.commitHash != expected) revert InvalidReveal();

        ps.revealed = true;
        emit PredictionRevealed(arenaId, msg.sender);
    }

    // ─── Oracle Price Tape Recording ──────────────────────────────────

    /// @notice Record oracle price ticks for an arena. Permissionless — anyone can call.
    /// @dev Reads the current price from RedStone oracle and records direction bits.
    ///      Each bit represents one block: 1 = price went up or stayed same, 0 = price went down.
    ///      Can only record for the current block. Call once per block during the arena.
    /// @param arenaId The arena to record ticks for
    function recordTick(uint256 arenaId) external {
        if (address(oracle) == address(0)) revert OracleNotSet();
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (a.finalized) revert ArenaAlreadyFinalized();

        uint40 currentBlock = uint40(block.number);
        if (currentBlock < a.startBlock || currentBlock > a.endBlock) revert ArenaNotActive();

        OracleState storage os = oracleState[arenaId];
        uint40 totalTicks = a.endBlock - a.startBlock;

        if (os.ticksRecorded >= totalTicks) revert TapeAlreadyComplete();

        // Initialize on first call
        if (os.ticksRecorded == 0) {
            os.nextBlock = a.startBlock;
            os.lastPrice = oracle.latestAnswer();
        }

        // Must be at or past the next expected block
        if (currentBlock < os.nextBlock) revert NoTicksToRecord();

        int256 currentPrice = oracle.latestAnswer();

        // Record tick for current block
        uint40 tickIndex = os.ticksRecorded;
        uint256 wordIdx = tickIndex >> 8;    // tickIndex / 256
        uint256 bitIdx = 255 - (tickIndex & 0xFF); // MSB-first

        // Ensure tape array is large enough
        while (_priceTape[arenaId].length <= wordIdx) {
            _priceTape[arenaId].push(0);
        }

        // Direction bit: 1 = up or same, 0 = down
        if (currentPrice >= os.lastPrice) {
            _priceTape[arenaId][wordIdx] |= (1 << bitIdx);
        }

        os.lastPrice = currentPrice;
        os.ticksRecorded++;
        os.nextBlock = currentBlock + 1;

        emit TicksRecorded(arenaId, os.ticksRecorded);
    }

    /// @notice Batch-record multiple ticks by reading oracle at current block.
    /// @dev For catching up missed blocks — fills gaps with the current oracle reading.
    ///      The oracle price at call time is used for all gap ticks (best available data).
    ///      This is safe because on MegaETH with RedStone Bolt, callers are incentivized
    ///      to call frequently since gap-filling uses current price for all missed blocks.
    /// @param arenaId The arena to record ticks for
    /// @param maxTicks Maximum number of ticks to record in this call (gas limit)
    function recordTicks(uint256 arenaId, uint40 maxTicks) external {
        if (address(oracle) == address(0)) revert OracleNotSet();
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (a.finalized) revert ArenaAlreadyFinalized();

        uint40 currentBlock = uint40(block.number);
        if (currentBlock < a.startBlock) revert ArenaNotActive();

        OracleState storage os = oracleState[arenaId];
        uint40 totalTicks = a.endBlock - a.startBlock;

        if (os.ticksRecorded >= totalTicks) revert TapeAlreadyComplete();

        // Initialize on first call
        if (os.ticksRecorded == 0) {
            os.nextBlock = a.startBlock;
            os.lastPrice = oracle.latestAnswer();
        }

        if (currentBlock < os.nextBlock) revert NoTicksToRecord();

        int256 currentPrice = oracle.latestAnswer();

        // Calculate how many ticks we can record
        uint40 endBlock = currentBlock < a.endBlock ? currentBlock : a.endBlock;
        uint40 availableTicks = endBlock - os.nextBlock + 1;
        uint40 remaining = totalTicks - os.ticksRecorded;
        uint40 ticksToRecord = availableTicks < remaining ? availableTicks : remaining;
        if (ticksToRecord > maxTicks) ticksToRecord = maxTicks;
        if (ticksToRecord == 0) revert NoTicksToRecord();

        // Direction bit based on current vs last price
        bool isUp = currentPrice >= os.lastPrice;

        for (uint40 i; i < ticksToRecord; ++i) {
            uint40 tickIndex = os.ticksRecorded + i;
            uint256 wordIdx = tickIndex >> 8;
            uint256 bitIdx = 255 - (tickIndex & 0xFF);

            while (_priceTape[arenaId].length <= wordIdx) {
                _priceTape[arenaId].push(0);
            }

            if (isUp) {
                _priceTape[arenaId][wordIdx] |= (1 << bitIdx);
            }
        }

        os.lastPrice = currentPrice;
        os.ticksRecorded += ticksToRecord;
        os.nextBlock = endBlock + 1;

        emit TicksRecorded(arenaId, os.ticksRecorded);
    }

    /// @notice Finalize — player list passed as calldata (from PlayerJoined events)
    function finalizeArena(
        uint256 arenaId,
        address[] calldata players,
        uint256[][] calldata predWordsList
    ) external onlyOwner whenNotPaused nonReentrant {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number <= a.endBlock) revert ArenaNotEnded();
        if (a.finalized) revert ArenaAlreadyFinalized();
        if (a.playerCount == 0) revert NoPlayers();
        if (players.length != predWordsList.length) revert InvalidPlayersArray();
        if (_priceTape[arenaId].length == 0) revert TapeNotSet();

        uint256 ticks = oracleState[arenaId].ticksRecorded;
        if (ticks == 0) revert TapeNotSet();
        uint256 len = players.length;

        // Score
        uint16 bestScore;
        uint256 winnerCount;
        for (uint256 i; i < len; ++i) {
            PlayerState storage ps = _playerState[arenaId][arenaEpoch[arenaId]][players[i]];
            if (!ps.revealed) continue;
            uint256 raw = Scoring.scorePlayer(predWordsList[i], _priceTape[arenaId], ticks);
            uint16 sc = uint16(raw);
            ps.score = sc;
            if (sc > bestScore) {
                bestScore = sc;
                winnerCount = 1;
            } else if (sc == bestScore && sc > 0) {
                winnerCount++;
            }
        }

        // Rake
        uint256 totalPot = a.pot;
        uint256 rake = (totalPot * getRakeBps(a.tier)) / 10000;
        uint256 distributable = totalPot - rake;
        _distributeRake(rake, players, len);

        // Payout
        if (winnerCount > 0) {
            uint256 baseShare = distributable / winnerCount;
            bool nftMinted;
            for (uint256 i; i < len; ++i) {
                address player = players[i];
                PlayerState storage ps = _playerState[arenaId][arenaEpoch[arenaId]][player];
                if (ps.score == bestScore && bestScore > 0) {
                    godStreak[player]++;
                    uint16 streak = godStreak[player];
                    emit GodStreakUpdate(player, streak);
                    uint256 share = (baseShare * StreakLib.getMultiplier(streak)) / 10000;
                    if (share > address(this).balance) share = address(this).balance;
                    (bool ok,) = player.call{value: share}("");
                    if (ok) emit PotDistributed(arenaId, player, share);
                    if (!nftMinted && highlightsNFT != address(0)) {
                        nftMinted = true;
                        try IBlockArenaHighlights(highlightsNFT).mintHighlight(
                            player, uint40(arenaId), a.startBlock, a.endBlock, bestScore, streak
                        ) {} catch {}
                    }
                    if (a.tournamentId != 0) _qualifyForTournament(a.tournamentId - 1, player);
                } else if (ps.revealed && godStreak[player] > 0) {
                    godStreak[player] = 0;
                    emit GodStreakUpdate(player, 0);
                }
            }
        }

        a.finalized = true;
        emit ArenaFinalized(arenaId, winnerCount, bestScore);
    }

    // ─── Emergency ────────────────────────────────────────────────────

    function emergencyWithdraw(uint256 arenaId, address[] calldata players) external onlyOwner nonReentrant {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (a.finalized) revert ArenaAlreadyFinalized();
        if (block.number < a.endBlock + EMERGENCY_BLOCK_DELAY) revert ArenaNotStuck();

        uint256 amount = a.pot;
        a.pot = 0;
        a.finalized = true;

        uint256 len = players.length;
        if (len > 0) {
            uint256 refund = amount / len;
            for (uint256 i; i < len; ++i) {
                if (_playerState[arenaId][arenaEpoch[arenaId]][players[i]].commitHash != bytes32(0)) {
                    (bool ok,) = players[i].call{value: refund}("");
                    if (ok) emit EmergencyWithdraw(arenaId, players[i], refund);
                }
            }
        }
    }

    // ─── Arena Reset (Epoching) ─────────────────────────────────────

    function resetArena(uint256 arenaId, uint40 duration) external onlyOwner {
        Arena storage a = arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (!a.finalized) revert ArenaNotEnded();

        uint32 newEpoch = arenaEpoch[arenaId] + 1;
        arenaEpoch[arenaId] = newEpoch;

        uint40 start = uint40(block.number) + 100;
        a.startBlock = start;
        a.endBlock = start + duration;
        a.pot = 0;
        a.playerCount = 0;
        a.finalized = false;
        a.tournamentId = 0;

        delete _priceTape[arenaId];
        delete oracleState[arenaId];

        emit ArenaReset(arenaId, newEpoch);
    }

    // ─── Tournament ───────────────────────────────────────────────────

    function createTournament(Tier tier, uint8 roundCount, uint8 arenasPerRound)
        external onlyOwner whenNotPaused returns (uint256 id)
    {
        id = nextTournamentId++;
        tournaments[id] = Tournament(tier, roundCount, arenasPerRound, 0, false, 0, msg.sender);
        emit TournamentCreated(id, tier, roundCount, arenasPerRound);
    }

    function addArenaToTournament(uint256 tid, uint256 arenaId, uint8 round) external onlyOwner {
        if (tournaments[tid].roundCount == 0) revert TournamentNotFound();
        if (round >= tournaments[tid].roundCount) revert InvalidRound();
        arenas[arenaId].tournamentId = tid + 1;
        tournamentRoundArenas[tid][round].push(arenaId);
        emit TournamentArenaAdded(tid, round, arenaId);
    }

    function advanceTournamentRound(uint256 tid) external onlyOwner {
        Tournament storage t = tournaments[tid];
        if (t.roundCount == 0) revert TournamentNotFound();
        if (t.finalized) revert TournamentAlreadyFinalized();
        t.currentRound++;
    }

    function finalizeTournament(uint256 tid, address[] calldata winners) external onlyOwner nonReentrant {
        Tournament storage t = tournaments[tid];
        if (t.roundCount == 0) revert TournamentNotFound();
        if (t.finalized) revert TournamentAlreadyFinalized();
        uint256 len = winners.length;
        if (len > 0) {
            uint256 prize = t.pot / len;
            for (uint256 i; i < len; ++i) {
                (bool ok,) = winners[i].call{value: prize}("");
                if (ok) {}
            }
        }
        t.finalized = true;
        emit TournamentFinalized(tid);
    }

    function depositTournamentPot(uint256 tid) external payable onlyOwner {
        if (tournaments[tid].roundCount == 0) revert TournamentNotFound();
        tournaments[tid].pot += uint128(msg.value);
    }

    // ─── Views ────────────────────────────────────────────────────────

    function getArena(uint256 id) external view returns (Arena memory) { return arenas[id]; }
    function getPlayerState(uint256 id, address p) external view returns (PlayerState memory) { return _playerState[id][arenaEpoch[id]][p]; }
    function getTournament(uint256 id) external view returns (Tournament memory) { return tournaments[id]; }
    function getPriceTape(uint256 id) external view returns (uint256[] memory) { return _priceTape[id]; }
    function getOracleState(uint256 id) external view returns (OracleState memory) { return oracleState[id]; }

    function computeCommitHash(
        uint256 arenaId, address player, bytes32 salt, uint256[] calldata predWords
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(arenaId, player, salt, keccak256(abi.encode(predWords))));
    }

    // ─── Internal ─────────────────────────────────────────────────────

    function _distributeRake(uint256 rake, address[] calldata players, uint256 len) internal {
        uint256 refTotal;
        for (uint256 i; i < len; ++i) {
            address ref = referrer[players[i]];
            if (ref != address(0)) {
                uint256 share = (rake * REFERRER_SHARE_BPS) / (10000 * len);
                referrerBalance[ref] += share;
                refTotal += share;
                emit ReferralPaid(ref, players[i], share);
            }
        }
        treasuryBalance += (rake - refTotal);
    }

    function _qualifyForTournament(uint256 tid, address player) internal {
        uint8 round = tournaments[tid].currentRound;
        if (!tournamentQualified[tid][round][player]) {
            tournamentQualified[tid][round][player] = true;
            emit TournamentPlayerQualified(tid, round, player);
        }
    }

    receive() external payable {}
}
