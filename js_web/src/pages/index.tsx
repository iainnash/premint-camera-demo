import dynamic from "next/dynamic";
import styles from "./index.module.css";
import { useAccount, useDisconnect, useEnsAddress, useEnsName } from "wagmi";

const Page = () => {
  const MintPremint = dynamic(
    async () => (await import("../components/MintPremint")).MintPremint,
    {
      loading: (props) => (
        <div>loading... {JSON.stringify(props.error?.toString())}</div>
      ),
    }
  );

  const { address } = useAccount();
  const { data: ens } = useEnsName({ address });
  const { disconnect } = useDisconnect();

  return (
    <>
      <div className={styles.header}>
        {address ? (
          ens ? (
            <button onClick={() => disconnect()} className={styles.disconnect}>
              {ens} x
            </button>
          ) : (
            <button onClick={() => disconnect()} className={styles.disconnect}>
              {address} x
            </button>
          )
        ) : (
          <a href="https://twitter.com/isiain" target="_blank">
            @isiain
          </a>
        )}
        <button
          onClick={() =>
            alert(
              "this is an experiment for zora preminting \n\nif you have issues posting, ensure you have a verified zora profile"
            )
          }
        >
          ?
        </button>
      </div>
      <MintPremint />
    </>
  );
};

export default Page;
