// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BitPack — Bit-level utilities for packed uint256 arrays
/// @notice Provides single-bit access, 2-bit access, and SWAR popcount
library BitPack {

    /// @notice Read bit `i` from a packed uint256 array (MSB-first within each word)
    /// @param words The packed array of uint256 words
    /// @param i The bit index (0-based across all words)
    /// @return The bit value (0 or 1)
    function getBit(uint256[] memory words, uint256 i) internal pure returns (uint256) {
        uint256 wordIdx = i >> 8;          // i / 256
        uint256 bitIdx  = 255 - (i & 0xFF); // MSB-first
        return (words[wordIdx] >> bitIdx) & 1;
    }

    /// @notice Read a 2-bit value from a packed uint256 array
    /// @param words The packed word array (128 values per word, MSB-first)
    /// @param i The 2-bit pair index (0-based)
    /// @return The 2-bit value (0–3)
    function get2bit(uint256[] memory words, uint256 i) internal pure returns (uint256) {
        uint256 wordIdx = i >> 7;          // i / 128
        uint256 pairIdx = i & 0x7F;        // i % 128
        return (words[wordIdx] >> (254 - pairIdx * 2)) & 3;
    }

    /// @notice SWAR popcount — counts set bits in a uint256 in O(1)
    /// @dev Full-width 256-bit parallel popcount. After the nibble stage each byte
    ///      holds its local bit count (0–8). The multiply by 0x0101…01 sums all
    ///      32 bytes into the top byte. Max sum = 256 which fits in 9 bits, but
    ///      since each byte ≤ 8 and we have 32 bytes, the carry chain is safe
    ///      and the result lands correctly in bits [255:248] after multiply.
    /// @param x The value to count bits in
    /// @return c The number of set bits (Hamming weight), 0–256
    function popcount(uint256 x) internal pure returns (uint256 c) {
        unchecked {
            // Process as four 64-bit chunks to avoid multiply overflow
            uint256 x0 = x         & 0xFFFFFFFFFFFFFFFF;
            uint256 x1 = (x >> 64) & 0xFFFFFFFFFFFFFFFF;
            uint256 x2 = (x >> 128) & 0xFFFFFFFFFFFFFFFF;
            uint256 x3 = (x >> 192) & 0xFFFFFFFFFFFFFFFF;

            c = _popcount64(x0) + _popcount64(x1) + _popcount64(x2) + _popcount64(x3);
        }
    }

    /// @dev 64-bit SWAR popcount — all operations stay within 64 bits
    function _popcount64(uint256 v) private pure returns (uint256) {
        unchecked {
            v = v - ((v >> 1) & 0x5555555555555555);
            v = (v & 0x3333333333333333) + ((v >> 2) & 0x3333333333333333);
            v = (v + (v >> 4)) & 0x0F0F0F0F0F0F0F0F;
            // v is now 8 bytes each ≤ 8. Multiply sums them into top byte.
            // Since v fits in 64 bits and multiplier is 64 bits, product fits in 128 bits.
            // Result is in bits [63:56] of the 128-bit product, so >> 56.
            return ((v * 0x0101010101010101) >> 56) & 0xFF;
        }
    }
}
