
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "../oracle/feed/IHybridOracle.sol";

contract StubHybridOracle is IHybridOracle {
    Decimal.D256 _lastCapture;
    bool _lastValid;
    uint256 _backingAssetUsdPrice;
    bool public captureCalled;

    function capture() public returns (Decimal.D256 memory, bool) {
        captureCalled = true;
        return (_lastCapture, _lastValid);
    }

    function setCapture(uint256 newValue, bool newValid) external {
        _lastCapture = Decimal.D256({value: newValue});
        _lastValid = newValid;
    }

    function setBackingAssetUsdPrice(uint256 backingAssetUsdPrice) external {
        _backingAssetUsdPrice = backingAssetUsdPrice;
    }

    function backingAssetUsdPrice() external view returns (Decimal.D256 memory) {
        return Decimal.D256({value: _backingAssetUsdPrice});
    }

    function lastCapture() public view returns (Decimal.D256 memory, bool) {
        return (_lastCapture, _lastValid);
    }

    function pair() external view returns (address) { revert("Not Implemented"); }
    function setHybridOracleAddress(address parentAddress) external { revert("Not Implemented"); }
}
