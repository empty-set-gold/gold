
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "../external/Decimal.sol";
import "../oracle/feed/HybridOracleBase.sol";

contract MockAggregatorV3Interface {
    uint8 _decimals;
    int256 _latestPrice;

    constructor(uint8 decimals, int256 initialPrice) public {
        _decimals = decimals;
        _latestPrice = initialPrice;
    }

    function setLatestPrice(int256 latestPrice) external {
        _latestPrice = latestPrice;
    }

    function setDecimals(uint8 decimals) external {
        _decimals = decimals;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function latestRoundData() external view returns (
        uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
    ) { return (0, _latestPrice, 0, 0, 0); }
}
