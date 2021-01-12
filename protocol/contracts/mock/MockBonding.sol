
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "./MockState.sol";
import "../dao/Bonding.sol";
import "./MockComptroller.sol";

contract MockBonding is MockComptroller, Bonding {
    address private deployerAddress;
    uint256 private timestamp;

    constructor() MockComptroller(address(0)) public { }

    function setDeployerAddress(address deployer) external {
        deployerAddress = deployer;
    }

    function getDeployerAddress() public view returns (address) {
        return deployerAddress;
    }

    function burnDeployerStakeE(uint256 percent) external {
        super.burnDeployerStake(percent);
    }

    function setBlockTimestamp(uint256 time) external {
        timestamp = time;
    }

    function blockTimestamp() internal view returns (uint256) {
        return timestamp == 0 ? super.blockTimestamp() : timestamp;
    }

    function stepE() external {
        Bonding.step();
    }
}
