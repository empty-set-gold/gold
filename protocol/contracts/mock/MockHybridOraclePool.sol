
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../oracle/HybridOraclePool.sol";

contract MockHybridOraclePool is HybridOraclePool {
    address _gold;
    address _dao;
    address _treasury;

    constructor(address gold, address dao, address treasury) public {
        _gold = gold;
        _dao = dao;
        _treasury = treasury;
    }

    function setDaoAddress(address newDao) external {
        _dao = newDao;
    }

    function setTreasuryAddress(address newTreasury) external {
        _treasury = newTreasury;
    }

    function getDaoAddress() internal view returns (address) {
        return _dao;
    }

    function getTreasuryAddress() internal view returns (address) {
        return _treasury;
    }

    function getGoldAddress() internal view returns (address) {
        return _gold;
    }
}
