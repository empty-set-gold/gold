
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../external/Decimal.sol";
import "../oracle/IOracle.sol";

contract MockSettableOracle is IOracle {
    Decimal.D256 internal _price;
    bool internal _valid;
    uint256 internal _lastReserve;
    uint256 internal _reserve;

    function set(uint256 numerator, uint256 denominator, bool valid) external {
        _price = Decimal.ratio(numerator, denominator);
        _valid = valid;
    }

    function setup() public { }

    function capture() public returns (Decimal.D256 memory, bool) {
        return (_price, _valid);
    }

    function pair() external view returns (address) { revert("Should not use"); }
}
