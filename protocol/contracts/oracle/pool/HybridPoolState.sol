
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "../../external/UniswapV2Library.sol";
import "../feed/IHybridOracle.sol";
import "../../dao/IDAO.sol";
import "../../token/IGold.sol";

contract HybridPoolAccount {
    enum Status {
        Frozen,
        Fluid,
        Locked
    }

    struct State {
        uint256 staged;
        uint256 claimable;
        uint256 bonded;
        uint256 phantom;
        uint256 fluidUntil;
    }
}

contract HybridPoolStorage {
    struct Provider {
        IDAO dao;
        IHybridOracle oracle;
        IUniswapV2Pair univ2;
    }

    struct Balance {
        uint256 staged;
        uint256 claimable;
        uint256 bonded;
        uint256 phantom;
    }

    struct State {
        Balance balance;
        Provider provider;
        bool paused;

        mapping(address => HybridPoolAccount.State) accounts;
    }
}

contract HybridPoolState {
    HybridPoolStorage.State _state;
}
