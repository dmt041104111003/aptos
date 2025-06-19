import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_JWT,
  pinataGateway: import.meta.env.VITE_PINATA_GATEWAY,
});

export const uploadJSONToIPFS = async (jsonData: Record<string, unknown>) => {
  try {
    const upload = await pinata.upload.public.json(jsonData);
    return upload.cid; 
  } catch (error) {
    console.error("Error uploading JSON to IPFS:", error);
    throw error;
  }
};


export const uploadFileToIPFS = async (file: File) => {
  try {
    const upload = await pinata.upload.public.file(file);
    return upload.cid; 
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
    throw error;
  }
};
