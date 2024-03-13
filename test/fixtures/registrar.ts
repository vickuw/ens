import { ethers, upgrades } from "hardhat";
import { Registrar } from "../../typechain-types";

async function DeployRegistrar(ENS): Promise<Registrar> {
    let Registrar = await ethers.getContractFactory("Registrar");
    const registrar0 = await upgrades.deployProxy(Registrar, { kind: 'uups' });
    await registrar0.deployed();
    const registrar = await ethers.getContractAt("Registrar", registrar0.address);
    await registrar.initializeRegistrar(ENS);

    return registrar as Registrar;
}