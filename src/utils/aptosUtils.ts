import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { convertIPFSURL } from "@/utils/ipfs";

const MODULE_ADDRESS = "0xf9c47e613fee3858fccbaa3aebba1f4dbe227db39288a12bfb1958accd068242";
const PROFILE_MODULE_NAME = "web3_profiles_v7";
const PROFILE_RESOURCE_NAME = "ProfileRegistryV7";

export const aptosConfig = new AptosConfig({ network: Network.TESTNET });
export const aptos = new Aptos(aptosConfig);

export interface ProfileDataFromChain {
  cid: string;
  cccd: number;
  did: string;
  created_at: number;
}

export const fetchProfileDetails = async (address: string): Promise<{ name: string; avatar: string }> => {
  let name = "Người dùng ẩn danh";
  let avatar = "";
  try {
    const profileRegistryResource = await aptos.getAccountResource({
      accountAddress: MODULE_ADDRESS,
      resourceType: `${MODULE_ADDRESS}::${PROFILE_MODULE_NAME}::${PROFILE_RESOURCE_NAME}` as `${string}::${string}::${string}`,
    });

    if (profileRegistryResource && (profileRegistryResource as any).profiles?.handle) {
      const profileTableHandle = (profileRegistryResource as any).profiles.handle;

      const profileDataFromChain = await aptos.getTableItem({
        handle: profileTableHandle,
        data: {
          key_type: "address",
          value_type: `${MODULE_ADDRESS}::${PROFILE_MODULE_NAME}::ProfileData` as `${string}::${string}::${string}`,
          key: address,
        },
      }) as ProfileDataFromChain;

      if (profileDataFromChain.cid) {
        const profileJsonUrl = convertIPFSURL(profileDataFromChain.cid);
        const response = await fetch(profileJsonUrl);
        if (response.ok) {
          const profileJson = await response.json();
          name = profileJson.name || "Người dùng ẩn danh";
          avatar = profileJson.profilePic || "";
        }
      }
    }
  } catch (profileError) {
    console.warn(`Could not fetch profile for ${address}:`, profileError);
  }
  return { name, avatar };
}; 