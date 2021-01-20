
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "../../external/UniswapV2OracleLibrary.sol";
import "../../external/UniswapV2Library.sol";
import "../../external/Require.sol";
import "../../external/Decimal.sol";
import "../../Constants.sol";
import "./IHybridOracle.sol";
import "../GoldFeed.sol";
import "../../Utils.sol";

contract HybridOracleBase is IHybridOracle, GoldFeed {
    using Decimal for Decimal.D256;
    bytes32 private _file;
    IUniswapV2Pair internal _pair;
    AggregatorV3Interface internal _backingAssetPriceFeed;

    bool internal _initialized;
    uint256 internal _index;
    uint256 internal _cumulative;
    uint32 internal _timestamp;
    uint256 internal _reserve;
    uint256 internal _reserveMinimum;
    uint256 internal _decimalOffset;
    address internal _numerator;
    address internal _hybridOracle;

    bool lastRatioValid;
    Decimal.D256 lastEsgPerGoldViaBackingAsset;

    constructor (
        address pair,
        address numerator,
        address assetBackingUsdOracle,
        address goldOracle,
        bytes32 file,
        uint256 reserveMinimum,
        uint256 decimalOffset
    ) GoldFeed(goldOracle) public {
        _backingAssetPriceFeed = AggregatorV3Interface(assetBackingUsdOracle);
        _file = file;
        _decimalOffset = decimalOffset;
        _pair = IUniswapV2Pair(pair);
        _reserveMinimum = reserveMinimum;
        _numerator = numerator;
        lastRatioValid = false;
        lastEsgPerGoldViaBackingAsset = Decimal.one();
        _hybridOracle = Constants.getHybridOraclePoolAddress();
        setup();
    }

    function setHybridOracleAddress(address parentAddress) onlyDaoOrTreasury external {
        Require.that(parentAddress != address(0), _file, "Hybrid Oracle cannot be null");
        _hybridOracle = parentAddress;
    }

    function setup() private {
        (address token0, address token1) = (_pair.token0(), _pair.token1());
        _index = _numerator == token0 ? 0 : 1;
        Require.that(_index == 0 || _numerator == token1, _file, "Target numerator not found");
    }

    function capture() public onlyHybridOracle returns (Decimal.D256 memory, bool) {
        if (_initialized) {
            return updateOracle();
        } else {
            return initializeOracle();
        }
    }

    function backingAssetUsdPrice() public view returns (Decimal.D256 memory) {
        (uint80 roundID, int price, uint startedAt, uint timeStamp, uint80 answeredInRound) =
            _backingAssetPriceFeed.latestRoundData();

        uint256 adjustedPrice = Utils.normalizeToDecimals(uint(price), uint(_backingAssetPriceFeed.decimals()), 18);
        return Decimal.D256({value: adjustedPrice});
    }

    function initializeOracle() private returns (Decimal.D256 memory, bool) {
        IUniswapV2Pair pair = _pair;
        uint256 priceCumulative = _index == 0 ? pair.price0CumulativeLast() : pair.price1CumulativeLast();
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = pair.getReserves();

        if (reserve0 != 0 && reserve1 != 0 && blockTimestampLast != 0) {
            _cumulative = priceCumulative;
            _timestamp = blockTimestampLast;
            _initialized = true;
            _reserve = _index == 0 ? reserve1 : reserve0;
        }

        lastEsgPerGoldViaBackingAsset = Decimal.one();
        lastRatioValid = false;
        return lastCapture();
    }

    function updateOracle() private returns (Decimal.D256 memory, bool) {
        Decimal.D256 memory goldPerBackingAsset = updatePrice();
        uint256 previousReserve = updateReserve();
        bool valid = !backingAssetReserveTooLow(previousReserve);
        Decimal.D256 memory goldPriceInUsd = backingAssetUsdPrice().mul(goldPerBackingAsset);
        lastEsgPerGoldViaBackingAsset = goldPriceInUsd.div(goldPrice());
        lastRatioValid = valid;
        return lastCapture();
    }

    function backingAssetReserveTooLow(uint256 previousReserve) private returns (bool) {
        return previousReserve < _reserveMinimum || _reserve < _reserveMinimum;
    }

    function lastCapture() public view returns (Decimal.D256 memory, bool) {
        return (lastEsgPerGoldViaBackingAsset, lastRatioValid);
    }

    function updatePrice() private returns (Decimal.D256 memory) {
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) =
            UniswapV2OracleLibrary.currentCumulativePrices(address(_pair));

        uint32 timeElapsed = blockTimestamp - _timestamp; // overflow is desired
        uint256 priceCumulative = _index == 0 ? price0Cumulative : price1Cumulative;
        Decimal.D256 memory price = Decimal.ratio((priceCumulative - _cumulative) / timeElapsed, 2 ** 112);

        _timestamp = blockTimestamp;
        _cumulative = priceCumulative;

        return price.mul(10 ** _decimalOffset);
    }

    function updateReserve() private returns (uint256) {
        uint256 lastReserve = _reserve;
        (uint112 reserve0, uint112 reserve1,) = _pair.getReserves();
        _reserve = _index == 0 ? reserve1 : reserve0;
        return lastReserve;
    }

    function pair() external view returns (address) {
        return address(_pair);
    }

    function reserve() external view returns (uint256) {
        return _reserve;
    }

    function isInitialized() external view returns (bool) {
        return _initialized;
    }

    function getDaoAddress() internal view returns (address) {
        return Constants.getDaoAddress();
    }

    function getTreasuryAddress() internal view returns (address) {
        return Constants.getTreasuryAddress();
    }

    modifier onlyHybridOracle() {
        Require.that(_hybridOracle != address(0) && msg.sender == _hybridOracle, _file, "Not Hybrid Oracle");
        _;
    }

    modifier onlyDaoOrTreasury() {
        Require.that(msg.sender == getTreasuryAddress() || msg.sender == getDaoAddress(), _file, "Not Treasury or DAO");
        _;
    }
}
