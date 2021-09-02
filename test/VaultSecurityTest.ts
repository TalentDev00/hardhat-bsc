import { ethers } from 'hardhat';

import { solidity } from 'ethereum-waffle';

import chai from 'chai';

import { ZapTokenBSC } from '../typechain/ZapTokenBSC';

import { ZapTransfer } from '../typechain/ZapTransfer';

import { ZapLibrary } from '../typechain/ZapLibrary';

import { ZapDispute } from '../typechain/ZapDispute';

import { ZapStake } from '../typechain/ZapStake';

import { ZapMaster } from '../typechain/ZapMaster';

import { Zap } from '../typechain/Zap';

import { Vault } from "../typechain/Vault";

import { BigNumber, ContractFactory } from 'ethers';
import { collect } from 'underscore';
import { connect } from 'pm2';
import { sign } from 'crypto';

const { expect } = chai;

chai.use(solidity);

let zapTokenBsc: ZapTokenBSC;

let zapTransfer: ZapTransfer;

let zapLibrary: ZapLibrary;

let zapDispute: ZapDispute;

let zapStake: ZapStake;

let zapMaster: ZapMaster;

let zap: Zap;

let vault: Vault;

let signers: any;

let numVaultOwners: number;

let numAuthorizedUsers: number;

describe('Vault Security Test', () => {
    beforeEach(async () => {
        signers = await ethers.getSigners();

        const zapTokenFactory: ContractFactory = await ethers.getContractFactory(
            'ZapToken',
            signers[0]
        );

        zapTokenBsc = (await zapTokenFactory.deploy()) as ZapTokenBSC;
        await zapTokenBsc.deployed();

        const zapTransferFactory: ContractFactory = await ethers.getContractFactory(
            'ZapTransfer',
            signers[0]
        );

        zapTransfer = (await zapTransferFactory.deploy()) as ZapTransfer;
        await zapTransfer.deployed();

        const zapLibraryFactory: ContractFactory = await ethers.getContractFactory(
            'ZapLibrary',
            {
                libraries: {
                    ZapTransfer: zapTransfer.address
                },
                signer: signers[0]
            }
        );

        zapLibrary = (await zapLibraryFactory.deploy()) as ZapLibrary;
        await zapLibrary.deployed();

        const zapDisputeFactory: ContractFactory = await ethers.getContractFactory(
            'ZapDispute',
            {
                libraries: {
                    ZapTransfer: zapTransfer.address
                },
                signer: signers[0]
            }
        );

        zapDispute = (await zapDisputeFactory.deploy()) as ZapDispute;
        await zapDispute.deployed();

        const zapStakeFactory: ContractFactory = await ethers.getContractFactory(
            'ZapStake',
            {
                libraries: {
                    ZapTransfer: zapTransfer.address,
                    ZapDispute: zapDispute.address
                },
                signer: signers[0]
            }
        );

        zapStake = (await zapStakeFactory.deploy()) as ZapStake;
        await zapStake.deployed();

        const zapFactory: ContractFactory = await ethers.getContractFactory('Zap', {
            libraries: {
                ZapStake: zapStake.address,
                ZapDispute: zapDispute.address,
                ZapLibrary: zapLibrary.address
            },
            signer: signers[0]
        });

        zap = (await zapFactory.deploy(zapTokenBsc.address)) as Zap;
        await zap.deployed();

        const zapMasterFactory: ContractFactory = await ethers.getContractFactory(
            'ZapMaster',
            {
                libraries: {
                    ZapTransfer: zapTransfer.address,
                    ZapStake: zapStake.address
                },
                signer: signers[0]
            }
        );

        zapMaster = (await zapMasterFactory.deploy(
            zap.address,
            zapTokenBsc.address
        )) as ZapMaster;
        await zapMaster.deployed();

        const Vault: ContractFactory = await ethers.getContractFactory('Vault', { signer: signers[0] });
        vault = (await Vault.deploy(zapTokenBsc.address, zapMaster.address)) as Vault

        await vault.deployed();

        await zapMaster.functions.changeVaultContract(vault.address);


        for (var i = 1; i <= 5; i++) {
            // Allocates ZAP to signers 1 - 5
            await zapTokenBsc.allocate(signers[i].address, 600000);
        }

        numVaultOwners = signers.length / 2;
        numAuthorizedUsers = numVaultOwners;
    });

    it('Tests if the authority of a user is correct', async () => {
        let j: number = numAuthorizedUsers;
        for (let i = 0; i < numVaultOwners; i++) {
            await vault.connect(signers[i]).lockSmith(signers[i].address, signers[j].address);
            await vault.connect(signers[j]).deposit(signers[i].address, 1);
            expect(await vault.connect(signers[j]).hasAccess(signers[j].address, signers[i].address)).to.be.true;
            j++;
        }

        j = 0;
        for (let i = numAuthorizedUsers; i < signers.length; i++) {
            expect(await vault.connect(signers[j]).hasAccess(signers[j].address, signers[i].address)).to.be.false;
            await expect(vault.connect(signers[j]).withdraw(signers[i].address, 1)).to.be.reverted;
            j++;
            if (j == signers.length){
                break;
            }
        }

    });

    it('Tests if an authorised user can deposit/withdraw', async () => {
        let j: number = numAuthorizedUsers;
        for (let i = 0; i < numVaultOwners; i++) {
            await vault.connect(signers[i]).lockSmith(signers[i].address, signers[j].address);
            expect(await vault.connect(signers[j]).deposit(signers[i].address, 1)).to.be.ok;
            expect(await vault.userBalance(signers[i].address)).to.equal(1)
            j++;
        }

        j = 0
        for (let i = numAuthorizedUsers; i < signers.length; i++) {
            expect(await vault.connect(signers[i]).withdraw(signers[j].address, 1)).to.be.ok;
            expect(await vault.userBalance(signers[j].address)).to.equal(0);
            await expect(vault.connect(signers[i]).withdraw(signers[j], 1)).to.be.reverted;
            j++;
            if (j == signers.length){
                break;
            }
        }

    });
});
