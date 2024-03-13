import { ethers, upgrades } from "hardhat";
import { PublicResolver,DefaultReverseResolver,DID,ReverseRegistrar} from "../../typechain-types";

export async function DeployPublicResolver(did:any): Promise<PublicResolver> {
    let instance = await ethers.getContractFactory("PublicResolver");
    console.log("Deploying PublicResolver...");
    const upgradeableContract = await upgrades.deployProxy(instance, [did], { initializer: 'initialize'});
    console.log("PublicResolver is  deployed to:"+upgradeableContract.address);
    return upgradeableContract as PublicResolver;
}


export async function DeployDefaultReverseResolver(did:DID): Promise<DefaultReverseResolver> {
    let instance = await ethers.getContractFactory("DefaultReverseResolver");
    console.log("Deploying DefaultReverseResolver...");
    const upgradeableContract = await upgrades.deployProxy(instance, [did], { initializer: 'initialize'});
    await upgradeableContract.deployed();
    console.log("DefaultReverseResolver is  deployed to:"+upgradeableContract.address);
    return upgradeableContract as DefaultReverseResolver;
}


export async function DeployReverseRegistrar(did:any,resolver:any): Promise<ReverseRegistrar> {
    const instance = await ethers.getContractFactory("ReverseRegistrar");
    console.log("Deploying ReverseRegistrar...");
    const contract = await instance.deploy(did,resolver);
    await contract.deployed();
    console.log("ReverseRegistrar is  deployed to:"+contract.address);
    return contract  as ReverseRegistrar;
}

