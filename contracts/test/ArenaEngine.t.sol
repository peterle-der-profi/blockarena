// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ArenaEngine} from "../src/ArenaEngine.sol";
import {BlockArenaHighlights} from "../src/BlockArenaHighlights.sol";

contract ArenaEngineTest is Test {
    ArenaEngine engine;
    BlockArenaHighlights highlights;
    address owner = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address charlie = address(0xC0C);
    address referrerAddr = address(0xBEEF);

    function setUp() public {
        engine = new ArenaEngine();
        highlights = new BlockArenaHighlights(address(engine));
        engine.setHighlightsNFT(address(highlights));
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Arena Tiers
    // ═══════════════════════════════════════════════════════════════════

    function test_CreateArenaWithTier() public {
        uint256 id = engine.createArena(ArenaEngine.Tier.Low, 1000);
        assertEq(id, 0);
        ArenaEngine.Arena memory a = engine.getArena(0);
        assertEq(uint8(a.tier), uint8(ArenaEngine.Tier.Low));
        assertEq(a.endBlock - a.startBlock, 1000);
    }

    function test_TierEntryFees() public {
        assertEq(engine.getEntryFee(ArenaEngine.Tier.Low), 0.001 ether);
        assertEq(engine.getEntryFee(ArenaEngine.Tier.Mid), 0.01 ether);
        assertEq(engine.getEntryFee(ArenaEngine.Tier.High), 0.1 ether);
        assertEq(engine.getEntryFee(ArenaEngine.Tier.VIP), 1 ether);
    }

    function test_TierRakeBps() public {
        assertEq(engine.getRakeBps(ArenaEngine.Tier.Low), 500);
        assertEq(engine.getRakeBps(ArenaEngine.Tier.Mid), 400);
        assertEq(engine.getRakeBps(ArenaEngine.Tier.High), 300);
        assertEq(engine.getRakeBps(ArenaEngine.Tier.VIP), 200);
    }

    function test_JoinArenaWithTier() public {
        engine.createArena(ArenaEngine.Tier.Mid, 1000);

        vm.prank(alice);
        engine.joinArena{value: 0.01 ether}(0);

        ArenaEngine.Arena memory a = engine.getArena(0);
        assertEq(a.playerCount, 1);
        assertEq(a.pot, 0.01 ether);
    }

    function test_RevertWhen_InsufficientFeeForTier() public {
        engine.createArena(ArenaEngine.Tier.High, 1000);

        vm.prank(alice);
        vm.expectRevert(ArenaEngine.InsufficientFee.selector);
        engine.joinArena{value: 0.01 ether}(0); // needs 0.1 ETH
    }

    // ═══════════════════════════════════════════════════════════════════
    // Core Arena Flow (backward compat)
    // ═══════════════════════════════════════════════════════════════════

    function test_JoinArena() public {
        engine.createArena(ArenaEngine.Tier.Mid, 1000);

        vm.prank(alice);
        engine.joinArena{value: 0.01 ether}(0);

        assertTrue(engine.joined(0, alice));
    }

    function test_RevertWhen_JoinAfterStart() public {
        engine.createArena(ArenaEngine.Tier.Mid, 1000);
        vm.roll(block.number + 101);

        vm.prank(alice);
        vm.expectRevert(ArenaEngine.ArenaAlreadyStarted.selector);
        engine.joinArena{value: 0.01 ether}(0);
    }

    function test_CommitRevealFlow() public {
        engine.createArena(ArenaEngine.Tier.Mid, 200);

        vm.prank(alice);
        engine.joinArena{value: 0.01 ether}(0);
        vm.prank(bob);
        engine.joinArena{value: 0.01 ether}(0);

        vm.roll(block.number + 100);

        uint256 alicePred = 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;
        bytes32 aliceSalt = bytes32(uint256(42));
        bytes32 aliceCommit = keccak256(abi.encodePacked(uint256(0), alice, aliceSalt, alicePred));

        vm.prank(alice);
        engine.commitPrediction(0, aliceCommit);

        uint256 bobPred = type(uint256).max;
        bytes32 bobSalt = bytes32(uint256(99));
        bytes32 bobCommit = keccak256(abi.encodePacked(uint256(0), bob, bobSalt, bobPred));

        vm.prank(bob);
        engine.commitPrediction(0, bobCommit);

        vm.roll(block.number + 201);

        vm.prank(alice);
        engine.revealPrediction(0, alicePred, aliceSalt);

        vm.prank(bob);
        engine.revealPrediction(0, bobPred, bobSalt);
    }

    function test_RevertWhen_InvalidReveal() public {
        engine.createArena(ArenaEngine.Tier.Mid, 200);

        vm.prank(alice);
        engine.joinArena{value: 0.01 ether}(0);

        vm.roll(block.number + 100);

        bytes32 salt = bytes32(uint256(1));
        uint256 predictions = 123;
        bytes32 commit = keccak256(abi.encodePacked(uint256(0), alice, salt, predictions));

        vm.prank(alice);
        engine.commitPrediction(0, commit);

        vm.roll(block.number + 201);

        vm.prank(alice);
        vm.expectRevert(ArenaEngine.InvalidReveal.selector);
        engine.revealPrediction(0, 456, salt);
    }

    function test_FinalizeArenaWithRake() public {
        engine.createArena(ArenaEngine.Tier.Mid, 200); // 4% rake

        vm.prank(alice);
        engine.joinArena{value: 0.01 ether}(0);
        vm.prank(bob);
        engine.joinArena{value: 0.01 ether}(0);

        vm.roll(block.number + 100);

        // Alice predicts all DOWN (0x00), Bob predicts all UP (0xFF...)
        uint256 alicePred = 0;
        bytes32 aliceSalt = bytes32(uint256(1));
        bytes32 aliceCommit = keccak256(abi.encodePacked(uint256(0), alice, aliceSalt, alicePred));
        vm.prank(alice);
        engine.commitPrediction(0, aliceCommit);

        uint256 bobPred = type(uint256).max;
        bytes32 bobSalt = bytes32(uint256(2));
        bytes32 bobCommit = keccak256(abi.encodePacked(uint256(0), bob, bobSalt, bobPred));
        vm.prank(bob);
        engine.commitPrediction(0, bobCommit);

        vm.roll(block.number + 201);

        vm.prank(alice);
        engine.revealPrediction(0, alicePred, aliceSalt);
        vm.prank(bob);
        engine.revealPrediction(0, bobPred, bobSalt);

        // Price tape: all UP
        bytes memory tape = new bytes(32);
        for (uint256 i = 0; i < 32; i++) tape[i] = bytes1(0xFF);
        engine.submitPriceTape(0, tape);

        uint256 bobBalBefore = bob.balance;
        engine.finalizeArena(0);

        assertTrue(engine.getArena(0).finalized);
        assertGt(bob.balance, bobBalBefore);

        // Treasury should have collected rake (4% of 0.02 ETH = 0.0008 ETH)
        assertEq(engine.treasuryBalance(), 0.0008 ether);
    }

    // ═══════════════════════════════════════════════════════════════════
    // God Streak Tracking
    // ═══════════════════════════════════════════════════════════════════

    function test_GodStreakIncrementsOnWin() public {
        _runArenaWithWinner(alice, bob); // arena 0
        assertEq(engine.godStreak(alice), 1);

        _runArenaWithWinner(alice, bob); // arena 1
        assertEq(engine.godStreak(alice), 2);
    }

    function test_GodStreakResetsOnLoss() public {
        _runArenaWithWinner(alice, bob);
        assertEq(engine.godStreak(alice), 1);

        // Now bob wins
        _runArenaWithWinner(bob, alice);
        assertEq(engine.godStreak(alice), 0);
        assertEq(engine.godStreak(bob), 1);
    }

    function test_StreakMultiplier() public {
        assertEq(engine.getStreakMultiplier(0), 10000); // 1x
        assertEq(engine.getStreakMultiplier(1), 10000); // 1x
        assertEq(engine.getStreakMultiplier(2), 11000); // 1.1x
        assertEq(engine.getStreakMultiplier(3), 12000); // 1.2x
        assertEq(engine.getStreakMultiplier(4), 12000); // 1.2x
        assertEq(engine.getStreakMultiplier(5), 15000); // 1.5x
        assertEq(engine.getStreakMultiplier(10), 15000); // 1.5x
    }

    // ═══════════════════════════════════════════════════════════════════
    // Referral System & Fee Splitter
    // ═══════════════════════════════════════════════════════════════════

    function test_SetReferrer() public {
        vm.prank(alice);
        engine.setReferrer(referrerAddr);
        assertEq(engine.referrer(alice), referrerAddr);
    }

    function test_RevertWhen_SelfReferral() public {
        vm.prank(alice);
        vm.expectRevert(ArenaEngine.SelfReferral.selector);
        engine.setReferrer(alice);
    }

    function test_RevertWhen_ReferrerAlreadySet() public {
        vm.prank(alice);
        engine.setReferrer(referrerAddr);

        vm.prank(alice);
        vm.expectRevert(ArenaEngine.ReferrerAlreadySet.selector);
        engine.setReferrer(bob);
    }

    function test_ReferralPaidOnFinalize() public {
        // Set referrer for alice
        vm.prank(alice);
        engine.setReferrer(referrerAddr);

        _runArenaWithWinner(alice, bob);

        // Referrer should have earnings
        assertGt(engine.referrerBalance(referrerAddr), 0);
    }

    function test_WithdrawReferralEarnings() public {
        vm.prank(alice);
        engine.setReferrer(referrerAddr);

        _runArenaWithWinner(alice, bob);

        uint256 earnings = engine.referrerBalance(referrerAddr);
        assertGt(earnings, 0);

        vm.deal(referrerAddr, 0);
        vm.prank(referrerAddr);
        engine.withdrawReferralEarnings();

        assertEq(engine.referrerBalance(referrerAddr), 0);
        assertEq(referrerAddr.balance, earnings);
    }

    function test_WithdrawTreasury() public {
        _runArenaWithWinner(alice, bob);

        uint256 treasury = engine.treasuryBalance();
        assertGt(treasury, 0);

        uint256 ownerBalBefore = owner.balance;
        engine.withdrawTreasury();

        assertEq(engine.treasuryBalance(), 0);
        assertEq(owner.balance, ownerBalBefore + treasury);
    }

    function test_RevertWhen_NonOwnerWithdrawsTreasury() public {
        vm.prank(alice);
        vm.expectRevert(ArenaEngine.NotOwner.selector);
        engine.withdrawTreasury();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Emergency Controls (Pausable)
    // ═══════════════════════════════════════════════════════════════════

    function test_PauseUnpause() public {
        engine.pause();
        assertTrue(engine.paused());

        vm.expectRevert();
        engine.createArena(ArenaEngine.Tier.Low, 1000);

        engine.unpause();
        assertFalse(engine.paused());

        engine.createArena(ArenaEngine.Tier.Low, 1000); // should work
    }

    function test_RevertWhen_NonOwnerPauses() public {
        vm.prank(alice);
        vm.expectRevert(ArenaEngine.NotOwner.selector);
        engine.pause();
    }

    function test_EmergencyWithdraw() public {
        engine.createArena(ArenaEngine.Tier.Mid, 200);

        vm.prank(alice);
        engine.joinArena{value: 0.01 ether}(0);
        vm.prank(bob);
        engine.joinArena{value: 0.01 ether}(0);

        // Roll past end + emergency delay
        ArenaEngine.Arena memory a = engine.getArena(0);
        vm.roll(a.endBlock + 50001);

        uint256 aliceBalBefore = alice.balance;
        uint256 bobBalBefore = bob.balance;

        engine.emergencyWithdraw(0);

        assertTrue(engine.getArena(0).finalized);
        assertEq(alice.balance, aliceBalBefore + 0.01 ether);
        assertEq(bob.balance, bobBalBefore + 0.01 ether);
    }

    function test_RevertWhen_EmergencyWithdrawTooEarly() public {
        engine.createArena(ArenaEngine.Tier.Mid, 200);

        vm.prank(alice);
        engine.joinArena{value: 0.01 ether}(0);

        ArenaEngine.Arena memory a = engine.getArena(0);
        vm.roll(a.endBlock + 100); // not enough blocks

        vm.expectRevert(ArenaEngine.ArenaNotStuck.selector);
        engine.emergencyWithdraw(0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Highlight NFT
    // ═══════════════════════════════════════════════════════════════════

    function test_HighlightNFTMintedOnWin() public {
        _runArenaWithWinner(alice, bob);

        // Alice should have received an NFT
        assertEq(highlights.balanceOf(alice), 1);
        assertEq(highlights.ownerOf(0), alice);
    }

    function test_HighlightNFTMetadata() public {
        _runArenaWithWinner(alice, bob);

        string memory uri = highlights.tokenURI(0);
        // Should start with data:application/json;base64,
        assertTrue(bytes(uri).length > 0);
    }

    function test_HighlightData() public {
        _runArenaWithWinner(alice, bob);

        (uint40 arenaId, uint40 startBlock, uint40 endBlock, uint16 score, uint16 streak, address player) = highlights.highlights(0);
        assertEq(arenaId, 0);
        assertEq(player, alice);
        assertGt(score, 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Tournament Mode
    // ═══════════════════════════════════════════════════════════════════

    function test_CreateTournament() public {
        uint256 tid = engine.createTournament(ArenaEngine.Tier.Mid, 3, 2);
        assertEq(tid, 0);

        ArenaEngine.Tournament memory t = engine.getTournament(0);
        assertEq(uint8(t.tier), uint8(ArenaEngine.Tier.Mid));
        assertEq(t.roundCount, 3);
        assertEq(t.arenasPerRound, 2);
        assertFalse(t.finalized);
    }

    function test_TournamentArenaAssignment() public {
        engine.createTournament(ArenaEngine.Tier.Mid, 2, 1);
        uint256 arenaId = engine.createArena(ArenaEngine.Tier.Mid, 200);
        engine.addArenaToTournament(0, arenaId, 0);

        uint256[] memory roundArenas = engine.getTournamentRoundArenas(0, 0);
        assertEq(roundArenas.length, 1);
        assertEq(roundArenas[0], arenaId);
    }

    function test_TournamentQualification() public {
        engine.createTournament(ArenaEngine.Tier.Mid, 2, 1);
        uint256 arenaId = engine.createArena(ArenaEngine.Tier.Mid, 200);
        engine.addArenaToTournament(0, arenaId, 0);

        // Join before running
        vm.prank(alice);
        engine.joinArena{value: 0.01 ether}(arenaId);
        vm.prank(bob);
        engine.joinArena{value: 0.01 ether}(arenaId);

        ArenaEngine.Arena memory a = engine.getArena(arenaId);
        vm.roll(a.startBlock);

        uint256 winnerPred = type(uint256).max;
        bytes32 winnerSalt = bytes32(uint256(arenaId * 100 + 1));
        bytes32 winnerCommit = keccak256(abi.encodePacked(arenaId, alice, winnerSalt, winnerPred));
        vm.prank(alice);
        engine.commitPrediction(arenaId, winnerCommit);

        uint256 loserPred = 0;
        bytes32 loserSalt = bytes32(uint256(arenaId * 100 + 2));
        bytes32 loserCommit = keccak256(abi.encodePacked(arenaId, bob, loserSalt, loserPred));
        vm.prank(bob);
        engine.commitPrediction(arenaId, loserCommit);

        vm.roll(a.endBlock + 1);

        vm.prank(alice);
        engine.revealPrediction(arenaId, winnerPred, winnerSalt);
        vm.prank(bob);
        engine.revealPrediction(arenaId, loserPred, loserSalt);

        bytes memory tape = new bytes(32);
        for (uint256 i = 0; i < 32; i++) tape[i] = bytes1(0xFF);
        engine.submitPriceTape(arenaId, tape);

        // Verify tournament link (stored as id+1, so tournament 0 → stored as 1)
        assertEq(engine.getArena(arenaId).tournamentId, 1);

        engine.finalizeArena(arenaId);

        // Alice should be qualified for round 0
        assertTrue(engine.tournamentQualified(0, 0, alice));
        address[] memory qualified = engine.getTournamentQualifiedPlayers(0, 0);
        assertEq(qualified.length, 1);
        assertEq(qualified[0], alice);
    }

    function test_FinalizeTournament() public {
        engine.createTournament(ArenaEngine.Tier.Mid, 1, 1);
        engine.depositTournamentPot{value: 1 ether}(0);

        uint256 arenaId = engine.createArena(ArenaEngine.Tier.Mid, 200);
        engine.addArenaToTournament(0, arenaId, 0);

        // Run arena inline to control tournamentId link
        vm.prank(alice);
        engine.joinArena{value: 0.01 ether}(arenaId);
        vm.prank(bob);
        engine.joinArena{value: 0.01 ether}(arenaId);

        ArenaEngine.Arena memory a = engine.getArena(arenaId);
        vm.roll(a.startBlock);

        uint256 winnerPred = type(uint256).max;
        bytes32 winnerSalt = bytes32(uint256(arenaId * 100 + 1));
        bytes32 winnerCommit = keccak256(abi.encodePacked(arenaId, alice, winnerSalt, winnerPred));
        vm.prank(alice);
        engine.commitPrediction(arenaId, winnerCommit);

        uint256 loserPred = 0;
        bytes32 loserSalt = bytes32(uint256(arenaId * 100 + 2));
        bytes32 loserCommit = keccak256(abi.encodePacked(arenaId, bob, loserSalt, loserPred));
        vm.prank(bob);
        engine.commitPrediction(arenaId, loserCommit);

        vm.roll(a.endBlock + 1);

        vm.prank(alice);
        engine.revealPrediction(arenaId, winnerPred, winnerSalt);
        vm.prank(bob);
        engine.revealPrediction(arenaId, loserPred, loserSalt);

        bytes memory tape = new bytes(32);
        for (uint256 i = 0; i < 32; i++) tape[i] = bytes1(0xFF);
        engine.submitPriceTape(arenaId, tape);
        engine.finalizeArena(arenaId);

        uint256 aliceBalBefore = alice.balance;
        engine.finalizeTournament(0);

        ArenaEngine.Tournament memory t = engine.getTournament(0);
        assertTrue(t.finalized);
        assertEq(alice.balance, aliceBalBefore + 1 ether);
    }

    // ═══════════════════════════════════════════════════════════════════
    // View Helpers
    // ═══════════════════════════════════════════════════════════════════

    function test_ComputeCommitHash() public view {
        bytes32 hash = engine.computeCommitHash(0, alice, bytes32(uint256(1)), 123);
        bytes32 expected = keccak256(abi.encodePacked(uint256(0), alice, bytes32(uint256(1)), uint256(123)));
        assertEq(hash, expected);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Run an arena where `winner` predicts all UP (matching tape) and `loser` predicts all DOWN
    function _runArenaWithWinner(address winner, address loser) internal {
        uint256 arenaId = engine.createArena(ArenaEngine.Tier.Mid, 200);
        _runSpecificArena(arenaId, winner, loser);
    }

    function _runSpecificArena(uint256 arenaId, address winner, address loser) internal {
        vm.prank(winner);
        engine.joinArena{value: 0.01 ether}(arenaId);
        vm.prank(loser);
        engine.joinArena{value: 0.01 ether}(arenaId);

        ArenaEngine.Arena memory a = engine.getArena(arenaId);
        vm.roll(a.startBlock);

        // Winner predicts all UP, loser predicts all DOWN
        uint256 winnerPred = type(uint256).max;
        bytes32 winnerSalt = bytes32(uint256(arenaId * 100 + 1));
        bytes32 winnerCommit = keccak256(abi.encodePacked(arenaId, winner, winnerSalt, winnerPred));
        vm.prank(winner);
        engine.commitPrediction(arenaId, winnerCommit);

        uint256 loserPred = 0;
        bytes32 loserSalt = bytes32(uint256(arenaId * 100 + 2));
        bytes32 loserCommit = keccak256(abi.encodePacked(arenaId, loser, loserSalt, loserPred));
        vm.prank(loser);
        engine.commitPrediction(arenaId, loserCommit);

        vm.roll(a.endBlock + 1);

        vm.prank(winner);
        engine.revealPrediction(arenaId, winnerPred, winnerSalt);
        vm.prank(loser);
        engine.revealPrediction(arenaId, loserPred, loserSalt);

        bytes memory tape = new bytes(32);
        for (uint256 i = 0; i < 32; i++) tape[i] = bytes1(0xFF);
        engine.submitPriceTape(arenaId, tape);

        engine.finalizeArena(arenaId);
    }

    receive() external payable {}
}
