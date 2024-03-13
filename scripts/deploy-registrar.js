const hre = require("hardhat");
const {expect} = require("chai");
const config = require("./deploy-config.json");

async function main() {
    const ENS = config.registrar.ENS;

    console.log("ENS:", ENS);
    const [owner, userAddr] = await hre.ethers.getSigners();
    console.log("owner adress:", owner.address)
    const Registrar = await hre.ethers.getContractFactory("Registrar");
    const registrar = await hre.upgrades.deployProxy(Registrar, [ENS], {kind: 'uups', initializer:"initialize"})
    await registrar.deployed();

    expect(owner.address).to.be.equal(await registrar.owner());

    console.log("Registrar address:", registrar.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
