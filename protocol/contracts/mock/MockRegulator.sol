
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../dao/Regulator.sol";
import "../oracle/legacy/IOracle.sol";
import "./MockComptroller.sol";
import "./MockState.sol";

contract MockRegulator is MockComptroller, Regulator {
    constructor (address oracle, address pool, address hybridOracle) MockComptroller(pool, hybridOracle) public {
        _state.provider.oracle = IOracle(oracle);
        _hybridOracleState.hybridOracle = IHybridOraclePool(hybridOracle);
    }

    function stepE() external {
        super.step();
    }

    function bootstrappingAt(uint256 epoch) public view returns (bool) {
        return epoch <= 5;
    }

    function setHybridOracleEnabledE(bool enabled) external {
        setHybridOracleEnabled(enabled);
    }
}
