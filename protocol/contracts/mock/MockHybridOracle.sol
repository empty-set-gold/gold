
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../external/Decimal.sol";
import "../oracle/feed/HybridOracleBase.sol";

contract MockHybridOracle is HybridOracleBase {
    Decimal.D256 private _latestPrice;
    bool private _latestValid;
    address _dao;
    address _treasuryAddress;

    constructor (
        address pair,
        address gold,
        address backingAssetOracle,
        address goldFeed,
        bytes32 errorLogPrefix,
        uint256 reserveMin
    ) HybridOracleBase(
        pair,
        gold,
        backingAssetOracle,
        goldFeed,
        errorLogPrefix,
        reserveMin
    ) public {
        _dao = msg.sender;
        _treasuryAddress = msg.sender;
    }

    function capture() public returns (Decimal.D256 memory, bool) {
        (_latestPrice, _latestValid) = super.capture();
        return (_latestPrice, _latestValid);
    }

    function cumulative() external view returns (uint256) {
        return _cumulative;
    }

    function timestamp() external view returns (uint256) {
        return _timestamp;
    }

    function reserve() external view returns (uint256) {
        return _reserve;
    }

    function setDaoAddress(address newDao) external {
        _dao = newDao;
    }

    function setTreasuryAddress(address newTreasury) external {
        _treasuryAddress = newTreasury;
    }

    function getDaoAddress() internal view returns (address) {
        return _dao;
    }

    function getTreasuryAddress() internal view returns (address) {
        return _treasuryAddress;
    }

    function latestPrice() external view returns (Decimal.D256 memory) {
        return _latestPrice;
    }

    function latestValid() external view returns (bool) {
        return _latestValid;
    }
}
