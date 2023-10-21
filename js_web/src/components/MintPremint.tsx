import React, { useState, useCallback, SyntheticEvent } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ConnectWallet } from "./ConnectWallet";
// import { PremintAPI } from "@zoralabs/premint-sdk";
import styles from './MintPremint.module.css';
import { PhotoButton } from "./PhotoButton";
import Webcam from "react-webcam";

export const MintPremint = () => {
  const [mintContract, setMintContract] = useState("");
  const [uid, setUID] = useState("");
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const publicClient = usePublicClient();
  const processPremint = useCallback(
    async (evt: SyntheticEvent) => {
      evt.preventDefault();

      if (!walletClient) {
        return;
      }
      const premintAPI: any = null;//new PremintAPI(walletClient.chain);

      const premint = await premintAPI.createPremint({
        checkSignature: true, 
        collection: {
          contractAdmin: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          contractName: "Testing Contract",
          contractURI:
            "ipfs://bafkreiainxen4b4wz4ubylvbhons6rembxdet4a262nf2lziclqvv7au3e",
        },
        publicClient,
        account: walletClient.account.address,
        walletClient,
        token: {
          tokenURI:
            "ipfs://bafkreice23maski3x52tsfqgxstx3kbiifnt5jotg3a5ynvve53c4soi2u",
        },
      });
      console.log({ premint });
    },
    [publicClient, walletClient, mintContract, uid, isConnected]
  );

  if (!isConnected) {
    return <ConnectWallet />;
  }

  return (
    <div style={styles.page}>
      <Webcam />
      <h2>on-chain cam</h2>
      <button>
        <PhotoButton />
      </button>
    </div>
  );
};
