// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {Diamond} from "../src/diamond/Diamond.sol";
import {DiamondCutFacet} from "../src/diamond/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "../src/diamond/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "../src/diamond/OwnershipFacet.sol";
import {ArenaFacet} from "../src/facets/ArenaFacet.sol";
import {OracleFacet} from "../src/facets/OracleFacet.sol";
import {TournamentFacet} from "../src/facets/TournamentFacet.sol";
import {FeeFacet} from "../src/facets/FeeFacet.sol";
import {StreakFacet} from "../src/facets/StreakFacet.sol";
import {EmergencyFacet} from "../src/facets/EmergencyFacet.sol";
import {BlockArenaHighlights} from "../src/BlockArenaHighlights.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/interfaces/IDiamondLoupe.sol";
import {IERC165} from "../src/interfaces/IERC165.sol";
import {LibBlockArena} from "../src/libraries/LibBlockArena.sol";
import {BitPack} from "../src/libraries/BitPack.sol";
import {Scoring} from "../src/libraries/Scoring.sol";
import {StreakLib} from "../src/libraries/StreakLib.sol";

// Helper to test Scoring library (needs storage for tapeWords)
contract ScoringHelper {
    uint256[] public tape;

    function setTape(uint256[] memory t) external {
        delete tape;
        for (uint256 i; i < t.length; ++i) tape.push(t[i]);
    }

    function score(uint256[] memory pred, uint256 ticks) external view returns (uint256) {
        return Scoring.scorePlayer(pred, tape, ticks);
    }
}

/// @dev Deploys diamond with all facets and returns typed interfaces
contract DiamondTestBase is Test {
    Diamond public diamond;
    DiamondCutFacet public diamondCutFacet;
    DiamondLoupeFacet public loupeFacet;
    OwnershipFacet public ownershipFacet;

    // Facet implementations (for selector references)
    ArenaFacet public arenaFacetImpl;
    OracleFacet public oracleFacetImpl;
    TournamentFacet public tournamentFacetImpl;
    FeeFacet public feeFacetImpl;
    StreakFacet public streakFacetImpl;
    EmergencyFacet public emergencyFacetImpl;

    // Typed interfaces to diamond proxy
    ArenaFacet public arena;
    OracleFacet public oracleFacet;
    TournamentFacet public tournament;
    FeeFacet public fee;
    StreakFacet public streak;
    EmergencyFacet public emergency;
    OwnershipFacet public ownership;

    BlockArenaHighlights public highlights;
    MockPriceFeed public mockFeed;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address charlie = address(0xC);
    address keeper = address(0xBEE9);

    function setUp() public virtual {
        // Deploy DiamondCutFacet
        diamondCutFacet = new DiamondCutFacet();

        // Deploy Diamond
        diamond = new Diamond(address(this), address(diamondCutFacet));

        // Deploy facet implementations
        loupeFacet = new DiamondLoupeFacet();
        ownershipFacet = new OwnershipFacet();
        arenaFacetImpl = new ArenaFacet();
        oracleFacetImpl = new OracleFacet();
        tournamentFacetImpl = new TournamentFacet();
        feeFacetImpl = new FeeFacet();
        streakFacetImpl = new StreakFacet();
        emergencyFacetImpl = new EmergencyFacet();

        // Build cuts
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](8);

        // Loupe
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        cuts[0] = IDiamondCut.FacetCut(address(loupeFacet), IDiamondCut.FacetCutAction.Add, loupeSelectors);

        // Ownership
        bytes4[] memory ownerSelectors = new bytes4[](4);
        ownerSelectors[0] = OwnershipFacet.transferOwnership.selector;
        ownerSelectors[1] = OwnershipFacet.acceptOwnership.selector;
        ownerSelectors[2] = OwnershipFacet.owner.selector;
        ownerSelectors[3] = OwnershipFacet.pendingOwner.selector;
        cuts[1] = IDiamondCut.FacetCut(address(ownershipFacet), IDiamondCut.FacetCutAction.Add, ownerSelectors);

        // Arena
        bytes4[] memory arenaSelectors = new bytes4[](16);
        arenaSelectors[0] = ArenaFacet.createArena.selector;
        arenaSelectors[1] = ArenaFacet.joinArena.selector;
        arenaSelectors[2] = ArenaFacet.commitPrediction.selector;
        arenaSelectors[3] = ArenaFacet.revealPrediction.selector;
        arenaSelectors[4] = ArenaFacet.finalizeArena.selector;
        arenaSelectors[5] = ArenaFacet.resetArena.selector;
        arenaSelectors[6] = ArenaFacet.nextArenaId.selector;
        arenaSelectors[7] = ArenaFacet.getArena.selector;
        arenaSelectors[8] = ArenaFacet.arenaEpoch.selector;
        arenaSelectors[9] = ArenaFacet.getPlayerState.selector;
        arenaSelectors[10] = ArenaFacet.getPriceTape.selector;
        arenaSelectors[11] = ArenaFacet.getOracleState.selector;
        arenaSelectors[12] = ArenaFacet.godStreak.selector;
        arenaSelectors[13] = ArenaFacet.getEntryFee.selector;
        arenaSelectors[14] = ArenaFacet.getRakeBps.selector;
        arenaSelectors[15] = ArenaFacet.computeCommitHash.selector;
        cuts[2] = IDiamondCut.FacetCut(address(arenaFacetImpl), IDiamondCut.FacetCutAction.Add, arenaSelectors);

        // Oracle
        bytes4[] memory oracleSelectors = new bytes4[](4);
        oracleSelectors[0] = OracleFacet.setOracle.selector;
        oracleSelectors[1] = OracleFacet.oracle.selector;
        oracleSelectors[2] = OracleFacet.recordTick.selector;
        oracleSelectors[3] = OracleFacet.recordTicks.selector;
        cuts[3] = IDiamondCut.FacetCut(address(oracleFacetImpl), IDiamondCut.FacetCutAction.Add, oracleSelectors);

        // Tournament
        bytes4[] memory tournamentSelectors = new bytes4[](7);
        tournamentSelectors[0] = TournamentFacet.createTournament.selector;
        tournamentSelectors[1] = TournamentFacet.addArenaToTournament.selector;
        tournamentSelectors[2] = TournamentFacet.advanceTournamentRound.selector;
        tournamentSelectors[3] = TournamentFacet.finalizeTournament.selector;
        tournamentSelectors[4] = TournamentFacet.depositTournamentPot.selector;
        tournamentSelectors[5] = TournamentFacet.nextTournamentId.selector;
        tournamentSelectors[6] = TournamentFacet.getTournament.selector;
        cuts[4] = IDiamondCut.FacetCut(address(tournamentFacetImpl), IDiamondCut.FacetCutAction.Add, tournamentSelectors);

        // Fee
        bytes4[] memory feeSelectors = new bytes4[](8);
        feeSelectors[0] = FeeFacet.setReferrer.selector;
        feeSelectors[1] = FeeFacet.withdrawReferralEarnings.selector;
        feeSelectors[2] = FeeFacet.withdrawTreasury.selector;
        feeSelectors[3] = FeeFacet.treasuryBalance.selector;
        feeSelectors[4] = FeeFacet.referrer.selector;
        feeSelectors[5] = FeeFacet.referrerBalance.selector;
        feeSelectors[6] = FeeFacet.setHighlightsNFT.selector;
        feeSelectors[7] = FeeFacet.highlightsNFT.selector;
        cuts[5] = IDiamondCut.FacetCut(address(feeFacetImpl), IDiamondCut.FacetCutAction.Add, feeSelectors);

        // Streak
        bytes4[] memory streakSelectors = new bytes4[](1);
        streakSelectors[0] = StreakFacet.getGodStreak.selector;
        cuts[6] = IDiamondCut.FacetCut(address(streakFacetImpl), IDiamondCut.FacetCutAction.Add, streakSelectors);

        // Emergency
        bytes4[] memory emergencySelectors = new bytes4[](4);
        emergencySelectors[0] = EmergencyFacet.pause.selector;
        emergencySelectors[1] = EmergencyFacet.unpause.selector;
        emergencySelectors[2] = EmergencyFacet.paused.selector;
        emergencySelectors[3] = EmergencyFacet.emergencyWithdraw.selector;
        cuts[7] = IDiamondCut.FacetCut(address(emergencyFacetImpl), IDiamondCut.FacetCutAction.Add, emergencySelectors);

        // Execute cut
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), "");

        // Create typed interfaces
        arena = ArenaFacet(address(diamond));
        oracleFacet = OracleFacet(address(diamond));
        tournament = TournamentFacet(address(diamond));
        fee = FeeFacet(address(diamond));
        streak = StreakFacet(address(diamond));
        emergency = EmergencyFacet(address(diamond));
        ownership = OwnershipFacet(address(diamond));

        // Setup highlights + oracle
        highlights = new BlockArenaHighlights(address(diamond));
        mockFeed = new MockPriceFeed();
        fee.setHighlightsNFT(address(highlights));
        oracleFacet.setOracle(address(mockFeed));
        mockFeed.setPrice(100e8);

        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
        vm.deal(keeper, 10 ether);
    }

    receive() external payable {}
}

// ─── Library Tests (unchanged) ────────────────────────────────────────

contract BitPackTest is Test {
    function test_popcount_zero() public pure {
        assertEq(BitPack.popcount(0), 0);
    }
    function test_popcount_max() public pure {
        assertEq(BitPack.popcount(type(uint256).max), 256);
    }
    function test_popcount_one() public pure {
        assertEq(BitPack.popcount(1), 1);
    }
    function test_popcount_known() public pure {
        assertEq(BitPack.popcount(0xFF), 8);
        assertEq(BitPack.popcount(0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA), 128);
    }
    function test_popcount_vs_naive(uint256 x) public pure {
        uint256 fast = BitPack.popcount(x);
        uint256 naive;
        uint256 tmp = x;
        while (tmp != 0) { tmp &= tmp - 1; naive++; }
        assertEq(fast, naive);
    }
    function test_getBit() public pure {
        uint256[] memory words = new uint256[](1);
        words[0] = 1 << 255;
        assertEq(BitPack.getBit(words, 0), 1);
        assertEq(BitPack.getBit(words, 1), 0);
        words[0] = 1;
        assertEq(BitPack.getBit(words, 255), 1);
    }
}

contract StreakLibTest is Test {
    function test_multipliers() public pure {
        assertEq(StreakLib.getMultiplier(0), 10000);
        assertEq(StreakLib.getMultiplier(1), 10000);
        assertEq(StreakLib.getMultiplier(2), 11000);
        assertEq(StreakLib.getMultiplier(3), 12000);
        assertEq(StreakLib.getMultiplier(4), 12000);
        assertEq(StreakLib.getMultiplier(5), 15000);
        assertEq(StreakLib.getMultiplier(100), 15000);
    }
}

contract ScoringTest is Test {
    ScoringHelper helper;
    function setUp() public { helper = new ScoringHelper(); }

    function test_perfect_score() public {
        uint256[] memory t = new uint256[](1);
        t[0] = type(uint256).max;
        helper.setTape(t);
        uint256[] memory pred = new uint256[](1);
        pred[0] = type(uint256).max;
        assertEq(helper.score(pred, 256), 256);
    }
    function test_zero_score() public {
        uint256[] memory t = new uint256[](1);
        t[0] = type(uint256).max;
        helper.setTape(t);
        uint256[] memory pred = new uint256[](1);
        pred[0] = 0;
        assertEq(helper.score(pred, 256), 0);
    }
    function test_partial_ticks() public {
        uint256[] memory t = new uint256[](1);
        t[0] = type(uint256).max;
        helper.setTape(t);
        uint256[] memory pred = new uint256[](1);
        pred[0] = type(uint256).max;
        assertEq(helper.score(pred, 128), 128);
    }
    function test_multi_word() public {
        uint256[] memory t = new uint256[](2);
        t[0] = type(uint256).max;
        t[1] = type(uint256).max;
        helper.setTape(t);
        uint256[] memory pred = new uint256[](2);
        pred[0] = type(uint256).max;
        pred[1] = type(uint256).max;
        assertEq(helper.score(pred, 300), 300);
    }
}

// ─── Diamond Arena Tests ──────────────────────────────────────────────

contract DiamondArenaTest is DiamondTestBase {

    function _setupArena() internal returns (uint256 arenaId, LibBlockArena.Arena memory a) {
        arenaId = arena.createArena(LibBlockArena.Tier.Low, 256);
        a = arena.getArena(arenaId);
    }

    function _recordAllTicksUp(uint256 arenaId, LibBlockArena.Arena memory a) internal {
        uint40 ticks = a.endBlock - a.startBlock;
        mockFeed.setPrice(100e8);
        for (uint40 i = 0; i < ticks; i++) {
            mockFeed.setPrice(int256(100e8 + int40(i + 1)));
            vm.roll(a.startBlock + i);
            vm.prank(keeper);
            oracleFacet.recordTick(arenaId);
        }
    }

    function _recordAllTicksDown(uint256 arenaId, LibBlockArena.Arena memory a) internal {
        uint40 ticks = a.endBlock - a.startBlock;
        mockFeed.setPrice(100e8);
        for (uint40 i = 0; i < ticks; i++) {
            mockFeed.setPrice(int256(100e8 - int40(i + 1)));
            vm.roll(a.startBlock + i);
            vm.prank(keeper);
            oracleFacet.recordTick(arenaId);
        }
    }

    function test_createArena() public {
        uint256 id = arena.createArena(LibBlockArena.Tier.Low, 256);
        assertEq(id, 0);
        LibBlockArena.Arena memory a = arena.getArena(0);
        assertEq(uint8(a.tier), uint8(LibBlockArena.Tier.Low));
        assertFalse(a.finalized);
    }

    function test_fullLifecycle() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();

        uint256[] memory predWords = new uint256[](1);
        predWords[0] = type(uint256).max;
        bytes32 salt = bytes32(uint256(42));
        bytes32 commitHash = keccak256(abi.encodePacked(arenaId, alice, salt, keccak256(abi.encode(predWords))));

        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);

        vm.roll(a.startBlock);
        vm.prank(alice);
        arena.commitPrediction(arenaId, commitHash);

        _recordAllTicksUp(arenaId, a);

        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        arena.revealPrediction(arenaId, predWords, salt);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = predWords;

        uint256 aliceBefore = alice.balance;
        arena.finalizeArena(arenaId, players, allPreds);
        assertTrue(alice.balance > aliceBefore);
        assertTrue(arena.getArena(arenaId).finalized);
    }

    function test_noReveals_finalize() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        _recordAllTicksUp(arenaId, a);
        vm.roll(a.endBlock + 1);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = new uint256[](1);
        arena.finalizeArena(arenaId, players, allPreds);
        assertTrue(arena.getArena(arenaId).finalized);
    }

    function test_singlePlayer_wins() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();

        uint256[] memory predWords = new uint256[](1);
        predWords[0] = type(uint256).max;
        bytes32 salt = bytes32(uint256(99));
        bytes32 commitHash = keccak256(abi.encodePacked(arenaId, alice, salt, keccak256(abi.encode(predWords))));

        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        vm.roll(a.startBlock);
        vm.prank(alice);
        arena.commitPrediction(arenaId, commitHash);
        _recordAllTicksUp(arenaId, a);
        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        arena.revealPrediction(arenaId, predWords, salt);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = predWords;
        arena.finalizeArena(arenaId, players, allPreds);
        assertEq(arena.godStreak(alice), 1);
    }

    function test_referral_system() public {
        vm.prank(alice);
        fee.setReferrer(bob);
        assertEq(fee.referrer(alice), bob);

        vm.prank(alice);
        vm.expectRevert(FeeFacet.ReferrerAlreadySet.selector);
        fee.setReferrer(charlie);
    }

    function test_pause_unpause() public {
        emergency.pause();
        vm.expectRevert();
        arena.createArena(LibBlockArena.Tier.Low, 256);
        emergency.unpause();
        arena.createArena(LibBlockArena.Tier.Low, 256);
    }

    function test_emergencyWithdraw() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        vm.roll(a.endBlock + 50001);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256 balBefore = alice.balance;
        emergency.emergencyWithdraw(arenaId, players);
        assertTrue(alice.balance > balBefore);
    }

    // ─── Oracle Tests ─────────────────────────────────────────────────

    function test_setOracle() public {
        MockPriceFeed newFeed = new MockPriceFeed();
        oracleFacet.setOracle(address(newFeed));
        assertEq(oracleFacet.oracle(), address(newFeed));
    }

    function test_setOracle_zeroAddress_reverts() public {
        vm.expectRevert(OracleFacet.ZeroAddress.selector);
        oracleFacet.setOracle(address(0));
    }

    function test_setOracle_onlyOwner() public {
        MockPriceFeed newFeed = new MockPriceFeed();
        vm.prank(alice);
        vm.expectRevert();
        oracleFacet.setOracle(address(newFeed));
    }

    function test_recordTick_permissionless() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        mockFeed.setPrice(101e8);
        vm.roll(a.startBlock);
        vm.prank(alice);
        oracleFacet.recordTick(arenaId);
        LibBlockArena.OracleState memory os = arena.getOracleState(arenaId);
        assertEq(os.ticksRecorded, 1);
    }

    function test_recordTick_directionBits() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();

        mockFeed.setPrice(105e8);
        vm.roll(a.startBlock);
        oracleFacet.recordTick(arenaId);

        mockFeed.setPrice(95e8);
        vm.roll(a.startBlock + 1);
        oracleFacet.recordTick(arenaId);

        mockFeed.setPrice(110e8);
        vm.roll(a.startBlock + 2);
        oracleFacet.recordTick(arenaId);

        uint256[] memory tape = arena.getPriceTape(arenaId);
        uint256 expected = (1 << 255) | (0 << 254) | (1 << 253);
        assertEq(tape[0] & (uint256(7) << 253), expected);
    }

    function test_recordTick_beforeArenaStart_reverts() public {
        (uint256 arenaId,) = _setupArena();
        vm.roll(1);
        vm.expectRevert(OracleFacet.ArenaNotActive.selector);
        oracleFacet.recordTick(arenaId);
    }

    function test_recordTick_afterArenaEnd_reverts() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        vm.roll(a.endBlock + 1);
        vm.expectRevert(OracleFacet.ArenaNotActive.selector);
        oracleFacet.recordTick(arenaId);
    }

    function test_recordTick_oracleNotSet_reverts() public {
        // Deploy fresh diamond without oracle
        DiamondCutFacet dc = new DiamondCutFacet();
        Diamond d = new Diamond(address(this), address(dc));
        ArenaFacet af = new ArenaFacet();
        OracleFacet of2 = new OracleFacet();

        IDiamondCut.FacetCut[] memory c = new IDiamondCut.FacetCut[](2);
        bytes4[] memory as2 = new bytes4[](2);
        as2[0] = ArenaFacet.createArena.selector;
        as2[1] = ArenaFacet.getArena.selector;
        c[0] = IDiamondCut.FacetCut(address(af), IDiamondCut.FacetCutAction.Add, as2);
        bytes4[] memory os2 = new bytes4[](1);
        os2[0] = OracleFacet.recordTick.selector;
        c[1] = IDiamondCut.FacetCut(address(of2), IDiamondCut.FacetCutAction.Add, os2);
        IDiamondCut(address(d)).diamondCut(c, address(0), "");

        ArenaFacet freshArena = ArenaFacet(address(d));
        OracleFacet freshOracle = OracleFacet(address(d));
        uint256 arenaId = freshArena.createArena(LibBlockArena.Tier.Low, 256);
        LibBlockArena.Arena memory a = freshArena.getArena(arenaId);
        vm.roll(a.startBlock);
        vm.expectRevert(OracleFacet.OracleNotSet.selector);
        freshOracle.recordTick(arenaId);
    }

    function test_recordTicks_batch() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        mockFeed.setPrice(105e8);
        vm.roll(a.startBlock + 10);
        oracleFacet.recordTicks(arenaId, 11);
        LibBlockArena.OracleState memory os = arena.getOracleState(arenaId);
        assertEq(os.ticksRecorded, 11);
    }

    function test_recordTicks_respectsMaxTicks() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        mockFeed.setPrice(105e8);
        vm.roll(a.startBlock + 100);
        oracleFacet.recordTicks(arenaId, 50);
        LibBlockArena.OracleState memory os = arena.getOracleState(arenaId);
        assertEq(os.ticksRecorded, 50);
    }

    function test_finalize_withoutTape_reverts() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        vm.roll(a.endBlock + 1);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = new uint256[](1);
        vm.expectRevert(ArenaFacet.TapeNotSet.selector);
        arena.finalizeArena(arenaId, players, allPreds);
    }

    function test_tapeBuiltFromOracle_matchesPrediction() public {
        uint256 arenaId = arena.createArena(LibBlockArena.Tier.Low, 10);
        LibBlockArena.Arena memory a = arena.getArena(arenaId);

        uint256[] memory predWords = new uint256[](1);
        predWords[0] = type(uint256).max;
        bytes32 salt = bytes32(uint256(1));
        bytes32 commitHash = keccak256(abi.encodePacked(arenaId, alice, salt, keccak256(abi.encode(predWords))));

        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        vm.roll(a.startBlock);
        vm.prank(alice);
        arena.commitPrediction(arenaId, commitHash);

        for (uint40 i = 0; i < 10; i++) {
            mockFeed.setPrice(int256(100e8 + int40(i + 1)));
            vm.roll(a.startBlock + i);
            oracleFacet.recordTick(arenaId);
        }

        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        arena.revealPrediction(arenaId, predWords, salt);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = predWords;
        arena.finalizeArena(arenaId, players, allPreds);

        LibBlockArena.PlayerState memory ps = arena.getPlayerState(arenaId, alice);
        assertEq(ps.score, 10);
    }

    function test_manipulatedTape_impossible() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        vm.roll(a.endBlock + 1);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = new uint256[](1);
        vm.expectRevert(ArenaFacet.TapeNotSet.selector);
        arena.finalizeArena(arenaId, players, allPreds);
    }

    // ─── Arena Reset ──────────────────────────────────────────────────

    function test_resetArena() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        _recordAllTicksUp(arenaId, a);
        vm.roll(a.endBlock + 1);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = new uint256[](1);
        arena.finalizeArena(arenaId, players, allPreds);

        arena.resetArena(arenaId, 512);
        assertEq(arena.arenaEpoch(arenaId), 1);

        LibBlockArena.PlayerState memory ps = arena.getPlayerState(arenaId, alice);
        assertEq(ps.commitHash, bytes32(0));

        LibBlockArena.OracleState memory os = arena.getOracleState(arenaId);
        assertEq(os.ticksRecorded, 0);

        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        ps = arena.getPlayerState(arenaId, alice);
        assertEq(ps.commitHash, bytes32(uint256(1)));
    }

    // ─── Ownership ────────────────────────────────────────────────────

    function test_ownable2Step() public {
        ownership.transferOwnership(alice);
        assertEq(ownership.owner(), address(this));
        vm.prank(alice);
        ownership.acceptOwnership();
        assertEq(ownership.owner(), alice);
    }

    // ─── Two Players ──────────────────────────────────────────────────

    function test_twoPlayers_oneWins() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();

        uint256[] memory predsA = new uint256[](1);
        predsA[0] = type(uint256).max;
        uint256[] memory predsB = new uint256[](1);
        predsB[0] = 0;

        bytes32 saltA = bytes32(uint256(1));
        bytes32 saltB = bytes32(uint256(2));
        bytes32 hashA = keccak256(abi.encodePacked(arenaId, alice, saltA, keccak256(abi.encode(predsA))));
        bytes32 hashB = keccak256(abi.encodePacked(arenaId, bob, saltB, keccak256(abi.encode(predsB))));

        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        vm.prank(bob);
        arena.joinArena{value: 0.001 ether}(arenaId);

        vm.roll(a.startBlock);
        vm.prank(alice);
        arena.commitPrediction(arenaId, hashA);
        vm.prank(bob);
        arena.commitPrediction(arenaId, hashB);

        _recordAllTicksUp(arenaId, a);

        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        arena.revealPrediction(arenaId, predsA, saltA);
        vm.prank(bob);
        arena.revealPrediction(arenaId, predsB, saltB);

        address[] memory players = new address[](2);
        players[0] = alice;
        players[1] = bob;
        uint256[][] memory allPreds = new uint256[][](2);
        allPreds[0] = predsA;
        allPreds[1] = predsB;

        uint256 aliceBefore = alice.balance;
        arena.finalizeArena(arenaId, players, allPreds);
        assertTrue(alice.balance > aliceBefore);
        assertEq(arena.godStreak(alice), 1);
        assertEq(arena.godStreak(bob), 0);
    }

    // ─── Fee Tiers ────────────────────────────────────────────────────

    function test_entryFees() public view {
        assertEq(arena.getEntryFee(LibBlockArena.Tier.Low), 0.001 ether);
        assertEq(arena.getEntryFee(LibBlockArena.Tier.Mid), 0.01 ether);
        assertEq(arena.getEntryFee(LibBlockArena.Tier.High), 0.1 ether);
        assertEq(arena.getEntryFee(LibBlockArena.Tier.VIP), 1 ether);
    }

    function test_rakeBps() public view {
        assertEq(arena.getRakeBps(LibBlockArena.Tier.Low), 500);
        assertEq(arena.getRakeBps(LibBlockArena.Tier.Mid), 400);
        assertEq(arena.getRakeBps(LibBlockArena.Tier.High), 300);
        assertEq(arena.getRakeBps(LibBlockArena.Tier.VIP), 200);
    }

    // ─── Treasury ─────────────────────────────────────────────────────

    function test_treasuryWithdraw() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();
        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        _recordAllTicksUp(arenaId, a);
        vm.roll(a.endBlock + 1);

        address[] memory players = new address[](0);
        uint256[][] memory allPreds = new uint256[][](0);
        arena.finalizeArena(arenaId, players, allPreds);

        uint256 treasury = fee.treasuryBalance();
        assertTrue(treasury > 0);

        uint256 balBefore = address(this).balance;
        fee.withdrawTreasury();
        assertEq(address(this).balance, balBefore + treasury);
        assertEq(fee.treasuryBalance(), 0);
    }

    // ─── Tournament ───────────────────────────────────────────────────

    function test_tournament_fullFlow() public {
        uint256 tid = tournament.createTournament(LibBlockArena.Tier.Low, 2, 1);
        tournament.depositTournamentPot{value: 1 ether}(tid);

        LibBlockArena.Tournament memory t = tournament.getTournament(tid);
        assertEq(t.roundCount, 2);
        assertEq(t.pot, 1 ether);

        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256 aliceBefore = alice.balance;
        tournament.finalizeTournament(tid, winners);
        assertEq(alice.balance, aliceBefore + 1 ether);
    }

    // ─── Highlights NFT ───────────────────────────────────────────────

    function test_highlightNFT_minted() public {
        (uint256 arenaId, LibBlockArena.Arena memory a) = _setupArena();

        uint256[] memory preds = new uint256[](1);
        preds[0] = type(uint256).max;
        bytes32 salt = bytes32(uint256(42));
        bytes32 commitHash = keccak256(abi.encodePacked(arenaId, alice, salt, keccak256(abi.encode(preds))));

        vm.prank(alice);
        arena.joinArena{value: 0.001 ether}(arenaId);
        vm.roll(a.startBlock);
        vm.prank(alice);
        arena.commitPrediction(arenaId, commitHash);
        _recordAllTicksUp(arenaId, a);
        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        arena.revealPrediction(arenaId, preds, salt);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = preds;
        arena.finalizeArena(arenaId, players, allPreds);
        assertEq(highlights.ownerOf(0), alice);
    }

    // ─── Commit Hash ──────────────────────────────────────────────────

    function test_computeCommitHash() public view {
        uint256[] memory preds = new uint256[](2);
        preds[0] = 42;
        preds[1] = 99;
        bytes32 salt = bytes32(uint256(7));
        bytes32 expected = keccak256(abi.encodePacked(uint256(0), alice, salt, keccak256(abi.encode(preds))));
        assertEq(arena.computeCommitHash(0, alice, salt, preds), expected);
    }

    // ─── Self Referral ────────────────────────────────────────────────

    function test_selfReferral_reverts() public {
        vm.prank(alice);
        vm.expectRevert(FeeFacet.SelfReferral.selector);
        fee.setReferrer(alice);
    }

    function test_zeroAddress_referrer_reverts() public {
        vm.prank(alice);
        vm.expectRevert(FeeFacet.ZeroAddress.selector);
        fee.setReferrer(address(0));
    }
}

// ─── Diamond-Specific Tests ───────────────────────────────────────────

contract DiamondUpgradeTest is DiamondTestBase {

    function test_diamondLoupe_facets() public view {
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));
        IDiamondLoupe.Facet[] memory f = loupe.facets();
        // DiamondCut + Loupe + Ownership + Arena + Oracle + Tournament + Fee + Streak + Emergency = 9
        assertEq(f.length, 9);
    }

    function test_diamondLoupe_facetAddresses() public view {
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));
        address[] memory addrs = loupe.facetAddresses();
        assertEq(addrs.length, 9);
    }

    function test_diamondLoupe_facetAddress() public view {
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));
        address addr = loupe.facetAddress(ArenaFacet.createArena.selector);
        assertEq(addr, address(arenaFacetImpl));
    }

    function test_addNewFacet() public {
        // Deploy a new facet with a new function
        StreakFacet newStreak = new StreakFacet();

        // Replace existing streak facet
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = StreakFacet.getGodStreak.selector;
        cuts[0] = IDiamondCut.FacetCut(address(newStreak), IDiamondCut.FacetCutAction.Replace, selectors);

        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), "");

        // Verify it works
        assertEq(streak.getGodStreak(alice), 0);

        // Verify facet address changed
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));
        assertEq(loupe.facetAddress(StreakFacet.getGodStreak.selector), address(newStreak));
    }

    function test_removeFacet() public {
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = StreakFacet.getGodStreak.selector;
        cuts[0] = IDiamondCut.FacetCut(address(0), IDiamondCut.FacetCutAction.Remove, selectors);

        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), "");

        // Should revert now
        vm.expectRevert("Diamond: Function does not exist");
        streak.getGodStreak(alice);
    }

    function test_storagePersistenceAcrossUpgrade() public {
        // Create arena
        uint256 arenaId = arena.createArena(LibBlockArena.Tier.Low, 256);
        assertEq(arena.nextArenaId(), 1);

        // Replace ArenaFacet with a new deployment
        ArenaFacet newArena = new ArenaFacet();
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](16);
        selectors[0] = ArenaFacet.createArena.selector;
        selectors[1] = ArenaFacet.joinArena.selector;
        selectors[2] = ArenaFacet.commitPrediction.selector;
        selectors[3] = ArenaFacet.revealPrediction.selector;
        selectors[4] = ArenaFacet.finalizeArena.selector;
        selectors[5] = ArenaFacet.resetArena.selector;
        selectors[6] = ArenaFacet.nextArenaId.selector;
        selectors[7] = ArenaFacet.getArena.selector;
        selectors[8] = ArenaFacet.arenaEpoch.selector;
        selectors[9] = ArenaFacet.getPlayerState.selector;
        selectors[10] = ArenaFacet.getPriceTape.selector;
        selectors[11] = ArenaFacet.getOracleState.selector;
        selectors[12] = ArenaFacet.godStreak.selector;
        selectors[13] = ArenaFacet.getEntryFee.selector;
        selectors[14] = ArenaFacet.getRakeBps.selector;
        selectors[15] = ArenaFacet.computeCommitHash.selector;
        cuts[0] = IDiamondCut.FacetCut(address(newArena), IDiamondCut.FacetCutAction.Replace, selectors);

        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), "");

        // Storage should persist
        assertEq(arena.nextArenaId(), 1);
        LibBlockArena.Arena memory a = arena.getArena(arenaId);
        assertEq(uint8(a.tier), uint8(LibBlockArena.Tier.Low));
    }

    function test_onlyOwnerCanCut() public {
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](0);
        vm.prank(alice);
        vm.expectRevert();
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), "");
    }
}
