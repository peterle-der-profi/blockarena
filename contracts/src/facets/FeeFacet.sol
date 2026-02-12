// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibBlockArena} from "../libraries/LibBlockArena.sol";

/// @title FeeFacet — Rake, treasury, referrals
contract FeeFacet {
    event ReferrerSet(address indexed player, address indexed ref);
    event TreasuryWithdrawn(address indexed to, uint256 amount);

    error ZeroAddress();
    error SelfReferral();
    error ReferrerAlreadySet();
    error NothingToWithdraw();
    error TransferFailed();

    function setReferrer(address _ref) external {
        if (_ref == address(0)) revert ZeroAddress();
        if (_ref == msg.sender) revert SelfReferral();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        if (s.referrer[msg.sender] != address(0)) revert ReferrerAlreadySet();
        s.referrer[msg.sender] = _ref;
        emit ReferrerSet(msg.sender, _ref);
    }

    function withdrawReferralEarnings() external {
        LibBlockArena.enforceNonReentrant();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        uint256 bal = s.referrerBalance[msg.sender];
        if (bal == 0) revert NothingToWithdraw();
        s.referrerBalance[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: bal}("");
        if (!ok) revert TransferFailed();
        LibBlockArena.clearReentrancy();
    }

    function withdrawTreasury() external {
        LibDiamond.enforceIsContractOwner();
        LibBlockArena.enforceNonReentrant();
        LibBlockArena.AppStorage storage s = LibBlockArena.appStorage();
        uint256 bal = s.treasuryBalance;
        if (bal == 0) revert NothingToWithdraw();
        s.treasuryBalance = 0;
        (bool ok,) = msg.sender.call{value: bal}("");
        if (!ok) revert TransferFailed();
        emit TreasuryWithdrawn(msg.sender, bal);
        LibBlockArena.clearReentrancy();
    }

    // ─── Views ────────────────────────────────────────────────────────

    function treasuryBalance() external view returns (uint256) {
        return LibBlockArena.appStorage().treasuryBalance;
    }

    function referrer(address player) external view returns (address) {
        return LibBlockArena.appStorage().referrer[player];
    }

    function referrerBalance(address player) external view returns (uint256) {
        return LibBlockArena.appStorage().referrerBalance[player];
    }

    function setHighlightsNFT(address _nft) external {
        LibDiamond.enforceIsContractOwner();
        if (_nft == address(0)) revert ZeroAddress();
        LibBlockArena.appStorage().highlightsNFT = _nft;
    }

    function highlightsNFT() external view returns (address) {
        return LibBlockArena.appStorage().highlightsNFT;
    }
}
