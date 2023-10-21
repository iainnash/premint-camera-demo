import dynamic from "next/dynamic";

const Page = () => {
  const MintPremint = dynamic(
    async () => (await import("../components/MintPremint")).MintPremint,
    {
      loading: (props) => (
        <div>loading... {JSON.stringify(props.error?.toString())}</div>
      ),
    }
  );

  return <MintPremint />;
};

export default Page;
