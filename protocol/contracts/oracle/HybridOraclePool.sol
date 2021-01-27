
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../external/Require.sol";
import "../external/Decimal.sol";
import "../Constants.sol";
import "./IHybridOraclePool.sol";
import "../token/IGold.sol";
import "../oracle/feed/IHybridOracle.sol";
import "../oracle/pool/IHybridPool.sol";

contract HybridOraclePool is IHybridOraclePool {
    using Decimal for Decimal.D256;
    bytes32 private constant FILE = "HybridOraclePool";

    struct LiquidityPair {
        IHybridOracle oracle;
        IHybridPool pool;
    }

    struct Capture {
        Decimal.D256 price;
        bool valid;
    }

    Capture private _lastCapture;
    LiquidityPair[] public oraclePoolPairs;

    constructor() public {
        _lastCapture = Capture(Decimal.one(), false);
    }

    function getOraclePoolPairs() external view returns (LiquidityPair[] memory) {
        return oraclePoolPairs;
    }

    function capture() public onlyDao returns (Decimal.D256 memory, bool) {
        Capture[] memory captures = new Capture[](oraclePoolPairs.length);
        for(uint256 o = 0; o < oraclePoolPairs.length; o++) {
            (Decimal.D256 memory price, bool valid) = oraclePoolPairs[o].oracle.capture();
            captures[o] = Capture(price, valid);
        }

        // Important that we capture first and then use getPoolWeights(),
        // otherwise pool weights are determined based on previous epochs prices.
        Decimal.D256[] memory liquidityWeights = getPoolWeights();
        Decimal.D256 memory sumOfWeights = Decimal.zero();
        Decimal.D256 memory weightedAverage = Decimal.zero();

        for(uint256 c = 0; c < captures.length; c++) {
            if (captures[c].valid) {
                sumOfWeights = sumOfWeights.add(liquidityWeights[c]);
                weightedAverage = weightedAverage.add(captures[c].price.mul(liquidityWeights[c]));
            }
        }

        if(sumOfWeights.equals(Decimal.zero())) {
            _lastCapture = Capture(Decimal.one(), false);
            return lastCapture();
        } else {
            _lastCapture = Capture(weightedAverage.div(sumOfWeights), true);
            return lastCapture();
        }
    }

    function lastCapture() public view returns (Decimal.D256 memory, bool) {
        return (_lastCapture.price, _lastCapture.valid);
    }

    function addOraclePoolPair(address oracle, address pool) onlyDaoOrTreasury external returns (uint256) {
        Require.that(indexOfOracle(oracle) == uint256(-1), FILE, "This oracle already exists");
        Require.that(indexOfPool(pool) == uint256(-1), FILE, "This pool already exists");
        oraclePoolPairs.push(LiquidityPair(IHybridOracle(oracle), IHybridPool(pool)));
        return oraclePoolPairs.length;
    }

    function indexOfOracle(address oracle) public view returns (uint256) {
        for (uint256 i = 0; i < oraclePoolPairs.length; i++) {
            if(address(oraclePoolPairs[i].oracle) == oracle) {
                return i;
            }
        }

        return uint256(-1);
    }

    function indexOfPool(address pool) public view returns (uint256) {
        for (uint256 i = 0; i < oraclePoolPairs.length; i++) {
            if(address(oraclePoolPairs[i].pool) == pool) {
                return i;
            }
        }

        return uint256(-1);
    }

    function removeOraclePoolPair(uint256 index) onlyDaoOrTreasury external {
        Require.that(oraclePoolPairs.length > index, FILE, "This pair does not exist");
        uint256 end = oraclePoolPairs.length - 1;
        LiquidityPair memory toRemove = oraclePoolPairs[index];
        LiquidityPair memory toKeep = oraclePoolPairs[end];
        oraclePoolPairs[index] = toKeep;
        oraclePoolPairs[end] = toRemove;
        oraclePoolPairs.pop();
    }

    function distributeToPools(uint256 amount) public onlyDao {
        Decimal.D256[] memory poolWeights = getPoolWeights();
        for(uint w = 0; w < poolWeights.length; w++) {
            uint256 share = poolWeights[w].mul(amount).asUint256();
            IGold(getGoldAddress()).mint(address(oraclePoolPairs[w].pool), share);
        }
    }

    function getPoolWeights() public returns (Decimal.D256[] memory) {
        Decimal.D256 memory totalUsdLocked = Decimal.zero();

        Decimal.D256[] memory poolUsdValues = new Decimal.D256[](oraclePoolPairs.length);
        for (uint256 p = 0; p < oraclePoolPairs.length; p++) {
            Decimal.D256 memory usdValue = oraclePoolPairs[p].pool.usdValueBonded();
            totalUsdLocked = totalUsdLocked.add(usdValue);
            poolUsdValues[p] = usdValue;
        }

        Decimal.D256[] memory liquidityWeights = new Decimal.D256[](oraclePoolPairs.length);
        for (uint p = 0; p < oraclePoolPairs.length; p++) {
            Decimal.D256 memory usdValue = poolUsdValues[p];
            if(totalUsdLocked.equals(Decimal.zero())) {
                liquidityWeights[p] = Decimal.zero();
            } else {
                liquidityWeights[p] = usdValue.div(totalUsdLocked);
            }
        }

        return liquidityWeights;
    }

    function getDaoAddress() internal view returns (address) {
        return Constants.getDaoAddress();
    }

    function getTreasuryAddress() internal view returns (address) {
        return Constants.getTreasuryAddress();
    }

    function getGoldAddress() internal view returns (address) {
        return Constants.getGoldAddress();
    }

    modifier onlyDaoOrTreasury() {
        Require.that(msg.sender == getTreasuryAddress() || msg.sender == getDaoAddress(), FILE, "Not Treasury or DAO");
        _;
    }

    modifier onlyDao() {
        Require.that(msg.sender == getDaoAddress(), FILE, "Not DAO");
        _;
    }
}
