import { Aptos, AptosConfig, Network, ClientConfig } from "@aptos-labs/ts-sdk";
import { convertIPFSURL } from "@/utils/ipfs";

const MODULE_ADDRESS = "0xabec4e453af5c908c5d7f0b7b59931dd204e2bc5807de364629b4e32eb5fafea";
const PROFILE_MODULE_NAME = "web3_profiles_v29";
const PROFILE_RESOURCE_NAME = "Profiles";

export const aptosConfig = new AptosConfig({ network: Network.TESTNET, clientConfig: { API_KEY: "AG-LA7UZDTNF2T1Y6H1DFA6CNSGVRQSRUKSA" } });
export const aptos = new Aptos(aptosConfig);

export interface ProfileDataFromChain {
  cid: string;
  cccd: number;
  did: string;
  created_at: number;
}

export interface ProfileData {
  name: string;
  bio: string;
  profilePic: string;
  wallet: string;
  did: string;
  profile_cid: string;
  cccd: number;
  created_at: number;
  skills: string[];
}

// Cache for profile details
const profileCache = new Map<string, ProfileData>();

export const fetchProfileDetails = async (address: string): Promise<ProfileData> => {
  if (profileCache.has(address)) {
    return profileCache.get(address)! as ProfileData;
  }

  let name = "Ẩn danh";
  let bio = "";
  let profilePic = "avatar";
  let did = "";
  let profile_cid = "";
  let cccd = 0;
  let created_at = 0;
  let wallet = address;
  let skills: string[] = [];

  try {
    const profileRegistryResource = await aptos.getAccountResource({
      accountAddress: MODULE_ADDRESS,
      resourceType: `${MODULE_ADDRESS}::${PROFILE_MODULE_NAME}::${PROFILE_RESOURCE_NAME}` as `${string}::${string}::${string}`,
    });

    if (profileRegistryResource && (profileRegistryResource as any).profiles?.handle) {
      const profileTableHandle = (profileRegistryResource as any).profiles.handle;
      try {
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
        cccd = profileDataFromChain.cccd;
        created_at = profileDataFromChain.created_at;

        if (profile_cid) {
          const profileJsonUrl = convertIPFSURL(profile_cid);
          const response = await fetch(profileJsonUrl);

          if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
            const profileJson = await response.json();
            name = profileJson.name || name;
            bio = profileJson.bio || bio;
            profilePic = profileJson.profilePic || profilePic;
            skills = Array.isArray(profileJson.skills) ? profileJson.skills : [];
          }
        }
      } catch (tableItemError: any) {
        // Nếu lỗi là TableItemNotFound thì coi như chưa đăng ký hồ sơ
        if (tableItemError && (tableItemError.message?.includes('TableItem') || tableItemError.toString().includes('TableItem'))) {
          // Không làm gì, giữ did và profile_cid rỗng
        } else {
          console.warn(`Could not fetch profile table item for ${address}:`, tableItemError);
        }
      }
    }
  } catch (profileError: any) {
    console.warn(`Could not fetch profile for ${address}:`, profileError);
  }

  const result: ProfileData = { name, bio, profilePic, wallet, did, profile_cid, cccd, created_at, skills };
  profileCache.set(address, result);
  return result;
};

// Utility function to decode CID from vector<u8> format
export const decodeCID = (cidBytes: any): string => {
  if (typeof cidBytes === 'string') {
    // If it's already a string, check if it's hex format
    if (cidBytes.startsWith('0x')) {
      const hex = cidBytes.replace(/^0x/, '');
      const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []);
      return new TextDecoder().decode(bytes);
    }
    return cidBytes;
  } else if (Array.isArray(cidBytes)) {
    // If it's an array of numbers, convert to string
    return new TextDecoder().decode(new Uint8Array(cidBytes));
  }
  return '';
};

// Function to fetch milestone details from IPFS
export const fetchMilestoneDetails = async (cid: string): Promise<any> => {
  try {
    const ipfsUrl = convertIPFSURL(cid);
    const response = await fetch(ipfsUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching milestone details:', error);
    throw error;
  }
};

// Function to get milestone CIDs from job data
export const getMilestoneCIDs = (job: any, milestoneIndex: number): {
  submissionCID?: string;
  acceptanceCID?: string;
  rejectionCID?: string;
} => {
  const milestoneData = job.milestone_states?.[milestoneIndex];
  if (!milestoneData) return {};

  return {
    submissionCID: milestoneData.submission_cid ? decodeCID(milestoneData.submission_cid) : undefined,
    acceptanceCID: milestoneData.acceptance_cid ? decodeCID(milestoneData.acceptance_cid) : undefined,
    rejectionCID: milestoneData.rejection_cid ? decodeCID(milestoneData.rejection_cid) : undefined,
  };
}; 