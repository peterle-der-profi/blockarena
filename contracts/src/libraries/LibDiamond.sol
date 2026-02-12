// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";

/// @title LibDiamond — Diamond storage and cut logic
library LibDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");

    struct FacetAddressAndPosition {
        address facetAddress;
        uint96 functionSelectorPosition;
    }

    struct FacetFunctionSelectors {
        bytes4[] functionSelectors;
        uint256 facetAddressPosition;
    }

    struct DiamondStorage {
        mapping(bytes4 => FacetAddressAndPosition) selectorToFacetAndPosition;
        mapping(address => FacetFunctionSelectors) facetFunctionSelectors;
        address[] facetAddresses;
        mapping(bytes4 => bool) supportedInterfaces;
        address contractOwner;
        address pendingOwner;
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut, address _init, bytes _calldata);

    error NotContractOwner(address sender, address owner);
    error NoSelectorsInFacet();
    error NoZeroAddress();
    error SelectorAlreadyExists(bytes4 selector);
    error SelectorNotFound(bytes4 selector);
    error RemoveFacetAddressMustBeZero();
    error CannotRemoveImmutableFunction(bytes4 selector);
    error InitFailed(address init, bytes data);
    error NotPendingOwner();

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly { ds.slot := position }
    }

    function setContractOwner(address _newOwner) internal {
        DiamondStorage storage ds = diamondStorage();
        address previousOwner = ds.contractOwner;
        ds.contractOwner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    function contractOwner() internal view returns (address) {
        return diamondStorage().contractOwner;
    }

    function enforceIsContractOwner() internal view {
        DiamondStorage storage ds = diamondStorage();
        if (msg.sender != ds.contractOwner) revert NotContractOwner(msg.sender, ds.contractOwner);
    }

    function diamondCut(IDiamondCut.FacetCut[] memory _cut, address _init, bytes memory _calldata) internal {
        for (uint256 i; i < _cut.length; i++) {
            IDiamondCut.FacetCutAction action = _cut[i].action;
            if (action == IDiamondCut.FacetCutAction.Add) {
                addFunctions(_cut[i].facetAddress, _cut[i].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                replaceFunctions(_cut[i].facetAddress, _cut[i].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Remove) {
                removeFunctions(_cut[i].facetAddress, _cut[i].functionSelectors);
            }
        }
        emit DiamondCut(_cut, _init, _calldata);
        initializeDiamondCut(_init, _calldata);
    }

    function addFunctions(address _facet, bytes4[] memory _selectors) internal {
        if (_selectors.length == 0) revert NoSelectorsInFacet();
        if (_facet == address(0)) revert NoZeroAddress();
        DiamondStorage storage ds = diamondStorage();
        uint96 selectorPosition = uint96(ds.facetFunctionSelectors[_facet].functionSelectors.length);
        if (selectorPosition == 0) {
            ds.facetFunctionSelectors[_facet].facetAddressPosition = ds.facetAddresses.length;
            ds.facetAddresses.push(_facet);
        }
        for (uint256 i; i < _selectors.length; i++) {
            bytes4 selector = _selectors[i];
            address oldFacet = ds.selectorToFacetAndPosition[selector].facetAddress;
            if (oldFacet != address(0)) revert SelectorAlreadyExists(selector);
            ds.facetFunctionSelectors[_facet].functionSelectors.push(selector);
            ds.selectorToFacetAndPosition[selector] = FacetAddressAndPosition(_facet, selectorPosition);
            selectorPosition++;
        }
    }

    function replaceFunctions(address _facet, bytes4[] memory _selectors) internal {
        if (_selectors.length == 0) revert NoSelectorsInFacet();
        if (_facet == address(0)) revert NoZeroAddress();
        DiamondStorage storage ds = diamondStorage();
        uint96 selectorPosition = uint96(ds.facetFunctionSelectors[_facet].functionSelectors.length);
        if (selectorPosition == 0) {
            ds.facetFunctionSelectors[_facet].facetAddressPosition = ds.facetAddresses.length;
            ds.facetAddresses.push(_facet);
        }
        for (uint256 i; i < _selectors.length; i++) {
            bytes4 selector = _selectors[i];
            address oldFacet = ds.selectorToFacetAndPosition[selector].facetAddress;
            if (oldFacet == address(this)) revert CannotRemoveImmutableFunction(selector);
            if (oldFacet == _facet) continue; // same facet, no-op
            if (oldFacet != address(0)) {
                removeFunction(ds, oldFacet, selector);
            }
            ds.facetFunctionSelectors[_facet].functionSelectors.push(selector);
            ds.selectorToFacetAndPosition[selector] = FacetAddressAndPosition(_facet, selectorPosition);
            selectorPosition++;
        }
    }

    function removeFunctions(address _facet, bytes4[] memory _selectors) internal {
        if (_selectors.length == 0) revert NoSelectorsInFacet();
        if (_facet != address(0)) revert RemoveFacetAddressMustBeZero();
        DiamondStorage storage ds = diamondStorage();
        for (uint256 i; i < _selectors.length; i++) {
            bytes4 selector = _selectors[i];
            address oldFacet = ds.selectorToFacetAndPosition[selector].facetAddress;
            if (oldFacet == address(0)) revert SelectorNotFound(selector);
            if (oldFacet == address(this)) revert CannotRemoveImmutableFunction(selector);
            removeFunction(ds, oldFacet, selector);
            delete ds.selectorToFacetAndPosition[selector];
        }
    }

    function removeFunction(DiamondStorage storage ds, address _facet, bytes4 _selector) internal {
        uint256 selectorPosition = ds.selectorToFacetAndPosition[_selector].functionSelectorPosition;
        uint256 lastSelectorPosition = ds.facetFunctionSelectors[_facet].functionSelectors.length - 1;
        if (selectorPosition != lastSelectorPosition) {
            bytes4 lastSelector = ds.facetFunctionSelectors[_facet].functionSelectors[lastSelectorPosition];
            ds.facetFunctionSelectors[_facet].functionSelectors[selectorPosition] = lastSelector;
            ds.selectorToFacetAndPosition[lastSelector].functionSelectorPosition = uint96(selectorPosition);
        }
        ds.facetFunctionSelectors[_facet].functionSelectors.pop();
        if (lastSelectorPosition == 0) {
            uint256 lastFacetAddressPosition = ds.facetAddresses.length - 1;
            uint256 facetAddressPosition = ds.facetFunctionSelectors[_facet].facetAddressPosition;
            if (facetAddressPosition != lastFacetAddressPosition) {
                address lastFacetAddress = ds.facetAddresses[lastFacetAddressPosition];
                ds.facetAddresses[facetAddressPosition] = lastFacetAddress;
                ds.facetFunctionSelectors[lastFacetAddress].facetAddressPosition = facetAddressPosition;
            }
            ds.facetAddresses.pop();
            delete ds.facetFunctionSelectors[_facet].facetAddressPosition;
        }
    }

    function initializeDiamondCut(address _init, bytes memory _calldata) internal {
        if (_init == address(0)) return;
        (bool success, bytes memory error) = _init.delegatecall(_calldata);
        if (!success) {
            if (error.length > 0) {
                assembly { revert(add(error, 32), mload(error)) }
            } else {
                revert InitFailed(_init, _calldata);
            }
        }
    }
}
