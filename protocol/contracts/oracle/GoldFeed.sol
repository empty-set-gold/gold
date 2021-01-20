
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";
import "../external/Decimal.sol";

contract GoldFeed {
    using Decimal for Decimal.D256;
    using SafeMath for uint256;

    AggregatorV3Interface private _priceFeed;

    constructor(address goldOracle) public {
        _priceFeed = AggregatorV3Interface(goldOracle);
    }

    function goldPrice() public view returns (Decimal.D256 memory) {
        (uint80 roundID, int price, uint startedAt, uint timeStamp, uint80 answeredInRound) =
            _priceFeed.latestRoundData();

        return Decimal.D256({value: uint256(price).mul(10 ** (18 - uint256(_priceFeed.decimals())))});
    }
}
