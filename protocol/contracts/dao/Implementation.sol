
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Market.sol";
import "./Regulator.sol";
import "./Bonding.sol";
import "./Govern.sol";
import "../Constants.sol";
import "../token/Gold.sol";

contract Implementation is State, Bonding, Market, Regulator, Govern {
    using SafeMath for uint256;

    event Advance(uint256 indexed epoch, uint256 block, uint256 timestamp);
    event Incentivization(address indexed account, uint256 amount);

    function initialize() initializer public {
        setHybridOracleEnabled(true);
        _hybridOracleState.hybridOracle = IHybridOraclePool(Constants.getHybridOraclePoolAddress());

        (address sXAU_Oracle, address sXAU_Pool) = Constants.get_SXAU_ESG_Addresses();
        (address wETH_Oracle, address wETH_Pool) = Constants.get_WETH_ESG_Addresses();
        (address DAI_Oracle, address DAI_Pool) = Constants.get_DAI_ESG_Addresses();

        _hybridOracleState.hybridOracle.addOraclePoolPair(sXAU_Oracle, sXAU_Pool);
        _hybridOracleState.hybridOracle.addOraclePoolPair(wETH_Oracle, wETH_Pool);
        _hybridOracleState.hybridOracle.addOraclePoolPair(DAI_Oracle, DAI_Pool);

        Gold(address(gold())).addMinter(Constants.getHybridOraclePoolAddress());
    }

    function toggleOracleImplementation() external onlyTreasury {
        setHybridOracleEnabled(!_hybridOracleState.isEnabled);
    }

    function advance() external {
        incentivize(msg.sender, Constants.getAdvanceIncentive());

        Bonding.step();
        Regulator.step();
        Market.step();

        emit Advance(epoch(), block.number, block.timestamp);
    }

    function incentivize(address account, uint256 amount) private {
        mintToAccount(account, amount);
        emit Incentivization(account, amount);
    }
}
