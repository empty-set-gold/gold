
pragma solidity ^0.5.17;

import "../oracle/pool/HybridPoolBase.sol";
pragma experimental ABIEncoderV2;

contract MockHybridPool is HybridPoolBase {
    address _gold;
    uint256 _goldReserve;
    uint256 _backingAssetReserve;
    bool _mockLocalReserves;

    constructor(address gold, address univ2, address backingAssetOracle) HybridPoolBase(univ2, backingAssetOracle) public {
        _gold = gold;
    }

    function set(address dao) external {
        _state.provider.dao = IDAO(dao);
    }

    function dao() public view returns (IDAO) {
        return _state.provider.dao;
    }

    function setBonded(uint256 amount) external {
        _state.balance.bonded = amount;
    }

    function setStaged(uint256 amount) external {
        _state.balance.staged = amount;
    }

    function gold() public view returns (IGold) {
        return IGold(_gold);
    }

    function univ2() public view returns (IUniswapV2Pair) {
        return _state.provider.univ2;
    }

    function setReserves(uint goldReserve, uint assetReserve) external {
        _mockLocalReserves = true;
        _goldReserve = goldReserve;
        _backingAssetReserve = assetReserve;
    }

    function getReserves(address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        if(_mockLocalReserves) {
            (reserveA, reserveB) = (_goldReserve, _backingAssetReserve);
        } else {
            (reserveA, reserveB,) = univ2().getReserves();
        }
    }
}
