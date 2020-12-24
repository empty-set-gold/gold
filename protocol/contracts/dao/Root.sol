
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/upgrades/contracts/upgradeability/UpgradeabilityProxy.sol";

contract Root is UpgradeabilityProxy {
    constructor (address implementation) UpgradeabilityProxy(
        implementation,
        abi.encodeWithSignature("initialize()")
    ) public { }
}
