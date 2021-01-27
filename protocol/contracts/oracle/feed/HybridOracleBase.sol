
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "../../external/UniswapV2OracleLibrary.sol";
import "../../external/Require.sol";
import "../../external/Decimal.sol";
import "../../Constants.sol";
import "./IHybridOracle.sol";
import "../../Utils.sol";

contract HybridOracleBase is IHybridOracle {
    using Decimal for Decimal.D256;
    bytes32 private _file;
    IUniswapV2Pair internal _pair;
    AggregatorV3Interface internal _backingAssetPriceFeed;
    AggregatorV3Interface internal _goldFeed;

    bool internal _initialized;
    uint256 internal _index;
    uint256 internal _cumulative;
    uint32 internal _timestamp;
    uint256 internal _reserve;
    uint256 internal _reserveMinimum;
    address internal _esg;
    address internal _hybridOraclePool;

    bool lastRatioValid;
    Decimal.D256 lastEsgPerGoldViaBackingAsset;

    constructor (
        address pair,
        address esg,
        address assetBackingUsdOracle,
        address goldOracle,
        bytes32 file,
        uint256 reserveMinimum
    ) public {
        _backingAssetPriceFeed = AggregatorV3Interface(assetBackingUsdOracle);
        _goldFeed = AggregatorV3Interface(goldOracle);
        _file = file;
        _pair = IUniswapV2Pair(pair);
        _reserveMinimum = reserveMinimum;
        _esg = esg;
        lastRatioValid = false;
        lastEsgPerGoldViaBackingAsset = Decimal.one();
        _hybridOraclePool = Constants.getHybridOraclePoolAddress();
        setup();
    }

    function setHybridOraclePoolAddress(address parentAddress) onlyDaoOrTreasury external {
        Require.that(parentAddress != address(0), _file, "Hybrid Oracle cannot be null");
        _hybridOraclePool = parentAddress;
    }

    function setup() private {
        (address token0, address token1) = (_pair.token0(), _pair.token1());
        _index = _esg == token0 ? 0 : 1;
        Require.that(_index == 0 || _esg == token1, _file, "ESG not found");
    }

    function capture() public onlyHybridOraclePool returns (Decimal.D256 memory, bool) {
        if (_initialized) {
            return updateOracle();
        } else {
            return initializeOracle();
        }
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

    function backingAssetUsdPrice() public view returns (Decimal.D256 memory) {
        (uint80 roundID, int price, uint startedAt, uint timeStamp, uint80 answeredInRound) =
            _backingAssetPriceFeed.latestRoundData();

        return Decimal.D256({value: Utils.normalizeToDecimals(uint(price), uint(_backingAssetPriceFeed.decimals()), 18)});
    }

    function goldPrice() public view returns (Decimal.D256 memory) {
        (uint80 roundID, int price, uint startedAt, uint timeStamp, uint80 answeredInRound) =
            _goldFeed.latestRoundData();

        return Decimal.D256({value: Utils.normalizeToDecimals(uint(price), uint(_goldFeed.decimals()), 18)});
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

        address backingAsset = _pair.token0() == _esg ? _pair.token1() : _pair.token0();
        return Decimal.D256({value: Utils.normalizeToDecimals(price.value, ERC20Detailed(backingAsset).decimals(), 18)});
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

    modifier onlyHybridOraclePool() {
        Require.that(_hybridOraclePool != address(0) && msg.sender == _hybridOraclePool, _file, "Not Hybrid Oracle");
        _;
    }

    modifier onlyDaoOrTreasury() {
        Require.that(msg.sender == getTreasuryAddress() || msg.sender == getDaoAddress(), _file, "Not Treasury or DAO");
        _;
    }
}
