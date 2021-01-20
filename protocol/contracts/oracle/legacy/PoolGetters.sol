
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./PoolState.sol";
import "../../Constants.sol";

contract PoolGetters is PoolState {
    using SafeMath for uint256;

    /**
     * Global
     */

    function sXAU() public view returns (address) {
        return Constants.getSXAUAddress();
    }

    function dao() public view returns (IDAO) {
        return _state.provider.dao;
    }

    function gold() public view returns (IGold) {
        return _state.provider.gold;
    }

    function univ2() public view returns (IERC20) {
        return _state.provider.univ2;
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

    /**
     * Account
     */

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

    function statusOf(address account, uint256 epoch) public view returns (PoolAccount.Status) {
        return epoch >= _state.accounts[account].fluidUntil ?
        PoolAccount.Status.Frozen :
        PoolAccount.Status.Fluid;
    }
}
