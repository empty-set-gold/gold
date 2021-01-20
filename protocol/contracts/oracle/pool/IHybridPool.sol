
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../../external/Decimal.sol";

contract IHybridPool {
    function usdValueBonded() public view returns (Decimal.D256 memory);
}
