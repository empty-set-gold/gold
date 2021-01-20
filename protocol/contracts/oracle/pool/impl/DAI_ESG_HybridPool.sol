
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../HybridPoolBase.sol";

contract DAI_ESG_HybridPool is HybridPoolBase {
    constructor(address oracle) HybridPoolBase(
        0xE514259deB1fb75bC97fc8dF6D8f472C665B9C4D,
        oracle
    ) public {}
}
