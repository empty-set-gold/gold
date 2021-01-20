pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "../../external/Require.sol";
import "../../Constants.sol";
import "../../dao/IDAO.sol";
import "../../external/UniswapV2Library.sol";
import "./HybridPoolSetters.sol";
import "./IHybridPool.sol";
import "../../external/Decimal.sol";
import "../../Utils.sol";

contract HybridPoolBase is IHybridPool, HybridPoolSetters {
    using SafeMath for uint256;
    using Decimal for Decimal.D256;
    bytes32 private constant FILE = "HybridPoolBase";
    address private constant UNISWAP_FACTORY = address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);

    event Deposit(address indexed account, uint256 value);
    event Withdraw(address indexed account, uint256 value);
    event Claim(address indexed account, uint256 value);
    event Bond(address indexed account, uint256 start, uint256 value);
    event Unbond(address indexed account, uint256 start, uint256 value, uint256 newClaimable);
    event Provide(address indexed account, uint256 value, uint256 lessBackingAsset, uint256 newUniv2);

    constructor(address univ2, address oracle) public {
        _state.provider.dao = IDAO(Constants.getDaoAddress());
        _state.provider.univ2 = IUniswapV2Pair(univ2);
        _state.provider.oracle = IHybridOracle(oracle);
    }

    function usdValueBonded() public view returns (Decimal.D256 memory) {
        (Decimal.D256 memory assetPerGold, bool valid) = oracle().lastCapture();
        if (!valid || univ2().totalSupply() == 0) {
            return Decimal.zero();
        } else {
            return valueOfLPTokensBonded(assetPerGold, oracle().backingAssetUsdPrice());
        }
    }

    function valueOfLPTokensBonded(Decimal.D256 memory assetPerGold, Decimal.D256 memory usdValuePerAsset) private view returns (Decimal.D256 memory) {
        (uint goldReserve, uint backingAssetReserve) = getReserves(address(gold()), address(backingAsset()));
        uint256 normalizedBackingAssetReserve = Utils.normalizeToDecimals(backingAssetReserve, backingAsset().decimals(), 18);

        Decimal.D256 memory numAsset = Decimal.D256({value : normalizedBackingAssetReserve});
        Decimal.D256 memory numGold = Decimal.D256({value : goldReserve});

        Decimal.D256 memory totalAssetUsdValue = usdValuePerAsset.mul(numAsset);
        Decimal.D256 memory totalGoldUsdValue = usdValuePerAsset.mul(assetPerGold).mul(numGold);

        Decimal.D256 memory totalUsdValue = totalGoldUsdValue.add(totalAssetUsdValue);

        uint256 percentBonded = totalBonded().mul(100).div(univ2().totalSupply());
        return totalUsdValue.mul(percentBonded).div(100);
    }


    function addLiquidity(uint256 goldAmount) internal returns (uint256, uint256) {
        (address gold, address backingAsset) = (address(gold()), address(backingAsset()));
        (uint reserveA, uint reserveB) = getReserves(gold, backingAsset);

        uint256 backingAssetAmount = (reserveA == 0 && reserveB == 0) ?
        goldAmount : UniswapV2Library.quote(goldAmount, reserveA, reserveB);

        address pair = address(_state.provider.univ2);
        IERC20(gold).transfer(pair, goldAmount);
        IERC20(backingAsset).transferFrom(msg.sender, pair, backingAssetAmount);
        return (backingAssetAmount, IUniswapV2Pair(pair).mint(address(this)));
    }

    function getReserves(address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = UniswapV2Library.sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IUniswapV2Pair(UniswapV2Library.pairFor(UNISWAP_FACTORY, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    function deposit(uint256 value) external onlyFrozen(msg.sender) notPaused {
        _state.provider.univ2.transferFrom(msg.sender, address(this), value);
        incrementBalanceOfStaged(msg.sender, value);

        balanceCheck();

        emit Deposit(msg.sender, value);
    }

    function withdraw(uint256 value) external onlyFrozen(msg.sender) {
        _state.provider.univ2.transfer(msg.sender, value);
        decrementBalanceOfStaged(msg.sender, value, "Pool: insufficient staged balance");

        balanceCheck();

        emit Withdraw(msg.sender, value);
    }

    function claim(uint256 value) external onlyFrozen(msg.sender) {
        gold().transfer(msg.sender, value);
        decrementBalanceOfClaimable(msg.sender, value, "Pool: insufficient claimable balance");

        balanceCheck();

        emit Claim(msg.sender, value);
    }

    function unfreeze(address account) internal {
        super.unfreeze(account, dao().epoch());
    }

    function bond(uint256 value) external notPaused {
        unfreeze(msg.sender);

        uint256 totalRewardedWithPhantom = totalRewarded(gold()).add(totalPhantom());
        uint256 newPhantom = totalBonded() == 0 ?
        totalRewarded(gold()) == 0 ? Constants.getInitialStakeMultiple().mul(value) : 0 :
        totalRewardedWithPhantom.mul(value).div(totalBonded());

        incrementBalanceOfBonded(msg.sender, value);
        incrementBalanceOfPhantom(msg.sender, newPhantom);
        decrementBalanceOfStaged(msg.sender, value, "Pool: insufficient staged balance");

        balanceCheck();

        emit Bond(msg.sender, dao().epoch().add(1), value);
    }

    function unbond(uint256 value) external {
        unfreeze(msg.sender);

        uint256 balanceOfBonded = balanceOfBonded(msg.sender);
        Require.that(
            balanceOfBonded > 0,
            FILE,
            "insufficient bonded balance"
        );

        uint256 newClaimable = balanceOfRewarded(msg.sender, gold()).mul(value).div(balanceOfBonded);
        uint256 lessPhantom = balanceOfPhantom(msg.sender).mul(value).div(balanceOfBonded);

        incrementBalanceOfStaged(msg.sender, value);
        incrementBalanceOfClaimable(msg.sender, newClaimable);
        decrementBalanceOfBonded(msg.sender, value, "Pool: insufficient bonded balance");
        decrementBalanceOfPhantom(msg.sender, lessPhantom, "Pool: insufficient phantom balance");

        balanceCheck();

        emit Unbond(msg.sender, dao().epoch().add(1), value, newClaimable);
    }

    function provide(uint256 value) external onlyFrozen(msg.sender) notPaused {
        Require.that(
            totalBonded() > 0,
            FILE,
            "insufficient total bonded"
        );

        Require.that(
            totalRewarded(gold()) > 0,
            FILE,
            "insufficient total rewarded"
        );

        Require.that(
            balanceOfRewarded(msg.sender, gold()) >= value,
            FILE,
            "insufficient rewarded balance"
        );

        (uint256 lessBackingAsset, uint256 newUniv2) = addLiquidity(value);

        uint256 totalRewardedWithPhantom = totalRewarded(gold()).add(totalPhantom()).add(value);
        uint256 newPhantomFromBonded = totalRewardedWithPhantom.mul(newUniv2).div(totalBonded());

        incrementBalanceOfBonded(msg.sender, newUniv2);
        incrementBalanceOfPhantom(msg.sender, value.add(newPhantomFromBonded));


        balanceCheck();

        emit Provide(msg.sender, value, lessBackingAsset, newUniv2);
    }

    function emergencyWithdraw(address token, uint256 value) external onlyDao {
        IERC20(token).transfer(address(dao()), value);
    }

    function emergencyPause() external onlyDao {
        pause();
    }

    function balanceCheck() private {
        Require.that(
            _state.provider.univ2.balanceOf(address(this)) >= totalStaged().add(totalBonded()),
            FILE,
            "Inconsistent UNI-V2 balances"
        );
    }

    modifier onlyFrozen(address account) {
        Require.that(
            statusOf(account, dao().epoch()) == HybridPoolAccount.Status.Frozen,
            FILE,
            "Not frozen"
        );

        _;
    }

    modifier onlyDao() {
        Require.that(
            msg.sender == address(dao()),
            FILE,
            "Not dao"
        );

        _;
    }

    modifier notPaused() {
        Require.that(
            !paused(),
            FILE,
            "Paused"
        );

        _;
    }
}
