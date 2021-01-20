
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../../external/Decimal.sol";

contract IHybridOracle {
    function capture() public returns (Decimal.D256 memory, bool);
    function pair() external view returns (address);
    function backingAssetUsdPrice() external view returns (Decimal.D256 memory);
    function lastCapture() public view returns (Decimal.D256 memory, bool);
    function setHybridOracleAddress(address parentAddress) external;
}
