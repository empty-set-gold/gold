
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../external/Require.sol";
import "../../Constants.sol";
import "../../external/UniswapV2Library.sol";
import "./PoolSetters.sol";
import "../../dao/IDAO.sol";

contract Pool is PoolSetters {
    using SafeMath for uint256;

    constructor(address gold, address univ2) public {
        _state.provider.dao = IDAO(msg.sender);
        _state.provider.gold = IGold(gold);
        _state.provider.univ2 = IERC20(univ2);
    }

    address private constant UNISWAP_FACTORY = address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);

    function addLiquidity(uint256 goldAmount) internal returns (uint256, uint256) {
        (address gold, address sXAU) = (address(_state.provider.gold), sXAU());
        (uint reserveA, uint reserveB) = getReserves(gold, sXAU);

        uint256 sXAUAmount = (reserveA == 0 && reserveB == 0) ?
            goldAmount : UniswapV2Library.quote(goldAmount, reserveA, reserveB);

        address pair = address(_state.provider.univ2);
        IERC20(gold).transfer(pair, goldAmount);
        IERC20(sXAU).transferFrom(msg.sender, pair, sXAUAmount);
        return (sXAUAmount, IUniswapV2Pair(pair).mint(address(this)));
    }

    // overridable for testing
    function getReserves(address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = UniswapV2Library.sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IUniswapV2Pair(UniswapV2Library.pairFor(UNISWAP_FACTORY, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    bytes32 private constant FILE = "Pool";

    event Deposit(address indexed account, uint256 value);
    event Withdraw(address indexed account, uint256 value);
    event Claim(address indexed account, uint256 value);
    event Bond(address indexed account, uint256 start, uint256 value);
    event Unbond(address indexed account, uint256 start, uint256 value, uint256 newClaimable);
    event Provide(address indexed account, uint256 value, uint256 lessSXAU, uint256 newUniv2);

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
        _state.provider.gold.transfer(msg.sender, value);
        decrementBalanceOfClaimable(msg.sender, value, "Pool: insufficient claimable balance");

        balanceCheck();

        emit Claim(msg.sender, value);
    }

    function unfreeze(address account) internal {
        super.unfreeze(account, _state.provider.dao.epoch());
    }

    function bond(uint256 value) external notPaused {
        unfreeze(msg.sender);

        uint256 totalRewardedWithPhantom = totalRewarded(_state.provider.gold).add(totalPhantom());
        uint256 newPhantom = totalBonded() == 0 ?
        totalRewarded(_state.provider.gold) == 0 ? Constants.getInitialStakeMultiple().mul(value) : 0 :
        totalRewardedWithPhantom.mul(value).div(totalBonded());

        incrementBalanceOfBonded(msg.sender, value);
        incrementBalanceOfPhantom(msg.sender, newPhantom);
        decrementBalanceOfStaged(msg.sender, value, "Pool: insufficient staged balance");

        balanceCheck();

        emit Bond(msg.sender, _state.provider.dao.epoch().add(1), value);
    }

    function unbond(uint256 value) external {
        unfreeze(msg.sender);

        uint256 balanceOfBonded = balanceOfBonded(msg.sender);
        Require.that(
            balanceOfBonded > 0,
            FILE,
            "insufficient bonded balance"
        );

        uint256 newClaimable = balanceOfRewarded(msg.sender, _state.provider.gold).mul(value).div(balanceOfBonded);
        uint256 lessPhantom = balanceOfPhantom(msg.sender).mul(value).div(balanceOfBonded);

        incrementBalanceOfStaged(msg.sender, value);
        incrementBalanceOfClaimable(msg.sender, newClaimable);
        decrementBalanceOfBonded(msg.sender, value, "Pool: insufficient bonded balance");
        decrementBalanceOfPhantom(msg.sender, lessPhantom, "Pool: insufficient phantom balance");

        balanceCheck();

        emit Unbond(msg.sender, _state.provider.dao.epoch().add(1), value, newClaimable);
    }

    function provide(uint256 value) external onlyFrozen(msg.sender) notPaused {
        Require.that(
            totalBonded() > 0,
            FILE,
            "insufficient total bonded"
        );

        Require.that(
            totalRewarded(_state.provider.gold) > 0,
            FILE,
            "insufficient total rewarded"
        );

        Require.that(
            balanceOfRewarded(msg.sender, _state.provider.gold) >= value,
            FILE,
            "insufficient rewarded balance"
        );

        (uint256 lessSXAU, uint256 newUniv2) = addLiquidity(value);

        uint256 totalRewardedWithPhantom = totalRewarded(_state.provider.gold).add(totalPhantom()).add(value);
        uint256 newPhantomFromBonded = totalRewardedWithPhantom.mul(newUniv2).div(totalBonded());

        incrementBalanceOfBonded(msg.sender, newUniv2);
        incrementBalanceOfPhantom(msg.sender, value.add(newPhantomFromBonded));


        balanceCheck();

        emit Provide(msg.sender, value, lessSXAU, newUniv2);
    }

    function emergencyWithdraw(address token, uint256 value) external onlyDao {
        IERC20(token).transfer(address(_state.provider.dao), value);
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
            statusOf(account, _state.provider.dao.epoch()) == PoolAccount.Status.Frozen,
            FILE,
            "Not frozen"
        );

        _;
    }

    modifier onlyDao() {
        Require.that(
            msg.sender == address(_state.provider.dao),
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
