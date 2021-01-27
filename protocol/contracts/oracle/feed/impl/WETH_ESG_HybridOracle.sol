
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../HybridOracleBase.sol";

contract WETH_ESG_HybridOracle is HybridOracleBase {
    constructor() public HybridOracleBase(
        0x94c54d84CCd5F9CB8d19393F2797Ba6489E5cdBb, // weth/esg uni pair
        0x5cf9242493bE1411b93d064CA2e468961BBb5924, // ESG
        0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419, // ETH/USD feed
        0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6, // XAU/USD feed
        "WETH_ESG_Oracle",
        1e18
    ) {}
}
