pragma solidity ^0.8.17;

import "../registry/DID.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract DefaultReverseResolver is Initializable ,OwnableUpgradeable{
    // namehash('addr.reverse')
    bytes32 constant ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

    DID public did;
    mapping (bytes32 => string) public name;

  
    modifier onlyNodeOwner(bytes32 node) {
        require(msg.sender == did.getOwner(node));
        _;
    }

    
     function initialize(DID didAddr) public initializer{
        did = didAddr;
         __Ownable_init();
    }
    

    function setName(bytes32 node, string memory _name) public onlyNodeOwner(node) {
        name[node] = _name;
    }
}
