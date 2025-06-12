// src/utils/ipfs.ts
export const convertIPFSURL = (input: string) => {
  // Use your dedicated Pinata gateway from environment variables
  const gateway = import.meta.env.VITE_PINATA_GATEWAY;
  
  // Extract CID regardless of input format
  let cid = input;
  if (input.startsWith('ipfs://')) {
    cid = input.replace('ipfs://', '');
  }
  
  // Always use your dedicated gateway
  return `https://${gateway}/ipfs/${cid}`;
};
