// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibBlockArena} from "../libraries/LibBlockArena.sol";
import {Scoring} from "../libraries/Scoring.sol";
import {StreakLib} from "../libraries/StreakLib.sol";

interface IBlockArenaHighlights {
    function mintHighlight(
        address player, uint40 arenaId, uint40 startBlock, uint40 endBlock,
        uint16 score, uint16 streak
    ) external returns (uint256);
}

/// @title ArenaFacet — Arena lifecycle (create, join, commit, reveal, finalize)
contract ArenaFacet {
    // Events
    event ArenaCreated(uint256 indexed arenaId, LibBlockArena.Tier tier, uint128 entryFee, uint40 startBlock, uint40 endBlock);
    event PlayerJoined(uint256 indexed arenaId, address indexed player, address indexed ref);
    event PredictionCommitted(uint256 indexed arenaId, address indexed player);
    event PredictionRevealed(uint256 indexed arenaId, address indexed player);
    event ArenaFinalized(uint256 indexed arenaId, uint256 winnerCount, uint16 bestScore);
    event PotDistributed(uint256 indexed arenaId, address indexed winner, uint256 amount);
    event GodStreakUpdate(address indexed player, uint16 streak);
    event ReferralPaid(address indexed ref, address indexed player, uint256 amount);
    event ArenaReset(uint256 indexed arenaId, uint32 newEpoch);
    event TournamentPlayerQualified(uint256 indexed tournamentId, uint8 round, address indexed player);

    event BotDetected(address player, string reason);

    // Errors
    error ArenaNotFound();
    error RateLimited();
    error InsufficientBalance();
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
    error TapeNotSet();
    error InvalidPlayersArray();
    error TransferFailed();

    function createArena(LibBlockArena.Tier tier, uint40 duration) external returns (uint256 arenaId) {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.enforceNotPaused();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();

        arenaId = s.nextArenaId++;
        uint40 start = uint40(block.number) + 100;
        s.arenas[arenaId] = LibBlockArena.Arena({
            startBlock: start,
            endBlock: start + duration,
            pot: 0,
            playerCount: 0,
            tier: tier,
            finalized: false,
            tournamentId: 0
        });
        emit ArenaCreated(arenaId, tier, LibBlockArena.getEntryFee(tier), start, start + duration);
    }

    function setMinWalletBalance(uint256 _minBalance) external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.appStorage().minWalletBalance = _minBalance;
    }

    function minWalletBalance() external view returns (uint256) {
        return LibBlockArena.appStorage().minWalletBalance;
    }

    function joinArena(uint256 arenaId) external payable {
        LibBlockArena.enforceNotPaused();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();

        // Anti-bot: rate limit 1 join per block
        if (s.lastArenaJoinBlock[msg.sender] == block.number) {
            emit BotDetected(msg.sender, "rate-limited");
            revert RateLimited();
        }
        s.lastArenaJoinBlock[msg.sender] = block.number;

        // Anti-bot: minimum wallet balance
        if (s.minWalletBalance > 0 && msg.sender.balance < s.minWalletBalance) {
            emit BotDetected(msg.sender, "low-balance");
            revert InsufficientBalance();
        }

        LibBlockArena.Arena storage a = s.arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number >= a.startBlock) revert ArenaAlreadyStarted();
        LibBlockArena.PlayerState storage ps = s.playerState[arenaId][s.arenaEpoch[arenaId]][msg.sender];
        if (ps.commitHash != bytes32(0)) revert AlreadyJoined();
        uint128 fee = LibBlockArena.getEntryFee(a.tier);
        if (msg.value < fee) revert InsufficientFee();

        ps.commitHash = bytes32(uint256(1));
        a.playerCount++;
        a.pot += uint128(msg.value);
        emit PlayerJoined(arenaId, msg.sender, s.referrer[msg.sender]);
    }

    function commitPrediction(uint256 arenaId, bytes32 commitHash) external {
        LibBlockArena.enforceNotPaused();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        LibBlockArena.Arena storage a = s.arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number < a.startBlock) revert ArenaNotStarted();
        if (block.number > a.endBlock) revert ArenaNotEnded();
        LibBlockArena.PlayerState storage ps = s.playerState[arenaId][s.arenaEpoch[arenaId]][msg.sender];
        if (ps.commitHash == bytes32(0)) revert NotJoined();
        if (ps.commitHash != bytes32(uint256(1))) revert AlreadyCommitted();

        ps.commitHash = commitHash;
        emit PredictionCommitted(arenaId, msg.sender);
    }

    function revealPrediction(uint256 arenaId, uint256[] calldata predWords, bytes32 salt) external {
        LibBlockArena.enforceNotPaused();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        LibBlockArena.Arena storage a = s.arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number <= a.endBlock) revert ArenaNotEnded();
        if (a.finalized) revert ArenaAlreadyFinalized();
        LibBlockArena.PlayerState storage ps = s.playerState[arenaId][s.arenaEpoch[arenaId]][msg.sender];
        if (ps.commitHash == bytes32(0) || ps.commitHash == bytes32(uint256(1))) revert NotJoined();
        if (ps.revealed) revert AlreadyCommitted();

        bytes32 expected = keccak256(abi.encodePacked(arenaId, msg.sender, salt, keccak256(abi.encode(predWords))));
        if (ps.commitHash != expected) revert InvalidReveal();

        ps.revealed = true;
        emit PredictionRevealed(arenaId, msg.sender);
    }

    function finalizeArena(
        uint256 arenaId,
        address[] calldata players,
        uint256[][] calldata predWordsList
    ) external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.enforceNotPaused();
        LibBlockArena.enforceNonReentrant();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();

        LibBlockArena.Arena storage a = s.arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (block.number <= a.endBlock) revert ArenaNotEnded();
        if (a.finalized) revert ArenaAlreadyFinalized();
        if (a.playerCount == 0) revert NoPlayers();
        if (players.length != predWordsList.length) revert InvalidPlayersArray();
        if (s.priceTapeWords[arenaId].length == 0) revert TapeNotSet();

        uint256 ticks = s.oracleState[arenaId].ticksRecorded;
        if (ticks == 0) revert TapeNotSet();
        uint256 len = players.length;

        // Score
        uint16 bestScore;
        uint256 winnerCount;
        for (uint256 i; i < len; ++i) {
            LibBlockArena.PlayerState storage ps = s.playerState[arenaId][s.arenaEpoch[arenaId]][players[i]];
            if (!ps.revealed) continue;
            uint256 raw = Scoring.scorePlayer(predWordsList[i], s.priceTapeWords[arenaId], ticks);
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
        uint256 rake = (totalPot * LibBlockArena.getRakeBps(a.tier)) / 10000;
        uint256 distributable = totalPot - rake;
        _distributeRake(s, rake, players, len);

        // Payout
        if (winnerCount > 0) {
            uint256 baseShare = distributable / winnerCount;
            bool nftMinted;
            for (uint256 i; i < len; ++i) {
                address player = players[i];
                LibBlockArena.PlayerState storage ps = s.playerState[arenaId][s.arenaEpoch[arenaId]][player];
                if (ps.score == bestScore && bestScore > 0) {
                    s.godStreak[player]++;
                    uint16 streak = s.godStreak[player];
                    emit GodStreakUpdate(player, streak);
                    uint256 share = (baseShare * StreakLib.getMultiplier(streak)) / 10000;
                    if (share > address(this).balance) share = address(this).balance;
                    (bool ok,) = player.call{value: share}("");
                    if (ok) emit PotDistributed(arenaId, player, share);
                    if (!nftMinted && s.highlightsNFT != address(0)) {
                        nftMinted = true;
                        try IBlockArenaHighlights(s.highlightsNFT).mintHighlight(
                            player, uint40(arenaId), a.startBlock, a.endBlock, bestScore, streak
                        ) {} catch {}
                    }
                    if (a.tournamentId != 0) _qualifyForTournament(s, a.tournamentId - 1, player);
                } else if (ps.revealed && s.godStreak[player] > 0) {
                    s.godStreak[player] = 0;
                    emit GodStreakUpdate(player, 0);
                }
            }
        }

        a.finalized = true;
        emit ArenaFinalized(arenaId, winnerCount, bestScore);
        LibBlockArena.clearReentrancy();
    }

    function resetArena(uint256 arenaId, uint40 duration) external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        LibBlockArena.Arena storage a = s.arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (!a.finalized) revert ArenaNotEnded();

        uint32 newEpoch = s.arenaEpoch[arenaId] + 1;
        s.arenaEpoch[arenaId] = newEpoch;

        uint40 start = uint40(block.number) + 100;
        a.startBlock = start;
        a.endBlock = start + duration;
        a.pot = 0;
        a.playerCount = 0;
        a.finalized = false;
        a.tournamentId = 0;

        delete s.priceTapeWords[arenaId];
        delete s.oracleState[arenaId];

        emit ArenaReset(arenaId, newEpoch);
    }

    // ─── Views ────────────────────────────────────────────────────────

    function nextArenaId() external view returns (uint256) {
        return LibBlockArena.appStorage().nextArenaId;
    }

    function getArena(uint256 id) external view returns (LibBlockArena.Arena memory) {
        return LibBlockArena.appStorage().arenas[id];
    }

    function arenaEpoch(uint256 id) external view returns (uint32) {
        return LibBlockArena.appStorage().arenaEpoch[id];
    }

    function getPlayerState(uint256 id, address p) external view returns (LibBlockArena.PlayerState memory) {
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        return s.playerState[id][s.arenaEpoch[id]][p];
    }

    function getPriceTape(uint256 id) external view returns (uint256[] memory) {
        return LibBlockArena.appStorage().priceTapeWords[id];
    }

    function getOracleState(uint256 id) external view returns (LibBlockArena.OracleState memory) {
        return LibBlockArena.appStorage().oracleState[id];
    }

    function godStreak(address player) external view returns (uint16) {
        return LibBlockArena.appStorage().godStreak[player];
    }

    function getEntryFee(LibBlockArena.Tier tier) external pure returns (uint128) {
        return LibBlockArena.getEntryFee(tier);
    }

    function getRakeBps(LibBlockArena.Tier tier) external pure returns (uint16) {
        return LibBlockArena.getRakeBps(tier);
    }

    function computeCommitHash(
        uint256 arenaId, address player, bytes32 salt, uint256[] calldata predWords
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(arenaId, player, salt, keccak256(abi.encode(predWords))));
    }

    // ─── Internal ─────────────────────────────────────────────────────

    function _distributeRake(LibBlockArena.AppStorage storage s, uint256 rake, address[] calldata players, uint256 len) internal {
        uint256 refTotal;
        for (uint256 i; i < len; ++i) {
            address ref = s.referrer[players[i]];
            if (ref != address(0)) {
                uint256 share = (rake * LibBlockArena.REFERRER_SHARE_BPS) / (10000 * len);
                s.referrerBalance[ref] += share;
                refTotal += share;
                emit ReferralPaid(ref, players[i], share);
            }
        }
        s.treasuryBalance += (rake - refTotal);
    }

    function _qualifyForTournament(LibBlockArena.AppStorage storage s, uint256 tid, address player) internal {
        uint8 round = s.tournaments[tid].currentRound;
        if (!s.tournamentQualified[tid][round][player]) {
            s.tournamentQualified[tid][round][player] = true;
            emit TournamentPlayerQualified(tid, round, player);
        }
    }
}
