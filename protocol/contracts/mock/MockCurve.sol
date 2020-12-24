
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../dao/Curve.sol";

contract MockCurve is Curve {
    constructor () public { }

    function calculateCouponsE(
        uint256 totalSupply,
        uint256 totalDebt,
        uint256 amount
    ) external pure returns (uint256) {
        return super.calculateCouponPremium(totalSupply, totalDebt, amount);
    }
}
