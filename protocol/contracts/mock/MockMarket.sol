
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../dao/Market.sol";
import "./MockState.sol";
import "./MockComptroller.sol";

contract MockMarket is MockState, MockComptroller, Market {
    constructor(address pool) MockComptroller(pool) public { }

    function stepE() external {
        Market.step();
    }
}
