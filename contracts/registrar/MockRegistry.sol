// SPDX-License-Identifier: NO LICENSE
pragma solidity ^0.8.17;

import "./IRegistry.sol";

contract MockRegistry is IRegistry{

    function checkRootDomainValidity(string memory rootDomainName) external view returns(bool) {
        return false;
    }

    function setOwner(bytes32 tokenId, address owner) external {

    }
}