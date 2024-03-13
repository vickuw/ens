// SPDX-License-Identifier: NO LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./IRegistrar.sol";
import "./IRegistry.sol";
import "../utils/ERC20Recoverable.sol";

error NameNotAvailable(string name);
error DurationTooShort(uint256 duration);

contract Registrar is
    Initializable,
    OwnableUpgradeable,
    ERC20Recoverable,
    UUPSUpgradeable,
    ERC721Upgradeable,
    IRegistrar
{
    // A map of expiry times
    mapping(uint256 => uint256) expiries;
    // The DID registry
    address public DID;

    string public baseURI;

    mapping(string => bool) domain2isProtected;

    mapping(uint256 => Domain) tokenId2domain;

    // A map of addresses that are authorised to register and renew names.
    mapping(address => bool) public controllers;
    uint256 public constant GRACE_PERIOD = 30 days;
    bytes4 private constant INTERFACE_META_ID =
        bytes4(keccak256("supportsInterface(bytes4)"));
    bytes4 private constant ERC721_ID =
        bytes4(
            keccak256("balanceOf(address)") ^
                keccak256("ownerOf(uint256)") ^
                keccak256("approve(address,uint256)") ^
                keccak256("getApproved(uint256)") ^
                keccak256("setApprovalForAll(address,bool)") ^
                keccak256("isApprovedForAll(address,address)") ^
                keccak256("transferFrom(address,address,uint256)") ^
                keccak256("safeTransferFrom(address,address,uint256)") ^
                keccak256("safeTransferFrom(address,address,uint256,bytes)")
        );
    bytes4 private constant RECLAIM_ID =
        bytes4(keccak256("reclaim(uint256,address)"));

    function _isApprovedOrOwner(
        address spender,
        uint256 tokenId
    ) internal view override returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner ||
            getApproved(tokenId) == spender ||
            isApprovedForAll(owner, spender));
    }

    function initialize(address _did) public initializer {
        DID = _did;
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ERC721_init("did", "did");
    }

    modifier onlyController() {
        require(controllers[msg.sender]);
        _;
    }

    function setProtectedDomain(
        string memory domain,
        bool isProtected
    ) external onlyOwner {
        domain2isProtected[domain] = isProtected;
    }

    function available(
        string memory rootDomain,
        string memory secondaryDomain
    ) external view returns (bool) {
        uint256 tokenId = calTokenId(rootDomain, secondaryDomain);
        require(!IRegistry(DID).checkRootDomainValidity(rootDomain));
        require(!domain2isProtected[rootDomain], "DOMAIN_IS_PROTECTED");
        require(expiries[tokenId] + GRACE_PERIOD < block.timestamp);
        return true;
    }

    function ownerOf(
        string memory rootDomain,
        string memory secondaryDomain
    ) public view returns (address) {
        uint256 tokenId = calTokenId(rootDomain, secondaryDomain);
        require(expiries[tokenId] > block.timestamp);
        return super.ownerOf(tokenId);
    }

    function addController(address controller) external override onlyOwner {
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }

    function removeController(address controller) external override onlyOwner {
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }

    function nameExpires(
        string memory rootDomain,
        string memory secondaryDomain
    ) public view override returns (uint256) {
        return expiries[calTokenId(rootDomain, secondaryDomain)];
    }

    function register(
        string memory rootDomainName,
        string memory secondaryDomainName,
        address owner,
        uint256 duration
    ) external returns (uint256) {
        return
            _register(
                rootDomainName,
                secondaryDomainName,
                owner,
                duration,
                true
            );
    }

    function registerOnly(
        string memory rootDomainName,
        string memory secondaryDomainName,
        address owner,
        uint256 duration
    ) external returns (uint256) {
        return
            _register(
                rootDomainName,
                secondaryDomainName,
                owner,
                duration,
                false
            );
    }

    function renew(
        uint256 tokenId,
        uint256 duration
    ) external onlyController returns (uint256) {
        require(expiries[tokenId] + GRACE_PERIOD >= block.timestamp); // Name must be registered here or in grace period
        require(
            expiries[tokenId] + duration + GRACE_PERIOD >
                duration + GRACE_PERIOD
        );

        expiries[tokenId] += duration;
        emit NameRenewed(tokenId, expiries[tokenId]);

        return expiries[tokenId];
    }

    function reclaim(uint256 tokenId, address owner) external {
        require(_isApprovedOrOwner(msg.sender, tokenId));
        IRegistry(DID).setOwner(bytes32(tokenId), owner);
    }

    function supportsInterface(
        bytes4 interfaceID
    )
        public
        pure
        override(IERC165Upgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return
            interfaceID == INTERFACE_META_ID ||
            interfaceID == ERC721_ID ||
            interfaceID == RECLAIM_ID;
    }

    function calTokenId(
        string memory rootDomainName,
        string memory secondaryDomainName
    ) public pure returns (uint256 tokenId) {
        bytes32 firstHash = keccak256(
            abi.encode(address(0), keccak256(bytes(rootDomainName)))
        );
        tokenId = uint256(
            keccak256(
                abi.encode(firstHash, keccak256(bytes(secondaryDomainName)))
            )
        );
    }

    function _register(
        string memory rootDomainName,
        string memory secondaryDomainName,
        address owner,
        uint256 duration,
        bool updateRegistry
    ) internal onlyController returns (uint256) {
        require(
            !domain2isProtected[rootDomainName],
            "ROOT_DOMAIN_IS_PROTECTED"
        );
        require(
            !IRegistry(DID).checkRootDomainValidity(rootDomainName),
            "INVALID_ROOT_DOMAIN"
        );

        uint256 tokenId = calTokenId(rootDomainName, secondaryDomainName);
        require(_available(tokenId), "TOKEN_ID_IS_UNAVAILABLE");

        require(
            block.timestamp + duration + GRACE_PERIOD >
                block.timestamp + GRACE_PERIOD
        );

        uint256 expiry = block.timestamp + duration;
        expiries[tokenId] = expiry;

        if (_exists(tokenId)) {
            // Name was previously owned, and expired
            _burn(tokenId);
        }
        _mint(owner, tokenId);
        tokenId2domain[tokenId].rootDomainName = rootDomainName;
        tokenId2domain[tokenId].secondaryDomainName = secondaryDomainName;

        if (updateRegistry) {
            IRegistry(DID).setOwner(bytes32(tokenId), owner);
        }

        emit NameRegistered(rootDomainName, secondaryDomainName, owner, expiry);

        return expiry;
    }

    function _available(uint256 id) internal view returns (bool) {
        // Not available if it's registered here or in its grace period.
        return expiries[id] + GRACE_PERIOD < block.timestamp;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseURL(string memory _uri) external onlyOwner {
        baseURI = _uri;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
