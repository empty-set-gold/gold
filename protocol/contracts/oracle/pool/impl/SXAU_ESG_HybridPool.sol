
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../HybridPoolBase.sol";

contract SXAU_ESG_HybridPool is HybridPoolBase {
    constructor(address oracle) HybridPoolBase(
        0x94926Da4C34C3a379426B51af154fcbF24c2026A,
        oracle
    ) public {}
}
