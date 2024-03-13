// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface ISidPriceOracle {
    struct Price {
        uint256 base;
        uint256 premium;
    }

    function giftCardPriceInBNB(
        uint256[] memory ids,
        uint256[] memory amounts
    ) external view returns (Price calldata);

    function domainPriceInBNB(
        string calldata rootName,
        string calldata secondaryName,
        uint256 expires,
        uint256 duration
    ) external view returns (Price calldata);

    function domainPriceWithPointRedemptionInBNB(
        string calldata name,
        uint256 expires,
        uint256 duration,
        address owner
    ) external view returns (Price calldata);
}
