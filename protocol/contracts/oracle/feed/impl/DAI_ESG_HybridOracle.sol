
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../HybridOracleBase.sol";

contract DAI_ESG_HybridOracle is HybridOracleBase {
    constructor() public HybridOracleBase(
        0xE514259deB1fb75bC97fc8dF6D8f472C665B9C4D, // ESG/DAI Uni Pair
        0x5cf9242493bE1411b93d064CA2e468961BBb5924, // ESG
        0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9, // DAI/USD price feed
        0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6, // XAU/USD feed
        "DAI_ESG_Oracle",
        1e18
    ) {}
}
