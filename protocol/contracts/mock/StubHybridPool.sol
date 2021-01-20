
pragma solidity ^0.5.17;

import "../oracle/pool/IHybridPool.sol";

pragma experimental ABIEncoderV2;

contract StubHybridPool is IHybridPool {
    uint256 _usdValueBonded;
    function setUsdValueBonded(uint256 value) external {
        _usdValueBonded = value;
    }

    function usdValueBonded() public view returns (Decimal.D256 memory) {
        return Decimal.D256({value: _usdValueBonded});
    }
}
