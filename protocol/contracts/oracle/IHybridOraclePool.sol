
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../external/Decimal.sol";

contract IHybridOraclePool {
    //OraclePool Management
    function addOraclePoolPair(address oracle, address pool) external returns (uint256);
    function removeOraclePoolPair(uint256 index) external;

    //Oracle Interactions
    function capture() public returns (Decimal.D256 memory, bool);
    function lastCapture() public view returns (Decimal.D256 memory, bool);
    function indexOfOracle(address oracle) public view returns (uint256);

    //Pool Interactions
    function distributeToPools(uint256 amount) public;
    function getPoolWeights() public returns (Decimal.D256[] memory);
    function indexOfPool(address pool) public view returns (uint256);
}
