
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../oracle/legacy/PoolSetters.sol";

contract MockPoolState is PoolSetters {
    address private _dao;
    address private _gold;

    function set(address dao, address gold) external {
        _dao = dao;
        _gold = gold;
    }

    function dao() public view returns (IDAO) {
        return IDAO(_dao);
    }

    function gold() public view returns (IGold) {
        return IGold(_gold);
    }

    /**
     * Account
     */

    function incrementBalanceOfBondedE(address account, uint256 amount) external {
        super.incrementBalanceOfBonded(account, amount);
    }

    function decrementBalanceOfBondedE(address account, uint256 amount, string calldata reason) external {
        super.decrementBalanceOfBonded(account, amount, reason);
    }

    function incrementBalanceOfStagedE(address account, uint256 amount) external {
        super.incrementBalanceOfStaged(account, amount);
    }

    function decrementBalanceOfStagedE(address account, uint256 amount, string calldata reason) external {
        super.decrementBalanceOfStaged(account, amount, reason);
    }

    function incrementBalanceOfClaimableE(address account, uint256 amount) external {
        super.incrementBalanceOfClaimable(account, amount);
    }

    function decrementBalanceOfClaimableE(address account, uint256 amount, string calldata reason) external {
        super.decrementBalanceOfClaimable(account, amount, reason);
    }

    function incrementBalanceOfPhantomE(address account, uint256 amount) external {
        super.incrementBalanceOfPhantom(account, amount);
    }

    function decrementBalanceOfPhantomE(address account, uint256 amount, string calldata reason) external {
        super.decrementBalanceOfPhantom(account, amount, reason);
    }

    function unfreezeE(address account, uint256 epoch) external {
        super.unfreeze(account, epoch);
    }
}
