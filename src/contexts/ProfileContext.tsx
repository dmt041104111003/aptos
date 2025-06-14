// src/contexts/ProfileContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { fetchProfileDetails, aptos } from '../utils/aptosUtils';
import { convertIPFSURL } from '../utils/ipfs';

// Define profile data structure based on your current static data
interface ProfileData {
  name: string;
  bio: string;
  profilePic: string;
  wallet: string;
  did: string;
  lens: string;
  gitcoinStamps: number;
  skillNFTs: string[];
  verified: boolean;
  social: {
    github: string;
    linkedin: string;
    twitter: string;
  };
  skills: string[];
  reputation: {
    score: number; // For overall reputation score (u64)
    level: number; // For reputation level (u8)
    metrics: {
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
    };
  };
  portfolio: Array<{ name: string; link: string; rating: number }>;
  reviews: Array<{ client: string; comment: string; date: string }>;
  profile_cid?: string; // Track the latest IPFS CID
  cccd: number;
  createdAt: number;
}

// Default profile matches your static data
const emptyProfile: ProfileData = {
  name: "",
  bio: "",
  profilePic: "",
  wallet: "",
  did: "",
  lens: "",
  gitcoinStamps: 0,
  skillNFTs: [],
  verified: false,
  social: {
    github: "",
    linkedin: "",
    twitter: "",
  },
  skills: [],
  reputation: {
    score: 0,
    level: 0,
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
  },
  portfolio: [],
  reviews: [],
  profile_cid: "",
  cccd: 0,
  createdAt: 0,
};

interface ProfileContextType {
  profile: ProfileData;
  updateProfile: (newProfile: ProfileData) => void;
  loading: boolean;
  refetchProfile: () => Promise<void>; // Add refetch function
}

const ProfileContext = createContext<ProfileContextType>({
  profile: emptyProfile,
  updateProfile: () => {},
  loading: false,
  refetchProfile: async () => {}, // Default empty function
});

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { account, accountType } = useWallet(); // Get account from WalletContext
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(false);

  // Function to load profile data from blockchain and IPFS
  const loadProfileData = useCallback(async () => {
    if (!account || accountType !== 'aptos') {
      setProfile(emptyProfile);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const fetchedProfile = await fetchProfileDetails(account);

      // Fetch reputation metrics separately if available
      let reputationMetrics = emptyProfile.reputation.metrics;
      let reputationScore = emptyProfile.reputation.score;
      let reputationLevel = emptyProfile.reputation.level;

      try {
        const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS; // Ensure this is correctly configured
        const PROFILE_MODULE_NAME = "web3_profiles_v12";
        const PROFILE_RESOURCE_NAME = "ProfileRegistryV12";
        const JOBS_CONTRACT_ADDRESS = "0x107b835625f8dbb3a185aabff8f754e5a98715c7dc9369544f8920c0873ccf2a"; // Your jobs contract address
        const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v15"; // Your jobs module name

        const userReputationResource = await aptos.getAccountResource({
          accountAddress: account,
          resourceType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::UserReputation`,
        });

        if (userReputationResource) {
          reputationScore = Number((userReputationResource as any).reputation_score);
          reputationLevel = Number((userReputationResource as any).reputation_level);
          reputationMetrics = {
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
          };
        }
      } catch (repError) {
        console.warn("ProfileContext: Error fetching UserReputation resource:", repError);
      }

      const updatedProfile: ProfileData = {
        ...emptyProfile,
        ...fetchedProfile,
        wallet: account,
        reputation: {
          score: reputationScore,
          level: reputationLevel,
          metrics: reputationMetrics,
        },
        // Ensure cccd and createdAt from chain are preferred if fetchProfileDetails doesn't return them directly
        cccd: (fetchedProfile as any).cccd || 0,
        createdAt: (fetchedProfile as any).created_at || 0, // Assuming created_at is available in fetchedProfileDetails if from chain
        profile_cid: (fetchedProfile as any).profile_cid || "", // Add profile_cid from fetchedProfile
      };

      setProfile(updatedProfile);
      localStorage.setItem('profileData', JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Error loading profile in ProfileContext:', error);
      setProfile(emptyProfile);
      localStorage.removeItem('profileData'); // Clear potentially bad cached data
    } finally {
      setLoading(false);
    }
  }, [account, accountType]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const updateProfileInContext = (newProfile: ProfileData) => {
    setProfile(newProfile);
    localStorage.setItem('profileData', JSON.stringify(newProfile));
  };

  // Expose loadProfileData as refetchProfile
  const refetchProfile = useCallback(async () => {
    await loadProfileData();
  }, [loadProfileData]);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile: updateProfileInContext, loading, refetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
