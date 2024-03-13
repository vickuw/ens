import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Wallet } from "ethers";
import { randomHex } from "../../utils/encoding";
import hre from "hardhat";
import crypto from "crypto";

import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { faucet } from "../../utils/faucet";
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
} from "../../typechain-types";

export async function deployContracts() {
  // for test
  const _minCommitmentAge = 1;
  const _maxCommitmentAge = 86400;

  const { provider } = ethers;

  const registryOwner: Wallet = new ethers.Wallet(randomHex(32), provider);
  const registrarOwner: Wallet = new ethers.Wallet(randomHex(32), provider);
  const registerControllerOwner: Wallet = new ethers.Wallet(
    randomHex(32),
    provider
  );
  const priceOracleOwner: Wallet = new ethers.Wallet(randomHex(32), provider);
  const referralHubOwner: Wallet = new ethers.Wallet(randomHex(32), provider);
  const resolverOwner: Wallet = new ethers.Wallet(randomHex(32), provider);
  const reverseRegistrarOwner: Wallet = new ethers.Wallet(
    randomHex(32),
    provider
  );
  const reverseResolverOwner: Wallet = new ethers.Wallet(
    randomHex(32),
    provider
  );

  await faucet(registryOwner.address, provider);
  await faucet(registrarOwner.address, provider);
  await faucet(registerControllerOwner.address, provider);
  await faucet(priceOracleOwner.address, provider);
  await faucet(referralHubOwner.address, provider);
  await faucet(resolverOwner.address, provider);
  await faucet(reverseResolverOwner.address, provider);
  await faucet(reverseRegistrarOwner.address, provider);

  // deploy registry
  let RegistryFactory = await ethers.getContractFactory(
    "DIDRegistry",
    registryOwner
  );
  const upgradeableRegistry = await upgrades.deployProxy(RegistryFactory, [], {
    initializer: "initialize",
  });
  const Registry: DIDRegistry =
    (await upgradeableRegistry.deployed()) as DIDRegistry;

  // deploy registrar
  let RegistrarFactory = await ethers.getContractFactory(
    "Registrar",
    registrarOwner
  );
  const upgradeableRegistrar = await upgrades.deployProxy(
    RegistrarFactory,
    [Registry.address],
    { initializer: "initialize" }
  );
  const Registrar: Registrar =
    (await upgradeableRegistrar.deployed()) as Registrar;

  // deploy PublicResolver
  let PublicResolverFactory = await ethers.getContractFactory(
    "PublicResolver",
    resolverOwner
  );
  const upgradeablePublicResolver = await upgrades.deployProxy(
    PublicResolverFactory,
    [Registry.address],
    { initializer: "initialize" }
  );
  const PublicResolver: PublicResolver =
    (await upgradeablePublicResolver.deployed()) as PublicResolver;

  // deploy DefaultReverseResolver
  let DefaultReverseResolverFactory = await ethers.getContractFactory(
    "DefaultReverseResolver",
    reverseResolverOwner
  );
  const upgradeableDefaultReverseResolver = await upgrades.deployProxy(
    DefaultReverseResolverFactory,
    [Registry.address],
    { initializer: "initialize" }
  );
  const DefaultReverseResolver: DefaultReverseResolver =
    (await upgradeableDefaultReverseResolver.deployed()) as DefaultReverseResolver;

  // deploy ReverseRegistrar
  let ReverseRegistrarFactory = await ethers.getContractFactory(
    "ReverseRegistrar",
    reverseRegistrarOwner
  );
  const ReverseRegistrar: ReverseRegistrar =
    (await ReverseRegistrarFactory.deploy(
      Registry.address
    )) as ReverseRegistrar;

  // deploy matic price oracle
  let MaticUsdPriceOracleFactory = await ethers.getContractFactory(
    "MaticUsdPriceOracle",
    priceOracleOwner
  );
  const MaticUsdPriceOracle: MaticUsdPriceOracle =
    (await MaticUsdPriceOracleFactory.deploy()) as MaticUsdPriceOracle;

  // deploy price-oracle
  let PriceOracleFactory = await ethers.getContractFactory(
    "DidPriceOracle",
    priceOracleOwner
  );
  const PriceOracle: DidPriceOracle = (await PriceOracleFactory.deploy(
    MaticUsdPriceOracle.address
  )) as DidPriceOracle;

  // deploy referral hub
  let ReferralHubFactory = await ethers.getContractFactory(
    "ReferralHub",
    referralHubOwner
  );
  const upgradeableReferralHub = await upgrades.deployProxy(
    ReferralHubFactory,
    [Registry.address],
    { initializer: "initialize" }
  );
  const ReferralHub: ReferralHub =
    (await upgradeableReferralHub.deployed()) as ReferralHub;

  // deploy registerController
  const DIDRegisterControllerV2Factory = await ethers.getContractFactory(
    "DIDRegisterControllerV2",
    registerControllerOwner
  );

 
    const upgradeableRegistryController = await upgrades.deployProxy(DIDRegisterControllerV2Factory, 
      [ Registrar.address,
        PriceOracle.address,
        ReferralHub.address,
      _minCommitmentAge,
      _maxCommitmentAge,
      PublicResolver.address], {
      initializer: "initialize",
    });
    const RegisterController: DIDRegisterControllerV2 =(await upgradeableRegistryController.deployed()) as DIDRegisterControllerV2;

  // const DIDRegisterControllerV1Factory = await ethers.getContractFactory(
  //   "DIDRegisterControllerV1",
  //   registerControllerOwner
  // );

  // const RegisterController: DIDRegisterControllerV1 =
  //   (await DIDRegisterControllerV1Factory.deploy(
  //     Registrar.address,
  //     PriceOracle.address,
  //     ReferralHub.address,
  //     _minCommitmentAge,
  //     _maxCommitmentAge,
  //     PublicResolver.address
  //   )) as DIDRegisterControllerV1;

  return {
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
  };
}
