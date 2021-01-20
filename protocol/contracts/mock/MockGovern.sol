
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../dao/Govern.sol";
import "./MockUpgradeable.sol";
import "./MockComptroller.sol";

contract MockGovern is Govern, MockComptroller {
    uint256 internal _epochTime;

    constructor() MockComptroller(address(0), address(0)) public { }

    function initialize() public {
        revert("Should not call");
    }

    function upgradeToE(address newImplementation) external {
        super.upgradeTo(newImplementation);
    }

    function setEpochTime(uint256 epochTime) external {
        _epochTime = epochTime;
    }

    function epochTime() public view returns (uint256) {
        return _epochTime;
    }
}
