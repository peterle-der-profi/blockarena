// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title StreakLib — God Streak multiplier logic
/// @notice Returns basis-point multipliers based on consecutive win streaks
library StreakLib {
    /// @notice Get multiplier in basis points (10000 = 1x)
    /// @param streak Consecutive wins
    /// @return mult Multiplier in basis points
    function getMultiplier(uint16 streak) internal pure returns (uint16 mult) {
        if (streak >= 5) return 15000; // 1.5x
        if (streak >= 3) return 12000; // 1.2x
        if (streak >= 2) return 11000; // 1.1x
        return 10000; // 1x
    }
}
