import { Aptos, AptosConfig, Network, ClientConfig } from "@aptos-labs/ts-sdk";
import { convertIPFSURL } from "@/utils/ipfs";

const MODULE_ADDRESS = "0x20c226e275090c4f0854f05b2a6a08a638ecdad2a1c4cfa2014ed6d6e1dc0a66";
const PROFILE_MODULE_NAME = "web3_profiles_v10";
const PROFILE_RESOURCE_NAME = "ProfileRegistryV10";
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v13";

export const aptosConfig = new AptosConfig({ network: Network.TESTNET, clientConfig: { API_KEY: "AG-LA7UZDTNF2T1Y6H1DFA6CNSGVRQSRUKSA" } });
export const aptos = new Aptos(aptosConfig);

export interface ProfileDataFromChain {
  cid: string;
  cccd: number;
  did: string;
  created_at: number;
}

// Cache for profile details
const profileCache = new Map<string, { name: string; avatar: string; did: string; profile_cid: string }>();

export const fetchProfileDetails = async (address: string): Promise<{ name: string; avatar: string; did: string; profile_cid: string }> => {
  if (profileCache.has(address)) {
    return profileCache.get(address)!;
  }

  let name = "Ẩn danh";
  let avatar = "";
  let did = "";
  let profile_cid = "";

  try {
    const profileRegistryResource = await aptos.getAccountResource({
      accountAddress: MODULE_ADDRESS,
      resourceType: `${MODULE_ADDRESS}::${PROFILE_MODULE_NAME}::${PROFILE_RESOURCE_NAME}` as `${string}::${string}::${string}`,
    });

    if (profileRegistryResource && (profileRegistryResource as any).profiles?.handle) {
      const profileTableHandle = (profileRegistryResource as any).profiles.handle;

      const profileDataFromChain = await aptos.getTableItem<ProfileDataFromChain>({
        handle: profileTableHandle,
        data: {
          key_type: "address",
          value_type: `${MODULE_ADDRESS}::${PROFILE_MODULE_NAME}::ProfileData` as `${string}::${string}::${string}`,
          key: address,
        },
      });

      profile_cid = profileDataFromChain.cid;
      did = profileDataFromChain.did;

      if (profile_cid) {
        const profileJsonUrl = convertIPFSURL(profile_cid);
        const response = await fetch(profileJsonUrl);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`IPFS fetch failed for CID ${profile_cid}. Status: ${response.status}. Response text: ${errorText.slice(0, 500)}`);
          // If IPFS fetch fails, still use blockchain DID if available
          const cachedResult: { name: string; avatar: string; did: string; profile_cid: string } = { name: `Người dùng ${address.slice(0, 6)}...`, avatar: "", did, profile_cid };
          profileCache.set(address, cachedResult);
          return cachedResult;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const errorText = await response.text();
          console.warn(`IPFS response for CID ${profile_cid} is not JSON. Content-Type: ${contentType}. Response text: ${errorText.slice(0, 500)}`);
          const cachedResult: { name: string; avatar: string; did: string; profile_cid: string } = { name: `Người dùng ${address.slice(0, 6)}...`, avatar: "", did, profile_cid };
          profileCache.set(address, cachedResult);
          return cachedResult;
        }

        const profileJson = await response.json();
        name = profileJson.name || `Người dùng ${address.slice(0, 6)}...`;
        avatar = profileJson.profilePic || "";
      }
    }
  } catch (profileError: any) {
    console.warn(`Could not fetch profile for ${address}:`, profileError);
    // If fetching from chain fails, return a default anonymous profile
    const cachedResult: { name: string; avatar: string; did: string; profile_cid: string } = { name: `Người dùng ${address.slice(0, 6)}...`, avatar: "", did: "", profile_cid: "" };
    profileCache.set(address, cachedResult);
    return cachedResult;
  }

  const result = { name, avatar, did, profile_cid };
  profileCache.set(address, result);
  return result;
}; 