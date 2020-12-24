
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../dao/Upgradeable.sol";
import "../dao/Permission.sol";

contract MockImplB is Upgradeable, Permission {
    constructor () public { }

    event MockInitializedB();

    function initialize() public initializer {
        emit MockInitializedB();
    }

    function upgradeToE(address newImplementation) external {
        super.upgradeTo(newImplementation);
    }
}
