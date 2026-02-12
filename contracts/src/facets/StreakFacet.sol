// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LibBlockArena} from "../libraries/LibBlockArena.sol";

/// @title StreakFacet — God streak tracking views
/// @dev Streak mutations happen in ArenaFacet during finalization.
///      This facet provides read-only access to streak data.
contract StreakFacet {
    function getGodStreak(address player) external view returns (uint16) {
        return LibBlockArena.appStorage().godStreak[player];
    }
}
