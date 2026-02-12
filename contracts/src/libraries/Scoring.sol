// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BitPack} from "./BitPack.sol";

/// @title Scoring — Gas-efficient XOR + popcount scoring for BlockArena
/// @notice Scores a player's bit-packed predictions against the price tape
library Scoring {
    /// @notice Score a player's predictions against the price tape
    /// @dev XORs prediction words with tape words and counts matching bits.
    ///      For 1500 ticks: ceil(1500/256) = 6 word iterations.
    /// @param predWords Player's bit-packed predictions (calldata)
    /// @param tapeWords Price tape bit-packed words (storage)
    /// @param ticks Number of ticks to score
    /// @return score Number of correct predictions
    function scorePlayer(
        uint256[] memory predWords,
        uint256[] storage tapeWords,
        uint256 ticks
    ) internal view returns (uint256 score) {
        unchecked {
            uint256 fullWords = ticks >> 8; // ticks / 256
            uint256 remainder = ticks & 0xFF; // ticks % 256

            // Score full 256-bit words
            for (uint256 i = 0; i < fullWords; i++) {
                uint256 xored = predWords[i] ^ tapeWords[i];
                uint256 wrong = BitPack.popcount(xored);
                score += 256 - wrong;
            }

            // Score partial last word (if any remaining ticks)
            if (remainder > 0) {
                uint256 xored = predWords[fullWords] ^ tapeWords[fullWords];
                // Mask: keep only top `remainder` bits
                uint256 mask = type(uint256).max << (256 - remainder);
                uint256 wrong = BitPack.popcount(xored & mask);
                score += remainder - wrong;
            }
        }
    }
}
