import React, {
  useState,
  useCallback,
  SyntheticEvent,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ConnectWallet } from "./ConnectWallet";
import { PremintAPI } from "@zoralabs/premint-sdk";
import styles from "./MintPremint.module.css";
import { PhotoButton } from "./PhotoButton";
import Webcam from "react-webcam";
import { FancyButton } from "./FancyButton";
import { SwitchCamera } from "./SwitchCamera";
import { zorbImageDataURI } from "@zoralabs/zorb";

export const MintPremint = () => {
  const [mintContract, setMintContract] = useState("");
  const [uid, setUID] = useState("");
  const [minting, setMinting] = useState<null | string>(null);
  const [success, setSuccess] = useState<ReactNode | null>(null);
  const [failure, setFailure] = useState<ReactNode | null>(null);
  const [videoConstraints, setVideoConstraints] = useState<any>({
    facingMode: "user",
  });
  const [hasMultipleDevices, setHasMultipleDevices] = useState(false);

  const switchCamera = useCallback(
    (evt: SyntheticEvent) => {
      evt.preventDefault();
      if (videoConstraints.facingMode === "user") {
        return setVideoConstraints({ facingMode: { exact: "environment" } });
      }
      setVideoConstraints({ facingMode: "user" });
    },
    [videoConstraints, setVideoConstraints]
  );

  const checkHasMultipleCameras = useCallback(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      if (devices.filter((device) => device.kind === "videoinput").length > 1) {
        setHasMultipleDevices(true);
      }
    });
  }, [setHasMultipleDevices]);

  const { isConnected, address } = useAccount();
  const zorbImage = useMemo(
    () => address && zorbImageDataURI(address),
    [address]
  );

  const { data: walletClient } = useWalletClient();

  const publicClient = usePublicClient();

  const processPremint = useCallback(
    async (url: string) => {
      if (!walletClient) {
        console.error("no walletclient");
        return;
      }
      const premintAPI: any = new PremintAPI(walletClient.chain);

      const premint = await premintAPI.createPremint({
        checkSignature: true,
        collection: {
          contractAdmin: address,
          contractName: "Camera Roll",
          contractURI:
            "ipfs://bafkreibhv77r5pijfaafx3vv6hphlira2kefouzrbhow2dzl7kornv5wcq",
        },
        publicClient,
        account: walletClient.account.address,
        walletClient,
        token: {
          tokenURI: url,
        },
      });
      console.log({ premint });
      return premint;
    },
    [publicClient, walletClient, mintContract, uid, isConnected]
  );

  const clearState = useCallback(() => {
    setFailure(null);
    setSuccess(null);
    setMinting(null);
  }, [setFailure, setSuccess, setMinting]);

  const uploadImage = useCallback(
    async (imageData: string) => {
      setFailure(null);
      setSuccess(null);
      if (!walletClient) {
        console.error("Missing walletClient");
        setFailure("Missing walletClient");
        return;
      }
      setMinting(imageData);
      const response = await fetch("/api/store", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          image: imageData,
        }),
      });
      if (response.status === 200) {
        console.log("loaded");
        setSuccess(
          <div>
            <p>Uploaded...</p>
            <p>sign mint in wallet</p>
          </div>
        );
        const { url } = await response.json();
        try {
          console.log({ url });
          const { zoraUrl } = await processPremint(url);
          setSuccess(
            <div>
              <p>Minted 🎉</p>
              <p>
                <a target="_blank" href={zoraUrl}>
                  📸 view on ZORA
                </a>
              </p>
              <p>
                <FancyButton onClick={() => clearState()}>
                  📷 take another...
                </FancyButton>
              </p>
            </div>
          );
        } catch (err: any) {
          if (err.message === "Bad response: 403") {
            setFailure(
              <>
                <p>Mint failed. Your wallet needs to be verified on zora.co.</p>
                <p>
                  <a href="https://zora.co/create" target="_blank">
                    zora.co verify
                  </a>
                </p>
              </>
            );
          }
          setFailure("Premint failed");
          console.error(err);
        }
      } else {
        setFailure("Issue uploading");
      }
    },
    [
      processPremint,
      walletClient,
      clearState,
      setFailure,
      setSuccess,
      clearState,
    ]
  );

  if (!isConnected) {
    return <ConnectWallet />;
  }

  return (
    <div className={styles.page}>
      <div
        className={
          minting
            ? `${styles.minting} ${styles.inactiveMinting}`
            : `${styles.inactiveMinting}`
        }
      >
        {minting && !success && !failure && (
          <div className={styles.message}>
            <p>☁☁️☁</p>️️ uploading <p>☁️☁️☁</p>
          </div>
        )}
        {success && !failure && <div className={styles.message}>{success}</div>}
        {failure && (
          <div className={styles.message}>
            <p>{failure}</p>
            {minting && (
              <FancyButton onClick={() => uploadImage(minting)}>
                ↭ try again ↭
              </FancyButton>
            )}
            <p>
              <FancyButton onClick={() => clearState()}>
                fauhgeddaboudit – 📸 another
              </FancyButton>
            </p>
          </div>
        )}
      </div>
      <div className={styles.webcam}>
        <Webcam
          mirrored={videoConstraints?.facingMode === "user"}
          onUserMedia={checkHasMultipleCameras}
          forceScreenshotSourceSize={true}
          videoConstraints={videoConstraints}
          screenshotFormat="image/jpeg"
        >
          {/* @ts-ignore */}
          {({ getScreenshot }: any) => (
            <button
              className={styles.takePhoto}
              onClick={(evt) => {
                evt.preventDefault();

                const imageSrc = getScreenshot();
                uploadImage(imageSrc);
              }}
            >
              <PhotoButton />
            </button>
          )}
        </Webcam>
        {hasMultipleDevices && (
          <button onClick={switchCamera} className={styles.switch}>
            <SwitchCamera />
          </button>
        )}
        <a target="_blank" href={`https://zora.co/${address}`} className={styles.zorb}>
          <img src={zorbImage} alt="View posts" />
        </a>
      </div>
    </div>
  );
};
