// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRedStonePriceFeed} from "../interfaces/IRedStonePriceFeed.sol";

/// @title MockPriceFeed — Test mock for RedStone price feed
contract MockPriceFeed is IRedStonePriceFeed {
    int256 public price;
    uint80 public roundId;

    function setPrice(int256 _price) external {
        price = _price;
        roundId++;
    }

    function latestAnswer() external view override returns (int256) {
        return price;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (roundId, price, block.timestamp, block.timestamp, roundId);
    }
}
