
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "../oracle/IHybridOraclePool.sol";

contract StubHybridOraclePool is IHybridOraclePool {
    uint256 public distributedAmount;

    function distributeToPools(uint256 amount) public {
        distributedAmount = amount;
    }

    function addOraclePoolPair(address oracle, address pool) external returns (uint256) { revert("Not Implemented"); }
    function removeOraclePoolPair(uint256 index) external { revert("Not Implemented"); }
    function capture() public returns (Decimal.D256 memory, bool) { revert("Not Implemented"); }
    function lastCapture() public view returns (Decimal.D256 memory, bool) { revert("Not Implemented"); }
    function indexOfOracle(address oracle) public view returns (uint256) { revert("Not Implemented"); }
    function getPoolWeights() public returns (Decimal.D256[] memory) { revert("Not Implemented"); }
    function indexOfPool(address pool) public view returns (uint256) { revert("Not Implemented"); }
}
