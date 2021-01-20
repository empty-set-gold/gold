
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../oracle/legacy/Pool.sol";

contract LegacyMockPool is Pool {
    address private _sXAU;

    constructor(address sXAU, address gold, address univ2) Pool(gold, univ2) public {
        _sXAU = sXAU;
    }

    function set(address dao) external {
        _state.provider.dao = IDAO(dao);
    }

    function sXAU() public view returns (address) {
        return _sXAU;
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

    function getReserves(address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (reserveA, reserveB,) = IUniswapV2Pair(address(univ2())).getReserves();
    }
}
