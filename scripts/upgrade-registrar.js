const hre = require("hardhat");
const {expect} = require("chai");
const config = require("./deploy-config.json");

async function main() {
    const proxy = config.registrar.proxy;

    const [owner, userAddr] = await hre.ethers.getSigners();
    console.log("owner adress:", owner.address)
    const Registrar = await hre.ethers.getContractFactory("Registrar");
    const registrar = await hre.upgrades.upgradeProxy(proxy, Registrar, {kind: 'uups'})

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
