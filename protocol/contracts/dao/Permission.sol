
pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "./Setters.sol";
import "../external/Require.sol";

contract Permission is Setters {

    bytes32 private constant FILE = "Permission";

    // Can modify account state
    modifier onlyFrozenOrFluid(address account) {
        Require.that(
            statusOf(account) != Account.Status.Locked,
            FILE,
            "Not frozen or fluid"
        );

        _;
    }

    // Can participate in balance-dependant activities
    modifier onlyFrozenOrLocked(address account) {
        Require.that(
            statusOf(account) != Account.Status.Fluid,
            FILE,
            "Not frozen or locked"
        );

        _;
    }

    modifier initializer() {
        Require.that(
            !isInitialized(implementation()),
            FILE,
            "Already initialized"
        );

        initialized(implementation());

        _;
    }

    modifier checkDeployerVest(address account) {
        Require.that(
            account != getDeployerAddress() || deployerLockupEnded(),
            FILE,
            "Unlocked after 2021-06-01"
        );

        _;
    }

    modifier onlyTreasury() {
        Require.that(
            msg.sender == getTreasuryAddress(),
            FILE,
            "Only Treasury allowed"
        );

        _;
    }
}
