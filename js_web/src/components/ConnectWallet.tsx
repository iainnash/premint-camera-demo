import { useAccount, useConnect, useDisconnect, useEnsName } from "wagmi";
import React from "react";
import styles from "./ConnectWallet.module.css";
import { FancyButton } from "./FancyButton";

export const ConnectWallet = () => {
  const { address, connector, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className={styles.connect}>
        <div>{ensName ? `${ensName} (${address})` : address}</div>
        <div>Connected to {connector?.name}</div>
        <FancyButton
          onClick={() => {
            disconnect();
          }}
        >
          Disconnect
        </FancyButton>
      </div>
    );
  }

  return (
    <div className={styles.connect}>
      <div className={styles.description}>Connect to web3 to post:</div>
      {connectors.map((connector) => (
        <FancyButton
          disabled={!connector.ready}
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          {connector.name}
          {!connector.ready && " (unsupported)"}
          {isLoading &&
            connector.id === pendingConnector?.id &&
            " (connecting)"}
        </FancyButton>
      ))}

      {error && <div className={styles.error}>{error.message}</div>}
    </div>
  );
};
