import type { WalletClient } from "viem";

type NetworkConfig = {
  chainId: number;
  zoraPathChainName: string;
  zoraBackendChainName: string;
};

const ZORA_PREMINT_API_BASE = "https://api.zora.co/premint/";

class Preminter {
  network: NetworkConfig;
  mintFee: BigInt;
  constructor(network: NetworkConfig) {
    this.network = network;
    this.mintFee = BigInt("777000000000000");
  }

  async get(path: string) {
    const response = await fetch(path);
    return await response.json();
  }

  createPremint() {}

  async getPremintExecutionArgs(
    quantityToMint: number,
    mintComment: string,
    address: string,
    uid: number
  ) {
    const data = await this.get(
      `${ZORA_PREMINT_API_BASE}signature/${this.network.zoraBackendChainName}/${address}/${uid}`
    );

    return [
      data.collection, // collectionInfo
      data.premint.tokenConfig, // tokenConfig
      data.signature, // signature
      quantityToMint, // quantityToMint
      mintComment, // mintComment
    ];
  }

  async executePremintWithWallet(
    walletClient: WalletClient,
    quantityToMint: number,
    mintComment: string,
    address: string,
    uid: number
  ) {}
}
