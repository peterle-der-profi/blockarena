// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibBlockArena} from "../libraries/LibBlockArena.sol";

/// @title TournamentFacet — Tournament mode
contract TournamentFacet {
    event TournamentCreated(uint256 indexed tournamentId, LibBlockArena.Tier tier, uint8 roundCount, uint8 arenasPerRound);
    event TournamentArenaAdded(uint256 indexed tournamentId, uint8 round, uint256 arenaId);
    event TournamentFinalized(uint256 indexed tournamentId);

    error TournamentNotFound();
    error TournamentAlreadyFinalized();
    error InvalidRound();
    error TransferFailed();

    function createTournament(LibBlockArena.Tier tier, uint8 roundCount, uint8 arenasPerRound)
        external returns (uint256 id)
    {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.enforceNotPaused();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();

        id = s.nextTournamentId++;
        s.tournaments[id] = LibBlockArena.Tournament(tier, roundCount, arenasPerRound, 0, false, 0, msg.sender);
        emit TournamentCreated(id, tier, roundCount, arenasPerRound);
    }

    function addArenaToTournament(uint256 tid, uint256 arenaId, uint8 round) external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        if (s.tournaments[tid].roundCount == 0) revert TournamentNotFound();
        if (round >= s.tournaments[tid].roundCount) revert InvalidRound();
        s.arenas[arenaId].tournamentId = tid + 1;
        s.tournamentRoundArenas[tid][round].push(arenaId);
        emit TournamentArenaAdded(tid, round, arenaId);
    }

    function advanceTournamentRound(uint256 tid) external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        LibBlockArena.Tournament storage t = s.tournaments[tid];
        if (t.roundCount == 0) revert TournamentNotFound();
        if (t.finalized) revert TournamentAlreadyFinalized();
        t.currentRound++;
    }

    function finalizeTournament(uint256 tid, address[] calldata winners) external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.enforceNonReentrant();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        LibBlockArena.Tournament storage t = s.tournaments[tid];
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
        LibBlockArena.clearReentrancy();
    }

    function depositTournamentPot(uint256 tid) external payable {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        if (s.tournaments[tid].roundCount == 0) revert TournamentNotFound();
        s.tournaments[tid].pot += uint128(msg.value);
    }

    // ─── Views ────────────────────────────────────────────────────────

    function nextTournamentId() external view returns (uint256) {
        return LibBlockArena.appStorage().nextTournamentId;
    }

    function getTournament(uint256 id) external view returns (LibBlockArena.Tournament memory) {
        return LibBlockArena.appStorage().tournaments[id];
    }
}
