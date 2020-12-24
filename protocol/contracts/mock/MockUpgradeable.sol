
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../dao/Upgradeable.sol";
import "../dao/Permission.sol";

contract MockUpgradeable is Upgradeable, Permission {
    constructor () public { }

    function initialize() public {
        revert("Should not call");
    }

    function upgradeToE(address newImplementation) external {
        super.upgradeTo(newImplementation);
    }
}
