// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibBlockArena} from "../libraries/LibBlockArena.sol";

/// @title EmergencyFacet — Pause/unpause, emergency withdraw
contract EmergencyFacet {
    event Paused();
    event Unpaused();
    event EmergencyWithdraw(uint256 indexed arenaId, address indexed player, uint256 amount);

    error ArenaNotFound();
    error ArenaAlreadyFinalized();
    error ArenaNotStuck();

    function pause() external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.appStorage().paused = true;
        emit Paused();
    }

    function unpause() external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.appStorage().paused = false;
        emit Unpaused();
    }

    function paused() external view returns (bool) {
        return LibBlockArena.appStorage().paused;
    }

    function emergencyWithdraw(uint256 arenaId, address[] calldata players) external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.enforceNonReentrant();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();

        LibBlockArena.Arena storage a = s.arenas[arenaId];
        if (a.startBlock == 0) revert ArenaNotFound();
        if (a.finalized) revert ArenaAlreadyFinalized();
        if (block.number < a.endBlock + LibBlockArena.EMERGENCY_BLOCK_DELAY) revert ArenaNotStuck();

        uint256 amount = a.pot;
        a.pot = 0;
        a.finalized = true;

        uint256 len = players.length;
        if (len > 0) {
            uint256 refund = amount / len;
            for (uint256 i; i < len; ++i) {
                if (s.playerState[arenaId][s.arenaEpoch[arenaId]][players[i]].commitHash != bytes32(0)) {
                    (bool ok,) = players[i].call{value: refund}("");
                    if (ok) emit EmergencyWithdraw(arenaId, players[i], refund);
                }
            }
        }
        LibBlockArena.clearReentrancy();
    }
}
