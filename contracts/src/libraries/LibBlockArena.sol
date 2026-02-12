// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRedStonePriceFeed} from "../interfaces/IRedStonePriceFeed.sol";

/// @title LibBlockArena — Diamond Storage for BlockArena
/// @notice ALL application state lives in one struct accessed via a fixed storage slot
library LibBlockArena {
    bytes32 constant STORAGE_SLOT = keccak256("blockarena.storage");

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

    struct OracleState {
        uint40  nextBlock;
        uint40  ticksRecorded;
        int256  lastPrice;
    }

    struct AppStorage {
        // Arena
        uint256 nextArenaId;
        mapping(uint256 => Arena) arenas;
        mapping(uint256 => uint32) arenaEpoch;
        mapping(uint256 => mapping(uint32 => mapping(address => PlayerState))) playerState;
        mapping(uint256 => uint256[]) priceTapeWords;
        mapping(uint256 => OracleState) oracleState;

        // Config
        address oracle;
        address highlightsNFT;

        // Fees
        uint256 treasuryBalance;
        mapping(address => address) referrer;
        mapping(address => uint256) referrerBalance;

        // Streaks
        mapping(address => uint16) godStreak;

        // Tournaments
        uint256 nextTournamentId;
        mapping(uint256 => Tournament) tournaments;
        mapping(uint256 => mapping(uint8 => uint256[])) tournamentRoundArenas;
        mapping(uint256 => mapping(uint8 => mapping(address => bool))) tournamentQualified;

        // Pausable
        bool paused;

        // ReentrancyGuard
        uint256 reentrancyStatus;

        // ─── Future Revenue Streams (reserved storage) ───────────────

        // GovernanceFacet
        address governanceToken;
        mapping(uint256 => mapping(address => uint256)) votes;

        // CustomArenaFacet
        mapping(address => bool) arenaCreators;
        uint256 arenaCreationFee;

        // SeasonPassFacet
        uint256 currentSeason;
        mapping(uint256 => mapping(address => bool)) seasonPass;
        mapping(uint256 => mapping(address => uint256)) seasonPoints;

        // StakingFacet
        address stakingToken;
        mapping(address => uint256) stakedBalance;
        mapping(address => uint256) stakeTimestamp;

        // MarketplaceFacet
        mapping(uint256 => uint256) itemPrices;
        mapping(address => mapping(uint256 => uint256)) inventory;

        // Anti-bot
        mapping(address => uint256) lastArenaJoinBlock;
        uint256 minWalletAge;
        uint256 minWalletBalance;
    }

    function appStorage() internal pure returns (AppStorage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly { s.slot := slot }
    }

    // ─── Constants ────────────────────────────────────────────────────
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

    // ─── Shared Helpers ───────────────────────────────────────────────

    function getEntryFee(Tier tier) internal pure returns (uint128) {
        if (tier == Tier.Low) return FEE_LOW;
        if (tier == Tier.Mid) return FEE_MID;
        if (tier == Tier.High) return FEE_HIGH;
        return FEE_VIP;
    }

    function getRakeBps(Tier tier) internal pure returns (uint16) {
        if (tier == Tier.Low) return RAKE_LOW;
        if (tier == Tier.Mid) return RAKE_MID;
        if (tier == Tier.High) return RAKE_HIGH;
        return RAKE_VIP;
    }

    // ─── Modifiers as internal functions ──────────────────────────────

    error Paused();
    error NotPaused();
    error ReentrantCall();

    function enforceNotPaused() internal view {
        if (appStorage().paused) revert Paused();
    }

    function enforceNonReentrant() internal {
        AppStorage storage s = appStorage();
        if (s.reentrancyStatus == 2) revert ReentrantCall();
        s.reentrancyStatus = 2;
    }

    function clearReentrancy() internal {
        appStorage().reentrancyStatus = 1;
    }
}
