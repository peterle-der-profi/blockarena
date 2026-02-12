// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ArenaEngine} from "../src/ArenaEngine.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ArenaEngine engine = new ArenaEngine();
        console.log("ArenaEngine deployed to:", address(engine));

        vm.stopBroadcast();
    }
}
