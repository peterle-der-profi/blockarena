// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LibDiamond} from "../libraries/LibDiamond.sol";

/// @title OwnershipFacet — Ownable2Step for diamond ownership
contract OwnershipFacet {
    function transferOwnership(address _newOwner) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.pendingOwner = _newOwner;
        emit LibDiamond.OwnershipTransferStarted(ds.contractOwner, _newOwner);
    }

    function acceptOwnership() external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        if (msg.sender != ds.pendingOwner) revert LibDiamond.NotPendingOwner();
        ds.pendingOwner = address(0);
        LibDiamond.setContractOwner(msg.sender);
    }

    function owner() external view returns (address) {
        return LibDiamond.contractOwner();
    }

    function pendingOwner() external view returns (address) {
        return LibDiamond.diamondStorage().pendingOwner;
    }
}
