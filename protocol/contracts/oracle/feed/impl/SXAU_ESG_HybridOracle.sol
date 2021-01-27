
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../HybridOracleBase.sol";

contract SXAU_ESG_HybridOracle is HybridOracleBase {
    constructor() public HybridOracleBase(
        0x94926Da4C34C3a379426B51af154fcbF24c2026A, // sXAU/ESG Uni Pair
        0x5cf9242493bE1411b93d064CA2e468961BBb5924, // ESG
        0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6, // XAU/USD feed
        0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6, // XAU/USD feed, a little redundant here, but consistent
        "SXAU_ESG_Oracle",
        1e18
    ) {}
}
