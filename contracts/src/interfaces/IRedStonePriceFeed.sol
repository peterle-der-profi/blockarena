// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRedStonePriceFeed — Chainlink-compatible interface for RedStone price feeds
interface IRedStonePriceFeed {
    function latestAnswer() external view returns (int256);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
