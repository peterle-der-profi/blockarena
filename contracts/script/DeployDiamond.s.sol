// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {Diamond} from "../src/diamond/Diamond.sol";
import {DiamondCutFacet} from "../src/diamond/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "../src/diamond/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "../src/diamond/OwnershipFacet.sol";
import {ArenaFacet} from "../src/facets/ArenaFacet.sol";
import {OracleFacet} from "../src/facets/OracleFacet.sol";
import {TournamentFacet} from "../src/facets/TournamentFacet.sol";
import {FeeFacet} from "../src/facets/FeeFacet.sol";
import {StreakFacet} from "../src/facets/StreakFacet.sol";
import {EmergencyFacet} from "../src/facets/EmergencyFacet.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/interfaces/IDiamondLoupe.sol";
import {IERC165} from "../src/interfaces/IERC165.sol";
import {LibDiamond} from "../src/libraries/LibDiamond.sol";

contract DeployDiamond is Script {
    function run() external {
        address owner = msg.sender;
        vm.startBroadcast();

        // 1. Deploy DiamondCutFacet
        DiamondCutFacet diamondCut = new DiamondCutFacet();

        // 2. Deploy Diamond
        Diamond diamond = new Diamond(owner, address(diamondCut));

        // 3. Deploy facets
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        ArenaFacet arenaFacet = new ArenaFacet();
        OracleFacet oracleFacet = new OracleFacet();
        TournamentFacet tournamentFacet = new TournamentFacet();
        FeeFacet feeFacet = new FeeFacet();
        StreakFacet streakFacet = new StreakFacet();
        EmergencyFacet emergencyFacet = new EmergencyFacet();

        // 4. Build cuts
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](8);

        // Loupe
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        cuts[0] = IDiamondCut.FacetCut(address(loupeFacet), IDiamondCut.FacetCutAction.Add, loupeSelectors);

        // Ownership
        bytes4[] memory ownerSelectors = new bytes4[](4);
        ownerSelectors[0] = OwnershipFacet.transferOwnership.selector;
        ownerSelectors[1] = OwnershipFacet.acceptOwnership.selector;
        ownerSelectors[2] = OwnershipFacet.owner.selector;
        ownerSelectors[3] = OwnershipFacet.pendingOwner.selector;
        cuts[1] = IDiamondCut.FacetCut(address(ownershipFacet), IDiamondCut.FacetCutAction.Add, ownerSelectors);

        // Arena
        bytes4[] memory arenaSelectors = new bytes4[](18);
        arenaSelectors[0] = ArenaFacet.createArena.selector;
        arenaSelectors[1] = ArenaFacet.joinArena.selector;
        arenaSelectors[2] = ArenaFacet.commitPrediction.selector;
        arenaSelectors[3] = ArenaFacet.revealPrediction.selector;
        arenaSelectors[4] = ArenaFacet.finalizeArena.selector;
        arenaSelectors[5] = ArenaFacet.resetArena.selector;
        arenaSelectors[6] = ArenaFacet.nextArenaId.selector;
        arenaSelectors[7] = ArenaFacet.getArena.selector;
        arenaSelectors[8] = ArenaFacet.arenaEpoch.selector;
        arenaSelectors[9] = ArenaFacet.getPlayerState.selector;
        arenaSelectors[10] = ArenaFacet.getPriceTape.selector;
        arenaSelectors[11] = ArenaFacet.getOracleState.selector;
        arenaSelectors[12] = ArenaFacet.godStreak.selector;
        arenaSelectors[13] = ArenaFacet.getEntryFee.selector;
        arenaSelectors[14] = ArenaFacet.getRakeBps.selector;
        arenaSelectors[15] = ArenaFacet.computeCommitHash.selector;
        arenaSelectors[16] = ArenaFacet.setMinWalletBalance.selector;
        arenaSelectors[17] = ArenaFacet.minWalletBalance.selector;
        cuts[2] = IDiamondCut.FacetCut(address(arenaFacet), IDiamondCut.FacetCutAction.Add, arenaSelectors);

        // Oracle
        bytes4[] memory oracleSelectors = new bytes4[](4);
        oracleSelectors[0] = OracleFacet.setOracle.selector;
        oracleSelectors[1] = OracleFacet.oracle.selector;
        oracleSelectors[2] = OracleFacet.recordTick.selector;
        oracleSelectors[3] = OracleFacet.recordTicks.selector;
        cuts[3] = IDiamondCut.FacetCut(address(oracleFacet), IDiamondCut.FacetCutAction.Add, oracleSelectors);

        // Tournament
        bytes4[] memory tournamentSelectors = new bytes4[](7);
        tournamentSelectors[0] = TournamentFacet.createTournament.selector;
        tournamentSelectors[1] = TournamentFacet.addArenaToTournament.selector;
        tournamentSelectors[2] = TournamentFacet.advanceTournamentRound.selector;
        tournamentSelectors[3] = TournamentFacet.finalizeTournament.selector;
        tournamentSelectors[4] = TournamentFacet.depositTournamentPot.selector;
        tournamentSelectors[5] = TournamentFacet.nextTournamentId.selector;
        tournamentSelectors[6] = TournamentFacet.getTournament.selector;
        cuts[4] = IDiamondCut.FacetCut(address(tournamentFacet), IDiamondCut.FacetCutAction.Add, tournamentSelectors);

        // Fee
        bytes4[] memory feeSelectors = new bytes4[](8);
        feeSelectors[0] = FeeFacet.setReferrer.selector;
        feeSelectors[1] = FeeFacet.withdrawReferralEarnings.selector;
        feeSelectors[2] = FeeFacet.withdrawTreasury.selector;
        feeSelectors[3] = FeeFacet.treasuryBalance.selector;
        feeSelectors[4] = FeeFacet.referrer.selector;
        feeSelectors[5] = FeeFacet.referrerBalance.selector;
        feeSelectors[6] = FeeFacet.setHighlightsNFT.selector;
        feeSelectors[7] = FeeFacet.highlightsNFT.selector;
        cuts[5] = IDiamondCut.FacetCut(address(feeFacet), IDiamondCut.FacetCutAction.Add, feeSelectors);

        // Streak
        bytes4[] memory streakSelectors = new bytes4[](1);
        streakSelectors[0] = StreakFacet.getGodStreak.selector;
        cuts[6] = IDiamondCut.FacetCut(address(streakFacet), IDiamondCut.FacetCutAction.Add, streakSelectors);

        // Emergency
        bytes4[] memory emergencySelectors = new bytes4[](4);
        emergencySelectors[0] = EmergencyFacet.pause.selector;
        emergencySelectors[1] = EmergencyFacet.unpause.selector;
        emergencySelectors[2] = EmergencyFacet.paused.selector;
        emergencySelectors[3] = EmergencyFacet.emergencyWithdraw.selector;
        cuts[7] = IDiamondCut.FacetCut(address(emergencyFacet), IDiamondCut.FacetCutAction.Add, emergencySelectors);

        // 5. Execute diamond cut
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), "");

        // 6. Register ERC165 interfaces
        // Done via init if needed

        vm.stopBroadcast();

        console.log("Diamond deployed at:", address(diamond));
        console.log("DiamondCutFacet:", address(diamondCut));
        console.log("DiamondLoupeFacet:", address(loupeFacet));
        console.log("OwnershipFacet:", address(ownershipFacet));
        console.log("ArenaFacet:", address(arenaFacet));
        console.log("OracleFacet:", address(oracleFacet));
        console.log("TournamentFacet:", address(tournamentFacet));
        console.log("FeeFacet:", address(feeFacet));
        console.log("StreakFacet:", address(streakFacet));
        console.log("EmergencyFacet:", address(emergencyFacet));
    }
}
