
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "./MockState.sol";
import "../dao/Bonding.sol";
import "./MockComptroller.sol";

contract MockBonding is MockComptroller, Bonding {
    constructor() MockComptroller(address(0)) public { }

    function stepE() external {
        Bonding.step();
    }
}
