import { NFTStorage } from "nft.storage";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  message: string;
  url: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const image = req.body.image;
  if (image && image.startsWith("data:image/jpeg;base64,")) {
    const imageBlob = new Blob(
      [
        Buffer.from(
          image.substring("data:image/jpeg;base64,".length),
          "base64"
        ),
      ],
      { type: "image/jpeg" }
    );
    const url = await storeImage(imageBlob);
    return res.status(200).json({ message: "uploaded successfully", url });
  }
  return res.status(400).json({ message: "bad request", url: null });
}

// read the API key from an environment variable. You'll need to set this before running the example!
const API_KEY = process.env.NFT_STORAGE_API_KEY!;
if (!API_KEY) {
  throw new Error("NFT.storage api key required");
}

async function storeImage(image: Blob) {
  const nft = {
    image, // use image Blob as `image` field
    name: `Snap at ${new Date().toISOString()}`,
    description: "📸",
  };

  const client = new NFTStorage({ token: API_KEY });
  const metadata = await client.store(nft);

  console.log("NFT data stored!");
  console.log("Metadata URI: ", metadata.url);
  return metadata.url;
}
