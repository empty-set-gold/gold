
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "./external/Decimal.sol";

library Constants {
    /* Chain */
    uint256 private constant CHAIN_ID = 1; // Mainnet

    /* Bootstrapping */
    uint256 private constant BOOTSTRAPPING_PERIOD = 56; // 14 days
    uint256 private constant BOOTSTRAPPING_PRICE = 11e17; // ESG price == 1.10 * sXAU

    /* Oracle */
    address private constant sXAU = address(0x261EfCdD24CeA98652B9700800a13DfBca4103fF);
    uint256 private constant ORACLE_RESERVE_MINIMUM = 1e18;

    /* Bonding */
    uint256 private constant INITIAL_STAKE_MULTIPLE = 1e6; // 100 ESG -> 100M ESGS

    /* Epoch */
    struct EpochStrategy {
        uint256 offset;
        uint256 start;
        uint256 period;
    }

    uint256 private constant EPOCH_START = 1609027200; // 2020-12-27T00:00:00+00:00
    uint256 private constant EPOCH_OFFSET = 0;
    uint256 private constant EPOCH_PERIOD = 21600; // 6 hours

    /* Governance */
    uint256 private constant GOVERNANCE_PERIOD = 9; // 9 epochs
    uint256 private constant GOVERNANCE_EXPIRATION = 2; // 2 + 1 epochs
    uint256 private constant GOVERNANCE_QUORUM = 20e16; // 20%
    uint256 private constant GOVERNANCE_PROPOSAL_THRESHOLD = 5e15; // 0.5%
    uint256 private constant GOVERNANCE_SUPER_MAJORITY = 66e16; // 66%
    uint256 private constant GOVERNANCE_EMERGENCY_DELAY = 6; // 6 epochs

    /* DAO */
    uint256 private constant ADVANCE_INCENTIVE = 1e17; // 0.1 ESG
    uint256 private constant DAO_EXIT_LOCKUP_EPOCHS = 20; // 5 days

    /* Pool */
    uint256 private constant POOL_EXIT_LOCKUP_EPOCHS = 8; // 2 days

    /* Market */
    uint256 private constant COUPON_EXPIRATION = 120; // 30 days
    uint256 private constant DEBT_RATIO_CAP = 35e16; // 35%

    /* Regulator */
    uint256 private constant SUPPLY_CHANGE_LIMIT = 1e17; // 10%
    uint256 private constant COUPON_SUPPLY_CHANGE_LIMIT = 6e16; // 6%
    uint256 private constant ORACLE_POOL_RATIO = 30; // 30%
    uint256 private constant TREASURY_RATIO = 250; // 2.5%
    address private constant TREASURY_ADDRESS = address(0xd62ca03796A3242aFc585566618Aa4c52f4E155D);

    /* Deployer account vesting */
    address private constant DEPLOYER_ADDRESS = address(0xddBA37Bb29E55eDd28f5fdaEfbe5D3dF0F60909C);
    uint256 private constant DEPLOYER_LOCKUP_END = 1622505600; // 2021-06-01T00:00:00+00:00

    address private constant DAO_ADDRESS = address(0xda4A90c4d06E2384148a2e67E44a504A8F555f54);
    address private constant GOLD_ADDRESS = address(0x5cf9242493bE1411b93d064CA2e468961BBb5924);

    /* Hybrid Oracles */
    // Aggregator
    address private constant HYBRID_ORACLE_POOL_ADDRESS = address(0x0);

    address private constant DAI_ESG_ORACLE_ADDRESS = address(0x0);
    address private constant DAI_ESG_POOL_ADDRESS = address(0x0);

    address private constant SXAU_ESG_ORACLE_ADDRESS = address(0x0);
    address private constant SXAU_ESG_POOL_ADDRESS = address(0x0);

    address private constant WETH_ESG_ORACLE_ADDRESS = address(0x0);
    address private constant WETH_ESG_POOL_ADDRESS = address(0x0);


    function getSXAUAddress() internal pure returns (address) {
        return sXAU;
    }

    function getOracleReserveMinimum() internal pure returns (uint256) {
        return ORACLE_RESERVE_MINIMUM;
    }

    function getCurrentEpochStrategy() internal pure returns (EpochStrategy memory) {
        return EpochStrategy({
            offset: EPOCH_OFFSET,
            start: EPOCH_START,
            period: EPOCH_PERIOD
        });
    }

    function getInitialStakeMultiple() internal pure returns (uint256) {
        return INITIAL_STAKE_MULTIPLE;
    }

    function getBootstrappingPeriod() internal pure returns (uint256) {
        return BOOTSTRAPPING_PERIOD;
    }

    function getBootstrappingPrice() internal pure returns (Decimal.D256 memory) {
        return Decimal.D256({value: BOOTSTRAPPING_PRICE});
    }

    function getGovernancePeriod() internal pure returns (uint256) {
        return GOVERNANCE_PERIOD;
    }

    function getGovernanceExpiration() internal pure returns (uint256) {
        return GOVERNANCE_EXPIRATION;
    }

    function getGovernanceQuorum() internal pure returns (Decimal.D256 memory) {
        return Decimal.D256({value: GOVERNANCE_QUORUM});
    }

    function getGovernanceProposalThreshold() internal pure returns (Decimal.D256 memory) {
        return Decimal.D256({value: GOVERNANCE_PROPOSAL_THRESHOLD});
    }

    function getGovernanceSuperMajority() internal pure returns (Decimal.D256 memory) {
        return Decimal.D256({value: GOVERNANCE_SUPER_MAJORITY});
    }

    function getGovernanceEmergencyDelay() internal pure returns (uint256) {
        return GOVERNANCE_EMERGENCY_DELAY;
    }

    function getAdvanceIncentive() internal pure returns (uint256) {
        return ADVANCE_INCENTIVE;
    }

    function getDAOExitLockupEpochs() internal pure returns (uint256) {
        return DAO_EXIT_LOCKUP_EPOCHS;
    }

    function getPoolExitLockupEpochs() internal pure returns (uint256) {
        return POOL_EXIT_LOCKUP_EPOCHS;
    }

    function getCouponExpiration() internal pure returns (uint256) {
        return COUPON_EXPIRATION;
    }

    function getDebtRatioCap() internal pure returns (Decimal.D256 memory) {
        return Decimal.D256({value: DEBT_RATIO_CAP});
    }

    function getSupplyChangeLimit() internal pure returns (Decimal.D256 memory) {
        return Decimal.D256({value: SUPPLY_CHANGE_LIMIT});
    }

    function getCouponSupplyChangeLimit() internal pure returns (Decimal.D256 memory) {
        return Decimal.D256({value: COUPON_SUPPLY_CHANGE_LIMIT});
    }

    function getOraclePoolRatio() internal pure returns (uint256) {
        return ORACLE_POOL_RATIO;
    }

    function getTreasuryRatio() internal pure returns (uint256) {
        return TREASURY_RATIO;
    }

    function getChainId() internal pure returns (uint256) {
        return CHAIN_ID;
    }

    function getTreasuryAddress() internal pure returns (address) {
        return TREASURY_ADDRESS;
    }

    function getDeployerAddress() internal pure returns (address) {
        return DEPLOYER_ADDRESS;
    }

    function getDeployerLockupEnd() internal pure returns (uint256) {
        return DEPLOYER_LOCKUP_END;
    }

    function getDaoAddress() internal pure returns (address) {
        return DAO_ADDRESS;
    }

    function getGoldAddress() internal pure returns (address) {
        return GOLD_ADDRESS;
    }

    function getHybridOraclePoolAddress() internal pure returns (address) {
        return HYBRID_ORACLE_POOL_ADDRESS;
    }

    function get_SXAU_ESG_Addresses() internal pure returns (address, address) {
        return (SXAU_ESG_ORACLE_ADDRESS, SXAU_ESG_POOL_ADDRESS);
    }

    function get_WETH_ESG_Addresses() internal pure returns (address, address) {
        return (WETH_ESG_ORACLE_ADDRESS, WETH_ESG_POOL_ADDRESS);
    }

    function get_DAI_ESG_Addresses() internal pure returns (address, address) {
        return (DAI_ESG_ORACLE_ADDRESS, DAI_ESG_POOL_ADDRESS);
    }
}
