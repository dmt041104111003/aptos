// src/utils/pinata.ts
import { PinataSDK } from "pinata";

// Initialize Pinata SDK with your JWT (Vite environment variables use import.meta.env.VITE_*)
const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_JWT,
  pinataGateway: import.meta.env.VITE_PINATA_GATEWAY,
});

// Upload JSON data to IPFS
export const uploadJSONToIPFS = async (jsonData: Record<string, unknown>) => {
  try {
    const upload = await pinata.upload.public.json(jsonData);
    return upload.cid; // New SDK returns {cid, id, ...} object
  } catch (error) {
    console.error("Error uploading JSON to IPFS:", error);
    throw error;
  }
};

// Upload file to IPFS and return CID
export const uploadFileToIPFS = async (file: File) => {
  try {
    const upload = await pinata.upload.public.file(file);
    return upload.cid; // New SDK returns {cid, id, ...} object
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
    throw error;
  }
};
