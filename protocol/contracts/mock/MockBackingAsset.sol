
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract MockBackingAsset is ERC20Detailed, ERC20Burnable {
    uint8 _decimals;

    constructor(uint8 decimals) ERC20Detailed("sXAU", "Synth sXAU", decimals) public {
        _decimals = decimals;
    }

    function mint(address account, uint256 amount) external returns (bool) {
        _mint(account, amount);
        return true;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function setDecimals(uint8 newDecimals) external {
        _decimals = newDecimals;
    }
}
