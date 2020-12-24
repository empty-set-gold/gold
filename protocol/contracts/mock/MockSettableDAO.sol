
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../oracle/IDAO.sol";

contract MockSettableDAO is IDAO {
    uint256 internal _epoch;

    function set(uint256 epoch) external {
        _epoch = epoch;
    }

    function epoch() external view returns (uint256) {
        return _epoch;
    }
}
