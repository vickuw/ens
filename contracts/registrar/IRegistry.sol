// SPDX-License-Identifier: NO LICENSE
pragma solidity ^0.8.17;

interface IRegistry {
    function checkRootDomainValidity(string memory rootDomainName) external view returns(bool);

    function setOwner(bytes32 tokenId, address owner) external;

}