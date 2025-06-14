import { Aptos, AptosConfig, Network, ClientConfig } from "@aptos-labs/ts-sdk";
import { convertIPFSURL } from "@/utils/ipfs";

const MODULE_ADDRESS = "0x97bd417572de0bda9b8657459d4863e5d0da70d81000619ddfc8c316408fc853";
const PROFILE_MODULE_NAME = "web3_profiles_v14";
const PROFILE_RESOURCE_NAME = "ProfileRegistryV14";
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v17";
const JOBS_CONTRACT_ADDRESS = "0x97bd417572de0bda9b8657459d4863e5d0da70d81000619ddfc8c316408fc853";

export const aptosConfig = new AptosConfig({ network: Network.TESTNET, clientConfig: { API_KEY: "AG-LA7UZDTNF2T1Y6H1DFA6CNSGVRQSRUKSA" } });
export const aptos = new Aptos(aptosConfig);

export interface ProfileDataFromChain {
  cid: string;
  cccd: number;
  did: string;
  created_at: number;
}

export interface ReputationMetrics {
  total_jobs_completed: number;
  total_jobs_cancelled: number;
  total_amount_transacted: number;
  last_activity_time: number;
  total_milestones_completed: number;
  total_milestones_rejected: number;
  on_time_delivery_count: number;
  total_milestones: number;
  total_jobs_posted: number;
  total_milestones_accepted: number;
  total_milestones_rejected_by_client: number;
  total_response_time: number;
  response_count: number;
}

export interface UserReputationData {
  score: number;
  level: number;
  metrics: ReputationMetrics;
}

// Cache for profile details
const profileCache = new Map<string, { name: string; profilePic: string; did: string; profile_cid: string; reputation: UserReputationData }>();

export const fetchProfileDetails = async (address: string): Promise<{ name: string; profilePic: string; did: string; profile_cid: string; reputation: UserReputationData }> => {
  if (profileCache.has(address)) {
    return profileCache.get(address)!;
  }

  let name = "Ẩn danh";
  let profilePic = "";
  let did = "";
  let profile_cid = "";
  let reputation: UserReputationData = {
    score: 0,
    level: 1, // Default to level 1
    metrics: {
      total_jobs_completed: 0,
      total_jobs_cancelled: 0,
      total_amount_transacted: 0,
      last_activity_time: 0,
      total_milestones_completed: 0,
      total_milestones_rejected: 0,
      on_time_delivery_count: 0,
      total_milestones: 0,
      total_jobs_posted: 0,
      total_milestones_accepted: 0,
      total_milestones_rejected_by_client: 0,
      total_response_time: 0,
      response_count: 0,
    },
  };

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
          const cachedResult: { name: string; profilePic: string; did: string; profile_cid: string; reputation: UserReputationData } = { name: `Người dùng ${address.slice(0, 6)}...`, profilePic: "", did, profile_cid, reputation };
          profileCache.set(address, cachedResult);
          return cachedResult;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const errorText = await response.text();
          console.warn(`IPFS response for CID ${profile_cid} is not JSON. Content-Type: ${contentType}. Response text: ${errorText.slice(0, 500)}`);
          const cachedResult: { name: string; profilePic: string; did: string; profile_cid: string; reputation: UserReputationData } = { name: `Người dùng ${address.slice(0, 6)}...`, profilePic: "", did, profile_cid, reputation };
          profileCache.set(address, cachedResult);
          return cachedResult;
        }

        const profileJson = await response.json();
        name = profileJson.name || `Người dùng ${address.slice(0, 6)}...`;
        profilePic = profileJson.profilePic || "";
      }
    }
  } catch (profileError: any) {
    console.warn(`Could not fetch profile data from web3_profiles_v14 for ${address}:`, profileError);
    // If fetching from chain fails, return a default anonymous profile
  }

  // Fetch reputation data
  try {
    const userReputationResource = await aptos.getAccountResource({
      accountAddress: address,
      resourceType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::UserReputation`,
    });

    if (userReputationResource) {
      reputation = {
        score: Number((userReputationResource as any).reputation_score),
        level: Number((userReputationResource as any).reputation_level),
        metrics: {
          total_jobs_completed: Number((userReputationResource as any).metrics?.total_jobs_completed || 0),
          total_jobs_cancelled: Number((userReputationResource as any).metrics?.total_jobs_cancelled || 0),
          total_amount_transacted: Number((userReputationResource as any).metrics?.total_amount_transacted || 0),
          last_activity_time: Number((userReputationResource as any).metrics?.last_activity_time || 0),
          total_milestones_completed: Number((userReputationResource as any).metrics?.total_milestones_completed || 0),
          total_milestones_rejected: Number((userReputationResource as any).metrics?.total_milestones_rejected || 0),
          on_time_delivery_count: Number((userReputationResource as any).metrics?.on_time_delivery_count || 0),
          total_milestones: Number((userReputationResource as any).metrics?.total_milestones || 0),
          total_jobs_posted: Number((userReputationResource as any).metrics?.total_jobs_posted || 0),
          total_milestones_accepted: Number((userReputationResource as any).metrics?.total_milestones_accepted || 0),
          total_milestones_rejected_by_client: Number((userReputationResource as any).metrics?.total_milestones_rejected_by_client || 0),
          total_response_time: Number((userReputationResource as any).metrics?.total_response_time || 0),
          response_count: Number((userReputationResource as any).metrics?.response_count || 0),
        },
      };
    }
  } catch (repError) {
    console.warn(`Could not fetch UserReputation for ${address}:`, repError);
  }

  const result = { name, profilePic, did, profile_cid, reputation };
  profileCache.set(address, result);
  return result;
}; 