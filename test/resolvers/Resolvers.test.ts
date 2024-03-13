import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers,upgrades } from "hardhat";
import { PublicResolver, DefaultReverseResolver,DIDRegistry} from "../typechain-types";
import { Wallet } from "ethers";
import { randomHex } from "../../utils/encoding";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { keccak256, toUtf8Bytes,defaultAbiCoder } from "ethers/lib/utils";
import { faucet } from "../../utils/faucet";


import { DeployPublicResolver,DeployReverseRegistrar,DeployDefaultReverseResolver } from "../fixtures/resolvers";

describe("Resolvers Test", async function () {

  let publicResolver: PublicResolver;
  let defaultReverseResolver: DefaultReverseResolver;
  let did:DIDRegistry;
  let account0: SignerWithAddress;// example0.did
  let account1: SignerWithAddress;//example1.did
  let example0Node:string;
  let example1Node:string;


  before(async () => {
    //init contract
    did = await DeployDIDRegistry();
    publicResolver =await DeployPublicResolver(did.address);
    defaultReverseResolver =await DeployDefaultReverseResolver(did.address);
    [account0, account1] = await ethers.getSigners();

    //init did data
    example0Node = getBytesTokenId("did","example0");
    example1Node = getBytesTokenId("did","example1");

    console.log("example0Node="+example0Node);
    console.log("example1Node="+example1Node);
    await did.addOwnerController(account0.address);
    await did.addOwnerController(account1.address);
    await did.connect(account0).setOwner(example0Node, account0.address);
    await did.connect(account1).setOwner(example1Node, account1.address);

  });



  describe("PublicResolver Test", function () {

    it("setAddr should be ok", async function () {
      await publicResolver.connect(account0)["setAddr(bytes32,address)"](example0Node,account0.address);
      console.log("account0="+account0.address)
      const value0 = await publicResolver.connect(account0)["addr(bytes32)"](example0Node);
      console.log("value0="+value0)
      expect(value0).to.equal(account0.address);
    
      await publicResolver.connect(account1)["setAddr(bytes32,address)"](example1Node,account1.address);
      const value1 = await publicResolver.connect(account1)["addr(bytes32)"](example1Node);
      expect(value1).to.equal(account1.address);
    });

    it("setAddr should be exception", async function () {
      await expect( publicResolver.connect(account1)["setAddr(bytes32,address)"](example0Node,account0.address)).to.be.revertedWithoutReason();
    });

    it("setName should be ok", async function () {
      await publicResolver.connect(account0).setName(example0Node,"testName");
      const value0 = await publicResolver.name(example0Node);
      expect(value0).to.equal("testName");
      await publicResolver.connect(account1).setName(example1Node,"test1Name");
      const value1 = await publicResolver.name(example1Node);
      expect(value1).to.equal("test1Name");
    });

    it("setName should be exception", async function () {
      await expect( publicResolver.connect(account1).setName(example0Node,"testName")).to.be.revertedWithoutReason();
    });

    it("setText should be ok", async function () {
      await publicResolver.connect(account0).setText(example0Node,"url","https://google.com");
      const value0 = await publicResolver.text(example0Node,"url");
      expect(value0).to.equal("https://google.com");
      await publicResolver.connect(account1).setText(example1Node,"url","https://baidu.com");
      const value1 = await publicResolver.text(example1Node,"url");
      expect(value1).to.equal("https://baidu.com");
    });

    it("setText should be exception", async function () {
      await expect( publicResolver.connect(account1).setText(example0Node,"url","https://google.com")).to.be.revertedWithoutReason();
    });

    it("setCommissionAcceptAddress should be ok", async function () {
      await publicResolver.connect(account0).setCommissionAcceptAddress(example0Node,account0.address);
      const value0 = await publicResolver.commissionAcceptAddress(example0Node);
      expect(value0).to.equal(account0.address);
      await publicResolver.connect(account1).setCommissionAcceptAddress(example1Node,account1.address);
      const value1 = await publicResolver.commissionAcceptAddress(example1Node);
      expect(value1).to.equal(account1.address);
    });

    it("setCommissionAcceptAddress should be exception", async function () {
      await expect(  publicResolver.connect(account1).setCommissionAcceptAddress(example0Node,account1.address)).to.be.revertedWithoutReason();
       
    });
 

    it("setContenthash should be ok", async function () {
      await publicResolver.connect(account0).setContenthash(example0Node,account0.address);
      const value0 = await publicResolver.contenthash(example0Node);
      expect(value0).to.equal(account0.address.toLowerCase());
      await publicResolver.connect(account1).setContenthash(example1Node,account1.address);
      const value1 = await publicResolver.contenthash(example1Node);
      expect(value1).to.equal(account1.address.toLowerCase());
    });

    it("setContenthash should be exception", async function () {
      await expect( publicResolver.connect(account1).setContenthash(example0Node,account1.address)).to.be.revertedWithoutReason();
    });
  });

});

async function DeployDIDRegistry(): Promise<DIDRegistry> {
  let instance = await ethers.getContractFactory("DIDRegistry");
  console.log("Deploying DIDRegistry...");
  const upgradeableContract = await upgrades.deployProxy(instance, [], { initializer: 'initialize' });
  await upgradeableContract.deployed();
  console.log("DIDRegistry is  deployed to:"+upgradeableContract.address);
  return upgradeableContract as DIDRegistry;
}

function getBytesTokenId(rootName: string, secondaryName: string) {
  const firstHash = keccak256(
    defaultAbiCoder.encode(
      ["address", "bytes32"],
      [ethers.constants.AddressZero, keccak256(toUtf8Bytes(rootName))]
    )
  );

  const tokenId = keccak256(
    defaultAbiCoder.encode(
      ["bytes32", "bytes32"],
      [firstHash, keccak256(toUtf8Bytes(secondaryName))]
    )
  );

  return   tokenId ;
}