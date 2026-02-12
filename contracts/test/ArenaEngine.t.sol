// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ArenaEngine.sol";
import "../src/BlockArenaHighlights.sol";
import "../src/libraries/BitPack.sol";
import "../src/libraries/Scoring.sol";
import "../src/libraries/StreakLib.sol";
import "../src/mocks/MockPriceFeed.sol";

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

    function setUp() public {
        helper = new ScoringHelper();
    }

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

contract ArenaEngineTest is Test {
    ArenaEngine public engine;
    BlockArenaHighlights public highlights;
    MockPriceFeed public mockFeed;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address charlie = address(0xC);
    address keeper = address(0xBEE9);

    function setUp() public {
        engine = new ArenaEngine();
        highlights = new BlockArenaHighlights(address(engine));
        mockFeed = new MockPriceFeed();
        engine.setHighlightsNFT(address(highlights));
        engine.setOracle(address(mockFeed));
        mockFeed.setPrice(100e8); // $100 initial price
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
        vm.deal(keeper, 10 ether);
    }

    function test_createArena() public {
        uint256 id = engine.createArena(ArenaEngine.Tier.Low, 256);
        assertEq(id, 0);
        ArenaEngine.Arena memory a = engine.getArena(0);
        assertEq(uint8(a.tier), uint8(ArenaEngine.Tier.Low));
        assertFalse(a.finalized);
    }

    function _setupArena() internal returns (uint256 arenaId, ArenaEngine.Arena memory a) {
        arenaId = engine.createArena(ArenaEngine.Tier.Low, 256);
        a = engine.getArena(arenaId);
    }

    /// @notice Helper: record all ticks for an arena with alternating prices
    function _recordAllTicks(uint256 arenaId, ArenaEngine.Arena memory a) internal {
        uint40 ticks = a.endBlock - a.startBlock;
        for (uint40 i = 0; i < ticks; i++) {
            // Alternate price: up on even blocks, down on odd
            if (i % 2 == 0) {
                mockFeed.setPrice(101e8); // up
            } else {
                mockFeed.setPrice(99e8);  // down
            }
            vm.roll(a.startBlock + i);
            vm.prank(keeper);
            engine.recordTick(arenaId);
        }
    }

    /// @notice Helper: record all ticks as "up" (all 1s in tape)
    function _recordAllTicksUp(uint256 arenaId, ArenaEngine.Arena memory a) internal {
        uint40 ticks = a.endBlock - a.startBlock;
        mockFeed.setPrice(100e8);
        for (uint40 i = 0; i < ticks; i++) {
            mockFeed.setPrice(int256(100e8 + int40(i + 1))); // always increasing
            vm.roll(a.startBlock + i);
            vm.prank(keeper);
            engine.recordTick(arenaId);
        }
    }

    /// @notice Helper: record all ticks as "down" (all 0s in tape)
    function _recordAllTicksDown(uint256 arenaId, ArenaEngine.Arena memory a) internal {
        uint40 ticks = a.endBlock - a.startBlock;
        mockFeed.setPrice(100e8);
        for (uint40 i = 0; i < ticks; i++) {
            mockFeed.setPrice(int256(100e8 - int40(i + 1))); // always decreasing
            vm.roll(a.startBlock + i);
            vm.prank(keeper);
            engine.recordTick(arenaId);
        }
    }

    function test_fullLifecycle() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        uint256[] memory predWords = new uint256[](1);
        predWords[0] = type(uint256).max; // predict all up
        bytes32 salt = bytes32(uint256(42));
        bytes32 commitHash = keccak256(abi.encodePacked(arenaId, alice, salt, keccak256(abi.encode(predWords))));

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        vm.roll(a.startBlock);
        vm.prank(alice);
        engine.commitPrediction(arenaId, commitHash);

        // Record ticks (all up) during arena
        _recordAllTicksUp(arenaId, a);

        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        engine.revealPrediction(arenaId, predWords, salt);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = predWords;

        uint256 aliceBefore = alice.balance;
        engine.finalizeArena(arenaId, players, allPreds);
        assertTrue(alice.balance > aliceBefore);
        assertTrue(engine.getArena(arenaId).finalized);
    }

    function test_noReveals_finalize() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        // Record ticks
        _recordAllTicksUp(arenaId, a);

        vm.roll(a.endBlock + 1);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = new uint256[](1);

        engine.finalizeArena(arenaId, players, allPreds);
        assertTrue(engine.getArena(arenaId).finalized);
    }

    function test_singlePlayer_wins() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        uint256[] memory predWords = new uint256[](1);
        predWords[0] = type(uint256).max; // predict all up
        bytes32 salt = bytes32(uint256(99));
        bytes32 commitHash = keccak256(abi.encodePacked(arenaId, alice, salt, keccak256(abi.encode(predWords))));

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        vm.roll(a.startBlock);
        vm.prank(alice);
        engine.commitPrediction(arenaId, commitHash);

        // Record all ticks as up — matches prediction
        _recordAllTicksUp(arenaId, a);

        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        engine.revealPrediction(arenaId, predWords, salt);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = predWords;

        engine.finalizeArena(arenaId, players, allPreds);
        assertEq(engine.godStreak(alice), 1);
    }

    function test_referral_system() public {
        vm.prank(alice);
        engine.setReferrer(bob);
        assertEq(engine.referrer(alice), bob);

        vm.prank(alice);
        vm.expectRevert(ArenaEngine.ReferrerAlreadySet.selector);
        engine.setReferrer(charlie);
    }

    function test_pause_unpause() public {
        engine.pause();
        vm.expectRevert();
        engine.createArena(ArenaEngine.Tier.Low, 256);
        engine.unpause();
        engine.createArena(ArenaEngine.Tier.Low, 256);
    }

    function test_emergencyWithdraw() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        vm.roll(a.endBlock + 50001);

        address[] memory players = new address[](1);
        players[0] = alice;

        uint256 balBefore = alice.balance;
        engine.emergencyWithdraw(arenaId, players);
        assertTrue(alice.balance > balBefore);
    }

    // ─── Oracle / Price Tape Tests ────────────────────────────────────

    function test_setOracle() public {
        MockPriceFeed newFeed = new MockPriceFeed();
        engine.setOracle(address(newFeed));
        assertEq(address(engine.oracle()), address(newFeed));
    }

    function test_setOracle_zeroAddress_reverts() public {
        vm.expectRevert(ArenaEngine.ZeroAddress.selector);
        engine.setOracle(address(0));
    }

    function test_setOracle_onlyOwner() public {
        MockPriceFeed newFeed = new MockPriceFeed();
        vm.prank(alice);
        vm.expectRevert();
        engine.setOracle(address(newFeed));
    }

    function test_recordTick_permissionless() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        mockFeed.setPrice(101e8);
        vm.roll(a.startBlock);

        // Anyone can call recordTick
        vm.prank(alice);
        engine.recordTick(arenaId);

        ArenaEngine.OracleState memory os = engine.getOracleState(arenaId);
        assertEq(os.ticksRecorded, 1);
    }

    function test_recordTick_directionBits() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        // First tick: price goes up (100 -> 105), bit should be 1
        mockFeed.setPrice(105e8);
        vm.roll(a.startBlock);
        engine.recordTick(arenaId);

        // Second tick: price goes down (105 -> 95), bit should be 0
        mockFeed.setPrice(95e8);
        vm.roll(a.startBlock + 1);
        engine.recordTick(arenaId);

        // Third tick: price goes up (95 -> 110), bit should be 1
        mockFeed.setPrice(110e8);
        vm.roll(a.startBlock + 2);
        engine.recordTick(arenaId);

        uint256[] memory tape = engine.getPriceTape(arenaId);
        // Bits should be: 1, 0, 1 (MSB-first) = 101... in first word
        // bit 0 (pos 255) = 1, bit 1 (pos 254) = 0, bit 2 (pos 253) = 1
        uint256 expected = (1 << 255) | (0 << 254) | (1 << 253);
        assertEq(tape[0] & (uint256(7) << 253), expected);
    }

    function test_recordTick_beforeArenaStart_reverts() public {
        (uint256 arenaId,) = _setupArena();

        vm.roll(1); // before start
        vm.expectRevert(ArenaEngine.ArenaNotActive.selector);
        engine.recordTick(arenaId);
    }

    function test_recordTick_afterArenaEnd_reverts() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        vm.roll(a.endBlock + 1);
        vm.expectRevert(ArenaEngine.ArenaNotActive.selector);
        engine.recordTick(arenaId);
    }

    function test_recordTick_oracleNotSet_reverts() public {
        // Deploy fresh engine without oracle
        ArenaEngine freshEngine = new ArenaEngine();
        uint256 arenaId = freshEngine.createArena(ArenaEngine.Tier.Low, 256);
        ArenaEngine.Arena memory a = freshEngine.getArena(arenaId);

        vm.roll(a.startBlock);
        vm.expectRevert(ArenaEngine.OracleNotSet.selector);
        freshEngine.recordTick(arenaId);
    }

    function test_recordTicks_batch() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        mockFeed.setPrice(105e8); // up from initial 100
        vm.roll(a.startBlock + 10); // skip ahead 10 blocks

        // Batch record up to 11 ticks (blocks 0-10)
        engine.recordTicks(arenaId, 11);

        ArenaEngine.OracleState memory os = engine.getOracleState(arenaId);
        assertEq(os.ticksRecorded, 11);
    }

    function test_recordTicks_respectsMaxTicks() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        mockFeed.setPrice(105e8);
        vm.roll(a.startBlock + 100);

        // Request 50 but 101 available
        engine.recordTicks(arenaId, 50);

        ArenaEngine.OracleState memory os = engine.getOracleState(arenaId);
        assertEq(os.ticksRecorded, 50);
    }

    function test_finalize_withoutTape_reverts() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        vm.roll(a.endBlock + 1);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = new uint256[](1);

        vm.expectRevert(ArenaEngine.TapeNotSet.selector);
        engine.finalizeArena(arenaId, players, allPreds);
    }

    function test_tapeBuiltFromOracle_matchesPrediction() public {
        // Create arena with 10 ticks for simplicity
        uint256 arenaId = engine.createArena(ArenaEngine.Tier.Low, 10);
        ArenaEngine.Arena memory a = engine.getArena(arenaId);

        // Player predicts all up
        uint256[] memory predWords = new uint256[](1);
        predWords[0] = type(uint256).max;
        bytes32 salt = bytes32(uint256(1));
        bytes32 commitHash = keccak256(abi.encodePacked(arenaId, alice, salt, keccak256(abi.encode(predWords))));

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        vm.roll(a.startBlock);
        vm.prank(alice);
        engine.commitPrediction(arenaId, commitHash);

        // Record 10 ticks, all prices going up
        for (uint40 i = 0; i < 10; i++) {
            mockFeed.setPrice(int256(100e8 + int40(i + 1)));
            vm.roll(a.startBlock + i);
            engine.recordTick(arenaId);
        }

        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        engine.revealPrediction(arenaId, predWords, salt);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = predWords;

        engine.finalizeArena(arenaId, players, allPreds);

        // Player predicted all up, oracle was all up → should win with score 10
        ArenaEngine.PlayerState memory ps = engine.getPlayerState(arenaId, alice);
        assertEq(ps.score, 10);
    }

    function test_manipulatedTape_impossible() public {
        // The tape is built from oracle readings — no one can submit a fake tape
        // This test verifies the tape can only come from recordTick/recordTicks
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        // Cannot finalize without recording ticks (no submitPriceTape anymore)
        vm.roll(a.endBlock + 1);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = new uint256[](1);

        vm.expectRevert(ArenaEngine.TapeNotSet.selector);
        engine.finalizeArena(arenaId, players, allPreds);
    }

    // ─── Epoching / Arena Reset ───────────────────────────────────────

    function test_resetArena() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        // Record ticks and finalize
        _recordAllTicksUp(arenaId, a);
        vm.roll(a.endBlock + 1);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = new uint256[](1);
        engine.finalizeArena(arenaId, players, allPreds);

        // Reset
        engine.resetArena(arenaId, 512);
        assertEq(engine.arenaEpoch(arenaId), 1);

        // Old player state is unreachable
        ArenaEngine.PlayerState memory ps = engine.getPlayerState(arenaId, alice);
        assertEq(ps.commitHash, bytes32(0));

        // Oracle state is reset
        ArenaEngine.OracleState memory os = engine.getOracleState(arenaId);
        assertEq(os.ticksRecorded, 0);

        // Can join again in new epoch
        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);
        ps = engine.getPlayerState(arenaId, alice);
        assertEq(ps.commitHash, bytes32(uint256(1)));
    }

    // ─── Ownership ────────────────────────────────────────────────────

    function test_ownable2Step() public {
        engine.transferOwnership(alice);
        assertEq(engine.owner(), address(this));

        vm.prank(alice);
        engine.acceptOwnership();
        assertEq(engine.owner(), alice);
    }

    // ─── Two Players, One Wins ────────────────────────────────────────

    function test_twoPlayers_oneWins() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        // Alice predicts all 1s (up), Bob predicts all 0s (down)
        uint256[] memory predsA = new uint256[](1);
        predsA[0] = type(uint256).max;
        uint256[] memory predsB = new uint256[](1);
        predsB[0] = 0;

        bytes32 saltA = bytes32(uint256(1));
        bytes32 saltB = bytes32(uint256(2));

        bytes32 hashA = keccak256(abi.encodePacked(arenaId, alice, saltA, keccak256(abi.encode(predsA))));
        bytes32 hashB = keccak256(abi.encodePacked(arenaId, bob, saltB, keccak256(abi.encode(predsB))));

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);
        vm.prank(bob);
        engine.joinArena{value: 0.001 ether}(arenaId);

        vm.roll(a.startBlock);
        vm.prank(alice);
        engine.commitPrediction(arenaId, hashA);
        vm.prank(bob);
        engine.commitPrediction(arenaId, hashB);

        // Record all ticks as up — Alice should win
        _recordAllTicksUp(arenaId, a);

        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        engine.revealPrediction(arenaId, predsA, saltA);
        vm.prank(bob);
        engine.revealPrediction(arenaId, predsB, saltB);

        address[] memory players = new address[](2);
        players[0] = alice;
        players[1] = bob;
        uint256[][] memory allPreds = new uint256[][](2);
        allPreds[0] = predsA;
        allPreds[1] = predsB;

        uint256 aliceBefore = alice.balance;
        engine.finalizeArena(arenaId, players, allPreds);

        assertTrue(alice.balance > aliceBefore);
        assertEq(engine.godStreak(alice), 1);
        assertEq(engine.godStreak(bob), 0);
    }

    // ─── Fee Tiers ────────────────────────────────────────────────────

    function test_entryFees() public view {
        assertEq(engine.getEntryFee(ArenaEngine.Tier.Low), 0.001 ether);
        assertEq(engine.getEntryFee(ArenaEngine.Tier.Mid), 0.01 ether);
        assertEq(engine.getEntryFee(ArenaEngine.Tier.High), 0.1 ether);
        assertEq(engine.getEntryFee(ArenaEngine.Tier.VIP), 1 ether);
    }

    function test_rakeBps() public view {
        assertEq(engine.getRakeBps(ArenaEngine.Tier.Low), 500);
        assertEq(engine.getRakeBps(ArenaEngine.Tier.Mid), 400);
        assertEq(engine.getRakeBps(ArenaEngine.Tier.High), 300);
        assertEq(engine.getRakeBps(ArenaEngine.Tier.VIP), 200);
    }

    // ─── Treasury Withdrawal ──────────────────────────────────────────

    function test_treasuryWithdraw() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();
        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        // Record ticks
        _recordAllTicksUp(arenaId, a);
        vm.roll(a.endBlock + 1);

        // Finalize with no reveals - pot goes to treasury
        address[] memory players = new address[](0);
        uint256[][] memory allPreds = new uint256[][](0);
        engine.finalizeArena(arenaId, players, allPreds);

        uint256 treasury = engine.treasuryBalance();
        assertTrue(treasury > 0);

        uint256 balBefore = address(this).balance;
        engine.withdrawTreasury();
        assertEq(address(this).balance, balBefore + treasury);
        assertEq(engine.treasuryBalance(), 0);
    }

    // ─── Tournament Full Flow ─────────────────────────────────────────

    function test_tournament_fullFlow() public {
        uint256 tid = engine.createTournament(ArenaEngine.Tier.Low, 2, 1);
        engine.depositTournamentPot{value: 1 ether}(tid);

        ArenaEngine.Tournament memory t = engine.getTournament(tid);
        assertEq(t.roundCount, 2);
        assertEq(t.pot, 1 ether);

        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256 aliceBefore = alice.balance;
        engine.finalizeTournament(tid, winners);
        assertEq(alice.balance, aliceBefore + 1 ether);
    }

    // ─── Highlights NFT ───────────────────────────────────────────────

    function test_highlightNFT_minted() public {
        (uint256 arenaId, ArenaEngine.Arena memory a) = _setupArena();

        uint256[] memory preds = new uint256[](1);
        preds[0] = type(uint256).max;
        bytes32 salt = bytes32(uint256(42));
        bytes32 commitHash = keccak256(abi.encodePacked(arenaId, alice, salt, keccak256(abi.encode(preds))));

        vm.prank(alice);
        engine.joinArena{value: 0.001 ether}(arenaId);

        vm.roll(a.startBlock);
        vm.prank(alice);
        engine.commitPrediction(arenaId, commitHash);

        // Record all ticks as up
        _recordAllTicksUp(arenaId, a);

        vm.roll(a.endBlock + 1);
        vm.prank(alice);
        engine.revealPrediction(arenaId, preds, salt);

        address[] memory players = new address[](1);
        players[0] = alice;
        uint256[][] memory allPreds = new uint256[][](1);
        allPreds[0] = preds;
        engine.finalizeArena(arenaId, players, allPreds);

        assertEq(highlights.ownerOf(0), alice);
    }

    // ─── Commit Hash Computation ──────────────────────────────────────

    function test_computeCommitHash() public view {
        uint256[] memory preds = new uint256[](2);
        preds[0] = 42;
        preds[1] = 99;
        bytes32 salt = bytes32(uint256(7));
        bytes32 expected = keccak256(abi.encodePacked(uint256(0), alice, salt, keccak256(abi.encode(preds))));
        assertEq(engine.computeCommitHash(0, alice, salt, preds), expected);
    }

    // ─── Self Referral ────────────────────────────────────────────────

    function test_selfReferral_reverts() public {
        vm.prank(alice);
        vm.expectRevert(ArenaEngine.SelfReferral.selector);
        engine.setReferrer(alice);
    }

    function test_zeroAddress_referrer_reverts() public {
        vm.prank(alice);
        vm.expectRevert(ArenaEngine.ZeroAddress.selector);
        engine.setReferrer(address(0));
    }

    receive() external payable {}
}
