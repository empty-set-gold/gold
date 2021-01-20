
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../HybridPoolBase.sol";

contract WETH_ESG_HybridPool is HybridPoolBase {
    constructor(address oracle) HybridPoolBase(
        0x94c54d84CCd5F9CB8d19393F2797Ba6489E5cdBb,
        oracle
    ) public {}
}
