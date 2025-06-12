// src/contexts/ProfileContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';

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
    score: number;
    jobs: number;
    breakdown: Array<{ label: string; value: number }>;
  };
  portfolio: Array<{ name: string; link: string; rating: number }>;
  reviews: Array<{ client: string; comment: string; date: string }>;
  lastCID?: string; // Track the latest IPFS CID
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
    jobs: 0,
    breakdown: [],
  },
  portfolio: [],
  reviews: [],
};

interface ProfileContextType {
  profile: ProfileData;
  updateProfile: (newProfile: ProfileData) => void;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: emptyProfile,
  updateProfile: () => {},
  loading: false,
});

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(false);

  // Load saved profile on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('profileData');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (error) {
        console.error('Error loading saved profile', error);
      }
    }
  }, []);

  const updateProfile = (newProfile: ProfileData) => {
    setProfile(newProfile);
    localStorage.setItem('profileData', JSON.stringify(newProfile));
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, loading }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
