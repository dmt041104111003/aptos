import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { fetchProfileDetails, aptos } from '../utils/aptosUtils';

interface ProfileData {
  name: string;
  bio: string;
  profilePic: string;
  wallet: string;
  did: string;
  profile_cid: string;
  cccd: number;
  created_at: number;
}

const emptyProfile: ProfileData = {
  name: "",
  bio: "",
  profilePic: "",
  wallet: "",
  did: "",
  profile_cid: "",
  cccd: 0,
  created_at: 0,
};

interface ProfileContextType {
  profile: ProfileData;
  updateProfile: (newProfile: ProfileData) => void;
  loading: boolean;
  refetchProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: emptyProfile,
  updateProfile: () => {},
  loading: false,
  refetchProfile: async () => {},
});

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { account, accountType } = useWallet();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(false);

  const loadProfileData = useCallback(async () => {
    if (!account || accountType !== 'aptos') {
      setProfile(emptyProfile);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fetchedProfile = await fetchProfileDetails(account);
      setProfile(fetchedProfile);
      localStorage.setItem('profileData', JSON.stringify(fetchedProfile));
    } catch (error) {
      console.error('Error loading profile in ProfileContext:', error);
      setProfile(emptyProfile);
      localStorage.removeItem('profileData');
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
