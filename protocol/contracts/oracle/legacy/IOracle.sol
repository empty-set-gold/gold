
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../../external/Decimal.sol";

contract IOracle {
    function setup() public;
    function capture() public returns (Decimal.D256 memory, bool);
    function pair() external view returns (address);
}
