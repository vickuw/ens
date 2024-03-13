import { keccak256, toUtf8Bytes, defaultAbiCoder } from "ethers/lib/utils";
import { ethers } from "ethers";
import { BigNumber } from "ethers";
import hre from "hardhat";

export function getTokenId(rootName: string, secondaryName: string) {
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

  return BigNumber.from(tokenId).toBigInt().toString();
}
export function getBytesTokenId(rootName: string, secondaryName: string) {
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

  return tokenId;
}

export async function parseTransEvent(
  trans,
  eventHash,
  contractInstance,
  eventAbi
) {
  let transReceipt = await hre.ethers.provider.getTransactionReceipt(
    trans.hash
  );
  let event;

  for (let i = 0; i < transReceipt.logs.length; i++) {
    event = transReceipt.logs[i];
    if (event.address != contractInstance.address) {
      continue;
    }
    if (event.topics[0] != eventHash) {
      continue;
    }

    if (event != null) {
      break;
    }
  }

  if (!event) {
    return { exist: false, logArgs: null };
  }

  let iface = new hre.ethers.utils.Interface(eventAbi);
  let log = iface.parseLog(event); // here you can add your own logic to find the correct log

  return { exist: true, logArgs: log.args };
}
