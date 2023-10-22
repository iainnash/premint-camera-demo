import React from "react";
import { createConfig, configureChains, WagmiConfig } from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { InjectedConnector } from "wagmi/connectors/injected";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { zora, zoraTestnet } from "viem/chains";
import { AppProps } from "next/app";
import "./global.css";
import Head from "next/head";

const { chains, publicClient } = configureChains(
  process.env.NEXT_PUBLIC_INCLUDE_TESTNET ? [zora, zoraTestnet] : [zora],
  [publicProvider()]
);

const config = createConfig({
  connectors: [
    new InjectedConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string,
      },
    }),
  ],
  publicClient,
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <WagmiConfig config={config}>
        <Component {...pageProps} />
      </WagmiConfig>
    </>
  );
}
