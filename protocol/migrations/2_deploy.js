
const HybridOraclePool = artifacts.require("HybridOraclePool");

const DAI_ESG_HybridOracle = artifacts.require("DAI_ESG_HybridOracle");
const SXAU_ESG_HybridOracle = artifacts.require("SXAU_ESG_HybridOracle");
const WETH_ESG_HybridOracle = artifacts.require("WETH_ESG_HybridOracle");

const DAI_ESG_HybridPool = artifacts.require("DAI_ESG_HybridPool");
const SXAU_ESG_HybridPool = artifacts.require("SXAU_ESG_HybridPool");
const WETH_ESG_HybridPool = artifacts.require("WETH_ESG_HybridPool");

module.exports = function(deployer) {
  deployer.then(async() => {
    console.log(deployer.network);
    switch (deployer.network) {
      case 'development':
      case 'rinkeby':
      case 'ropsten':
      case 'mainnet':
      case 'mainnet-fork': {
        const hybridOraclePoolAddress = (await deployer.deploy(HybridOraclePool)).address

        const DAI_ESG_Oracle_Address = (await deployer.deploy(DAI_ESG_HybridOracle)).address
        const SXAU_ESG_Oracle_Address = (await deployer.deploy(SXAU_ESG_HybridOracle)).address
        const WETH_ESG_Oracle_Address = (await deployer.deploy(WETH_ESG_HybridOracle)).address

        const DAI_ESG_Pool_Address = (await deployer.deploy(DAI_ESG_HybridPool, DAI_ESG_Oracle_Address)).address
        const SXAU_ESG_Pool_Address = (await deployer.deploy(SXAU_ESG_HybridPool, SXAU_ESG_Oracle_Address)).address
        const WETH_ESG_Pool_Address = (await deployer.deploy(WETH_ESG_HybridPool, WETH_ESG_Oracle_Address)).address

        const log = [
          ` ==== Substitute these in to Constants.sol prior to deployment, otherwise the Implementation commit will not work ==== `,
          `                                                                                                                       `,
          `   Hybrid Oracle Pool Address:                                                                                         `,
          `       ${hybridOraclePoolAddress}                                                                                      `,
          `                                                                                                                       `,
          `   Oracle/Pool Pairs:                                                                                                  `,
          `       DAI/ESG   ~> oracle=${DAI_ESG_Oracle_Address}, pool=${DAI_ESG_Pool_Address}                                     `,
          `       SXAU/ESG  ~> oracle=${SXAU_ESG_Oracle_Address}, pool=${SXAU_ESG_Pool_Address}                                   `,
          `       WETH/ESG  ~> oracle=${WETH_ESG_Oracle_Address}, pool=${WETH_ESG_Pool_Address}                                   `,
          `                                                                                                                       `,
          ` ===================================================================================================================== `
        ]

        console.log(log.reduce((acc, n) => `${acc}\n${n}`))
        break;
      }
      default:
        throw("Unsupported network");
    }
  })
};
