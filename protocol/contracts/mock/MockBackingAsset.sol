
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract MockBackingAsset is ERC20Detailed, ERC20Burnable {
    constructor() ERC20Detailed("sXAU", "Synth sXAU", 18) public { }

    function mint(address account, uint256 amount) external returns (bool) {
        _mint(account, amount);
        return true;
    }
}
