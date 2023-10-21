import dynamic from "next/dynamic";
import { Suspense } from "react";

const Page = () => {
  const MintPremint = dynamic(() =>
    import("../components/MintPremint").then((res) => res.MintPremint)
  );

  return (
    <Suspense fallback={<div>loading...</div>}>
      <MintPremint />
    </Suspense>
  );
};

export default Page;
