
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./HybridPoolState.sol";
import "../../Constants.sol";
import "../../dao/IDAO.sol";
import "../../token/IGold.sol";
import "../../external/UniswapV2Library.sol";
import "../feed/IHybridOracle.sol";

contract HybridPoolGetters is HybridPoolState {
    using SafeMath for uint256;

    function dao() public view returns (IDAO) {
        return IDAO(Constants.getDaoAddress());
    }

    function gold() public view returns (IGold) {
        return IGold(Constants.getGoldAddress());
    }

    function univ2() public view returns (IUniswapV2Pair) {
        return _state.provider.univ2;
    }

    function backingAsset() public view returns (ERC20Detailed) {
        return univ2().token0() == address(gold()) ? ERC20Detailed(univ2().token1()) : ERC20Detailed(univ2().token0());
    }

    function oracle() public view returns (IHybridOracle) {
        return IHybridOracle(_state.provider.oracle);
    }

    function totalBonded() public view returns (uint256) {
        return _state.balance.bonded;
    }

    function totalStaged() public view returns (uint256) {
        return _state.balance.staged;
    }

    function totalClaimable() public view returns (uint256) {
        return _state.balance.claimable;
    }

    function totalPhantom() public view returns (uint256) {
        return _state.balance.phantom;
    }

    function totalRewarded(IGold gold) public view returns (uint256) {
        return gold.balanceOf(address(this)).sub(totalClaimable());
    }

    function paused() public view returns (bool) {
        return _state.paused;
    }

    function balanceOfStaged(address account) public view returns (uint256) {
        return _state.accounts[account].staged;
    }

    function balanceOfClaimable(address account) public view returns (uint256) {
        return _state.accounts[account].claimable;
    }

    function balanceOfBonded(address account) public view returns (uint256) {
        return _state.accounts[account].bonded;
    }

    function balanceOfPhantom(address account) public view returns (uint256) {
        return _state.accounts[account].phantom;
    }

    function balanceOfRewarded(address account, IGold gold) public view returns (uint256) {
        uint256 totalBonded = totalBonded();
        if (totalBonded == 0) {
            return 0;
        }

        uint256 totalRewardedWithPhantom = totalRewarded(gold).add(totalPhantom());
        uint256 balanceOfRewardedWithPhantom = totalRewardedWithPhantom
        .mul(balanceOfBonded(account))
        .div(totalBonded);

        uint256 balanceOfPhantom = balanceOfPhantom(account);
        if (balanceOfRewardedWithPhantom > balanceOfPhantom) {
            return balanceOfRewardedWithPhantom.sub(balanceOfPhantom);
        }
        return 0;
    }

    function statusOf(address account, uint256 epoch) public view returns (HybridPoolAccount.Status) {
        return epoch >= _state.accounts[account].fluidUntil ?
        HybridPoolAccount.Status.Frozen :
        HybridPoolAccount.Status.Fluid;
    }
}
