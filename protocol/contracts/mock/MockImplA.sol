
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../dao/Upgradeable.sol";
import "../dao/Permission.sol";

contract MockImplA is Upgradeable, Permission {
    constructor () public { }

    event MockInitializedA();

    function initialize() public initializer {
        emit MockInitializedA();
    }

    function upgradeToE(address newImplementation) external {
        super.upgradeTo(newImplementation);
    }
}
