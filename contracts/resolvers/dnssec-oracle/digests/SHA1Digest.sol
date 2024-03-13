pragma solidity ^0.8.17;

import "./Digest.sol";
import "../BytesUtils.sol";
import "../SHA1.sol";

/**
 * @dev Implements the DNSSEC SHA1 digest.
 */
contract SHA1Digest is Digest {
    using BytesUtils for *;

    function verify(bytes calldata data, bytes calldata hash)
        external
        pure
        override
        returns (bool)
    {
        require(hash.length == 20, "Invalid sha1 hash length");
        bytes32 expected = hash.readBytes20(0);
        bytes20 computed = SHA1.sha1(data);
        return expected == computed;
    }
}
