// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;
pragma experimental ABIEncoderV2;

import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import {ZapMedia} from './ZapMedia.sol';
import {ZapMarket} from './ZapMarket.sol';

contract MediaFactory is OwnableUpgradeable {
    event MediaDeployed(address indexed mediaContract);
    event ExternalTokenDeployed(address indexed extToken);

    ZapMarket zapMarket;

    function initialize(address _zapMarket) external initializer {
        zapMarket = ZapMarket(_zapMarket);
    }

    function deployMedia(
        string calldata name,
        string calldata symbol,
        address marketContractAddr,
        bool permissive,
        string calldata _collectionMetadata
    ) external returns (address) {
        ZapMedia zapMedia = new ZapMedia();
        zapMedia.initialize(
            name,
            symbol,
            marketContractAddr,
            permissive,
            _collectionMetadata
        );

        zapMedia.initTransferOwnership(payable(msg.sender));

        zapMarket.registerMedia(address(zapMedia));


        bytes memory name_b = bytes(name);
        bytes memory symbol_b = bytes(symbol);

        bytes32 name_b32;
        bytes32 symbol_b32;

        assembly {
            name_b32 := mload(add(name_b, 32))
            symbol_b32 := mload(add(symbol_b, 32))
        }

        zapMarket.configure(msg.sender, address(zapMedia), name_b32, symbol_b32,false);

        emit MediaDeployed(address(zapMedia));

        return address(zapMedia);
    }
    function configureExternalToken(
        string calldata name,
        string calldata symbol,
        address marketContractAddr,
        address tokenAddress,
        bool permissive,
        string calldata _collectionMetadata
    ) external returns (address) {
        // ZapMedia zapMedia = new ZapMedia();
        // zapMedia.initialize(
        //     name,
        //     symbol,
        //     marketContractAddr,
        //     permissive,
        //     _collectionMetadata
        // );

        // zapMedia.transferOwnership(payable(msg.sender));

        zapMarket.registerMedia(tokenAddress);


        bytes memory name_b = bytes(name);
        bytes memory symbol_b = bytes(symbol);

        bytes32 name_b32;
        bytes32 symbol_b32;

        assembly {
            name_b32 := mload(add(name_b, 32))
            symbol_b32 := mload(add(symbol_b, 32))
        }

        zapMarket.configure(msg.sender, tokenAddress, name_b32, symbol_b32, true);

        emit ExternalTokenDeployed(tokenAddress);

        // return address(zapMedia);
    }
}
