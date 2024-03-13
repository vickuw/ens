import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Wallet } from "ethers";
import { randomHex } from "../utils/encoding";
import hre from "hardhat";
import crypto from "crypto";

import {
  generateMessageHash,
  generateWhitelistMessage,
  nonceGenerator,
} from "../utils/whitelistProcess";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { faucet } from "../utils/faucet";
import { zeroBytes32 } from "../utils/constants";
import { deployContracts } from "./fixtures/deployContracts";

import {
  DIDRegisterControllerV1,
  DIDRegistry,
  DefaultReverseResolver,
  DidPriceOracle,
  MaticUsdPriceOracle,
  PublicResolver,
  ReferralHub,
  Registrar,
  ReverseRegistrar,
  DIDRegisterControllerV2
} from "../typechain-types";
import {
  getBytesTokenId,
  getTokenId,
  parseTransEvent,
} from "../utils/register";
import { Resolver } from "@ethersproject/providers";

describe("Register controller test", async function () {
  const chainId = hre.network.config.chainId;
  const { provider } = ethers;

  var Registry: DIDRegistry;
  let registryOwner: Wallet;
  let Registrar: Registrar;
  let registrarOwner: Wallet;
  let PublicResolver: PublicResolver;
  let resolverOwner: Wallet;
  let DefaultReverseResolver: DefaultReverseResolver;
  let reverseResolverOwner: Wallet;
  let ReverseRegistrar: ReverseRegistrar;
  let reverseRegistrarOwner: Wallet;
  let PriceOracle: DidPriceOracle;
  let priceOracleOwner: Wallet;
  let ReferralHub: ReferralHub;
  let referralHubOwner: Wallet;
  // let RegisterController: DIDRegisterControllerV1;
  let RegisterController: DIDRegisterControllerV2;
  let registerControllerOwner: Wallet;

  let freeMinter: Wallet;
  let signerChecker: Wallet;
  let register_1: Wallet;
  let register_2: Wallet;
  let account_1: Wallet;
  

  const RegistrarEventHash = {
    ControllerAdded:
      "0x0a8bb31534c0ed46f380cb867bd5c803a189ced9a764e30b3a4991a9901d7474",
    ControllerRemoved:
      "0x33d83959be2573f5453b12eb9d43b3499bc57d96bd2f067ba44803c859e81113",
    NameRegistered:
      "0x3b0bee99c00308f93ddbdda596f2aebcc9ad1595670808407e7ca83910a744b5",
    NameRenewed:
      "0x9b87a00e30f1ac65d898f070f8a3488fe60517182d0a2098e1b4b93a54aa9bd6",
    OwnershipTransferred:
      "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0",
  };

  before(async () => {
    // deploy contract

    ({
      Registry,
      registryOwner,
      Registrar,
      registrarOwner,
      PublicResolver,
      resolverOwner,
      DefaultReverseResolver,
      reverseResolverOwner,
      ReverseRegistrar,
      reverseRegistrarOwner,
      PriceOracle,
      priceOracleOwner,
      ReferralHub,
      referralHubOwner,
      RegisterController,
      registerControllerOwner,
    } = await deployContracts());

    freeMinter = new ethers.Wallet(randomHex(32), provider);
    signerChecker = new ethers.Wallet(randomHex(32), provider);
    register_1 = new ethers.Wallet(randomHex(32), provider);
    register_2 = new ethers.Wallet(randomHex(32), provider);
    account_1 = new ethers.Wallet(randomHex(32), provider);
    await faucet(freeMinter.address, provider);
    await faucet(register_1.address, provider);
    await faucet(register_2.address, provider);

    // set authority
    await Registry.connect(registryOwner).addOwnerController(Registrar.address);
    await Registrar.connect(registrarOwner).setProtectedDomain("reverse", true);
    await Registrar.connect(registrarOwner).addController(
      RegisterController.address
    );
    await RegisterController.connect(registerControllerOwner).setSignChecker(signerChecker.address);
    await ReferralHub.connect(referralHubOwner).addController(
      RegisterController.address
    );

    // set default resolver
    await Registry.connect(registryOwner).setResolver(PublicResolver.address);
  });

  describe("register related", function () {
    it("commit", async function () {
      // generate commitment
      const secret = "0x" + crypto.randomBytes(32).toString("hex");

      const commitment = await RegisterController.makeCommitmentWithConfig(
        "do",
        "hello",
        register_1.address,
        secret,
        register_1.address
      );
      await RegisterController.commit(commitment);

      await expect(
        await RegisterController.commitments(commitment)
      ).to.not.equal(0);
    });

    describe("register", async function () {
      const rootName = "did";
      const secondaryName = "hello1";
      let trans: any;

      this.beforeAll(async () => {
        // generate commitment
        const secret = "0x" + crypto.randomBytes(32).toString("hex");
        const commitment = await RegisterController.makeCommitment(
          rootName,
          secondaryName,
          register_1.address,
          secret
        );

        await RegisterController.commit(commitment);

        await new Promise((r) => setTimeout(r, 10));

        const price = await RegisterController.rentPrice(
          rootName,
          secondaryName,
          86400 * 365
        );

        trans = await RegisterController.register(
          rootName,
          secondaryName,
          register_1.address,
          86400 * 365,
          secret,
          {
            value: price.base.add(price.premium).toBigInt().toString(),
          }
        );
      });

      it("domain ownership verification", async () => {
        const owner = await Registrar["ownerOf(string,string)"](
          rootName,
          secondaryName
        );
        expect(owner).to.equal(register_1.address);
      });

      it("register event", async () => {
        const { exist, logArgs } = (await parseTransEvent(
          trans,
          RegistrarEventHash.NameRegistered,
          Registrar,
          [
            "event NameRegistered(string rootDomainName, string secondaryDomainName, address indexed owner, uint256 expires)",
          ]
        )) as any;

        expect(exist).to.equal(true);
        expect(logArgs[0]).to.equal(rootName);
        expect(logArgs[1]).to.equal(secondaryName);
        expect(logArgs[2]).to.equal(register_1.address);
      });
    });

    describe("registerWithConfig", async function () {
      const rootName = "did";
      const secondaryName = "hello2";

      this.beforeAll(async () => {
        // generate commitment
        const secret = "0x" + crypto.randomBytes(32).toString("hex");
        const commitment = await RegisterController.makeCommitmentWithConfig(
          rootName,
          secondaryName,
          register_1.address,
          secret,
          register_1.address
        );

        await RegisterController.commit(commitment);

        await new Promise((r) => setTimeout(r, 10));

        const price = await RegisterController.rentPrice(
          rootName,
          secondaryName,
          86400 * 365
        );

        await RegisterController.registerWithConfig(
          rootName,
          secondaryName,
          register_1.address,
          86400 * 365,
          secret,
          register_1.address,
          zeroBytes32,
          {
            value: price.base.add(price.premium).toBigInt().toString(),
          }
        );
      });

      it("domain ownership verification", async () => {
        const owner = await Registrar["ownerOf(string,string)"](
          rootName,
          secondaryName
        );
        expect(owner).to.equal(register_1.address);
      });

      it("resovler addr has been set to be registry's", async () => {
        const owner = await PublicResolver["addr(bytes32)"](
          getBytesTokenId(rootName, secondaryName)
        );
        expect(owner).to.equal(register_1.address);
      });
    });
    describe("registerWithConfigSetAddrToOthers", async function () {
      const rootName = "did";
      const secondaryName = "hello3";

      this.beforeAll(async () => {
        // generate commitment
        const secret = "0x" + crypto.randomBytes(32).toString("hex");
        const commitment = await RegisterController.makeCommitmentWithConfig(
          rootName,
          secondaryName,
          register_1.address,
          secret,
          account_1.address
        );

        await RegisterController.commit(commitment);

        await new Promise((r) => setTimeout(r, 10));

        const price = await RegisterController.rentPrice(
          rootName,
          secondaryName,
          86400 * 365
        );

        await RegisterController.registerWithConfig(
          rootName,
          secondaryName,
          register_1.address,
          86400 * 365,
          secret,
          account_1.address,
          zeroBytes32,
          {
            value: price.base.add(price.premium).toBigInt().toString(),
          }
        );
      });

      it("domain ownership verification", async () => {
        const owner = await Registrar["ownerOf(string,string)"](
          rootName,
          secondaryName
        );
        expect(owner).to.equal(register_1.address);
      });

      it("resovler addr has been set to be registry's", async () => {
        const owner = await PublicResolver["addr(bytes32)"](
          getBytesTokenId(rootName, secondaryName)
        );
        expect(owner).to.equal(account_1.address);
      });
    });

    describe("registerWithConfigWithDifferentOwner", async function () {
      const rootName = "did";
      const secondaryName = "hello4";

      this.beforeAll(async () => {
        // generate commitment
        const secret = "0x" + crypto.randomBytes(32).toString("hex");
        const commitment = await RegisterController.makeCommitmentWithConfig(
          rootName,
          secondaryName,
          account_1.address,
          secret,
          account_1.address
        );

        await RegisterController.commit(commitment);

        await new Promise((r) => setTimeout(r, 10));

        const price = await RegisterController.rentPrice(
          rootName,
          secondaryName,
          86400 * 365
        );

        await RegisterController.registerWithConfig(
          rootName,
          secondaryName,
          account_1.address,
          86400 * 365,
          secret,
          account_1.address,
          zeroBytes32,
          {
            value: price.base.add(price.premium).toBigInt().toString(),
          }
        );
      });

      it("domain ownership verification", async () => {
        const owner = await Registrar["ownerOf(string,string)"](
          rootName,
          secondaryName
        );
        expect(owner).to.equal(account_1.address);
      });

      it("resovler addr has been set to be registry's", async () => {
        const owner = await PublicResolver["addr(bytes32)"](
          getBytesTokenId(rootName, secondaryName)
        );
        expect(owner).to.equal(account_1.address);
      });
    });

    describe("registerWithReferral", async function () {
      const rootName = "did";
      const secondaryName = "hello5";
      const referralNodeHash = getBytesTokenId("did", "hello1");
      let price: any;

      let oldInviterReferralCount: any;
      let oldInviterReferralBalance: any;

      this.beforeAll(async () => {
        oldInviterReferralCount = await ReferralHub.referralCount(
          referralNodeHash
        );
        oldInviterReferralBalance = await ReferralHub.referralBalance(
          register_1.address
        );

        // generate commitment
        const secret = "0x" + crypto.randomBytes(32).toString("hex");
        const commitment = await RegisterController.makeCommitmentWithConfig(
          rootName,
          secondaryName,
          register_2.address,
          secret,
          register_2.address
        );

        await RegisterController.connect(register_2).commit(commitment);

        await new Promise((r) => setTimeout(r, 10));

        price = await RegisterController.rentPrice(
          rootName,
          secondaryName,
          86400 * 365
        );

        await PublicResolver.connect(register_1).setCommissionAcceptAddress(
          referralNodeHash,
          register_1.address
        );

        await RegisterController.connect(register_2).registerWithConfig(
          rootName,
          secondaryName,
          register_2.address,
          86400 * 365,
          secret,
          register_2.address,
          referralNodeHash,
          {
            value: price.base.add(price.premium).toBigInt().toString(),
          }
        );
      });

      it("inviter referralHub balance check", async () => {
        const neWInviterReferralBalance = await ReferralHub.referralBalance(
          register_1.address
        );

        const referralFee = await ReferralHub.getReferralCommisionFee(
          price.base.add(price.premium.toNumber()),
          referralNodeHash
        );

        expect(
          neWInviterReferralBalance
            .sub(oldInviterReferralBalance)
            .toBigInt()
            .toString()
        ).to.equal(referralFee[0].toString());
      });

      it("inviter referralCount", async () => {
        const newInviterReferralCount = await ReferralHub.referralCount(
          referralNodeHash
        );
        expect(
          newInviterReferralCount
            .sub(oldInviterReferralCount)
            .toBigInt()
            .toString()
        ).to.equal("1");
      });
    });

    describe("registerWithReferralPartner", async function () {
      const rootName = "did";
      const secondaryName = "hello6";
      const referralNodeHash = getBytesTokenId("did", "hello1");
      const partnerReferalRate = 50;
      let price: any;

      let oldInviterReferralCount: any;
      let oldInviterReferralBalance: any;

      this.beforeAll(async () => {
        oldInviterReferralCount = await ReferralHub.referralCount(
          referralNodeHash
        );
        oldInviterReferralBalance = await ReferralHub.referralBalance(
          register_1.address
        );

        await ReferralHub.setPartnerComissionChart(
          referralNodeHash,
          0,
          partnerReferalRate,
          0
        );

        // generate commitment
        const secret = "0x" + crypto.randomBytes(32).toString("hex");
        const commitment = await RegisterController.makeCommitmentWithConfig(
          rootName,
          secondaryName,
          register_2.address,
          secret,
          register_2.address
        );

        await RegisterController.connect(register_2).commit(commitment);

        await new Promise((r) => setTimeout(r, 10));

        price = await RegisterController.rentPrice(
          rootName,
          secondaryName,
          86400 * 365
        );

        await PublicResolver.connect(register_1).setCommissionAcceptAddress(
          referralNodeHash,
          register_1.address
        );

        await RegisterController.connect(register_2).registerWithConfig(
          rootName,
          secondaryName,
          register_2.address,
          86400 * 365,
          secret,
          register_2.address,
          referralNodeHash,
          {
            value: price.base.add(price.premium).toBigInt().toString(),
          }
        );
      });

      it("inviter referralHub balance check", async () => {
        const neWInviterReferralBalance = await ReferralHub.referralBalance(
          register_1.address
        );

        const referralFee = await ReferralHub.getReferralCommisionFee(
          price.base.add(price.premium),
          referralNodeHash
        );

        expect(
          price.base.add(price.premium).mul(partnerReferalRate).div(100)
        ).to.equal(referralFee[0]);

        expect(
          neWInviterReferralBalance
            .sub(oldInviterReferralBalance)
            .toBigInt()
            .toString()
        ).to.equal(referralFee[0].toString());
      });

      it("inviter referralCount", async () => {
        const newInviterReferralCount = await ReferralHub.referralCount(
          referralNodeHash
        );
        expect(
          newInviterReferralCount
            .sub(oldInviterReferralCount)
            .toBigInt()
            .toString()
        ).to.equal("1");
      });
    });

    describe("renew", async function () {
      const rootName = "did";
      const secondaryName = "hello7";

      this.beforeAll(async () => {
        // generate commitment
        const secret = "0x" + crypto.randomBytes(32).toString("hex");
        const commitment = await RegisterController.makeCommitmentWithConfig(
          rootName,
          secondaryName,
          register_1.address,
          secret,
          register_1.address
        );

        await RegisterController.commit(commitment);

        await new Promise((r) => setTimeout(r, 10));

        const price = await RegisterController.rentPrice(
          rootName,
          secondaryName,
          86400 * 365
        );

        await RegisterController.connect(register_1).registerWithConfig(
          rootName,
          secondaryName,
          register_1.address,
          86400 * 365,
          secret,
          register_1.address,
          zeroBytes32,
          {
            value: price.base.add(price.premium).toBigInt().toString(),
          }
        );
      });

      it("renew verification", async () => {
        const renewSpan = 10000000;
        const oldExpires = await Registrar.nameExpires(rootName, secondaryName);

        const price = await RegisterController.rentPrice(
          rootName,
          secondaryName,
          renewSpan
        );

        await RegisterController.connect(register_1).renew(
          rootName,
          secondaryName,
          renewSpan,
          {
            value: price.base.add(price.premium).toBigInt().toString(),
          }
        );
        const newExpires = await Registrar.nameExpires(rootName, secondaryName);
        expect(newExpires.sub(oldExpires).toBigInt().toString()).to.equal(
          renewSpan.toString()
        );
      });
    });
  });

  describe("free register", function () {
    const secondaryNam = "hello10";
    it("free register ", async function () {
      const duration = 60 * 60 * 24 * 365;
      const secondaryNameLength = 7;

      // get nonce
      const nonce = await nonceGenerator(
        freeMinter.address,
        secondaryNameLength,
        duration
      );

      const { msgHash } = generateMessageHash(
        chainId,
        RegisterController.address,
        freeMinter.address,
        "did",
        secondaryNameLength,
        nonce,
        duration
      );

      // var compactSig = await registerControllerOwner.signMessage(msgHash);
      var compactSig = await signerChecker.signMessage(msgHash);
      // construct free mint message
      const msg = generateWhitelistMessage(
        freeMinter.address,
        "did",
        secondaryNameLength,
        nonce,
        duration,
        compactSig
      );

      await RegisterController.connect(freeMinter).whitelistRegister(
        msg,
        secondaryNam,
        ethers.constants.AddressZero
      );

      const owner = await Registrar["ownerOf(string,string)"](
        "did",
        secondaryNam
      );
      expect(owner).to.equal(freeMinter.address);
    });
  });

  describe("setNewUsdPriceOracle", async function () {
    const newUsdPriceOracleAddress = new ethers.Wallet(randomHex(32), provider)
      .address;
    it("newUsdPriceOracle address should equal", async function () {
      await PriceOracle.connect(priceOracleOwner).setUsdOracle(
        newUsdPriceOracleAddress
      );
      const addr = await PriceOracle.usdOracle();
      expect(addr).to.equal(newUsdPriceOracleAddress);
    });
    it("revert if not the owner", async function () {
      await expect(
        PriceOracle.connect(registerControllerOwner).setUsdOracle(
          newUsdPriceOracleAddress
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  //   describe("rentPrice", function () {
  //     it("", async function () {});
  //   });

  //   describe("available", function () {
  //     it("", async function () {});
  //   });
});
