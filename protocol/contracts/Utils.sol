
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";

library Utils {
    using SafeMath for uint;

    function normalizeToDecimals(uint price, uint decimals, uint target) internal view returns (uint256) {
        if(decimals > target) {
            return price.div(10 ** (decimals - target));
        } else if (decimals < target) {
            return price.mul(10 ** (target - decimals));
        } else {
            return price;
        }
    }
}
