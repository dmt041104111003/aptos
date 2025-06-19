export const convertIPFSURL = (input: string) => {
  const gateway = import.meta.env.VITE_PINATA_GATEWAY;
  
  let cid = input;
  if (input.startsWith('ipfs://')) {
    cid = input.replace('ipfs://', '');
  }
  
  return `https://${gateway}/ipfs/${cid}`;
};
