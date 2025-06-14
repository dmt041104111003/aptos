import React, { useState, useEffect } from "react";
import Navbar from "@/components/ui2/Navbar";
import { Delete, Plus, Save, Upload, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { uploadJSONToIPFS, uploadFileToIPFS } from "@/utils/pinata";
import { useProfile } from '../contexts/ProfileContext';
import { Aptos, AptosConfig, Network, ClientConfig } from "@aptos-labs/ts-sdk";

interface Profile {
  name: string;
  bio: string;
  profilePic: string;
  wallet: string;
  did: string;
  verified: boolean;
  social: {
    github: string;
    linkedin: string;
    twitter: string;
  };
  reputation: {
    score: number;
    jobs: number;
    breakdown: { label: string; value: number }[];
  };
  lens: string;
  skillNFTs: string[];
  gitcoinStamps: number;
  skills: string[];
  portfolio: { name: string; link: string; rating: number }[];
  reviews: { client: string; date: string; comment: string }[];
  profile_cid?: string;
  cccd: number;
  createdAt: number;
  lastUpdated: string;
  [key: string]: unknown;
}

interface ProfileDataFromChain {
  cid: string;
  cccd: number;
  did: string;
  created_at: number;
}

const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS;
const MODULE_NAME = "web3_profiles_v14";
const RESOURCE_NAME = "ProfileRegistryV14";

const JOBS_CONTRACT_ADDRESS = "0x97bd417572de0bda9b8657459d4863e5d0da70d81000619ddfc8c316408fc853";
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v17";

const config = new AptosConfig({ network: Network.TESTNET, clientConfig: { API_KEY: "AG-LA7UZDTNF2T1Y6H1DFA6CNSGVRQSRUKSA" } });
const aptos = new Aptos(config);

export default function Settings() {
  const { account, accountType } = useWallet();
  const { profile: savedProfile, updateProfile } = useProfile();
  const [profile, setProfile] = useState(savedProfile);
  const [newSkill, setNewSkill] = useState("");
  const [newPortfolioItem, setNewPortfolioItem] = useState({ name: "", link: "", rating: 5 });
  const [imagePreview, setImagePreview] = useState(savedProfile.profilePic);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [cccd, setCccd] = useState("");
  const [isProfileExistInState, setIsProfileExistInState] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  useEffect(() => {
    setProfile(savedProfile);
    setImagePreview(savedProfile.profilePic);

    const checkProfileExistence = async () => {
      if (!account || accountType !== 'aptos') {
        setIsProfileExistInState(false);
        return;
      }
      try {
        console.log("Attempting to fetch full profile data from blockchain...");
        const registryResource = await aptos.getAccountResource({
          accountAddress: import.meta.env.VITE_MODULE_ADDRESS,
          resourceType: `${import.meta.env.VITE_MODULE_ADDRESS}::${MODULE_NAME}::${RESOURCE_NAME}`,
        });

        if (!registryResource) {
          console.log("Profile registry resource not found.");
          setIsProfileExistInState(false);
          return;
        }

        const profiles = (registryResource as any)?.profiles;
        if (!profiles?.handle) {
          console.error("Profile registry handle missing.");
          setIsProfileExistInState(false);
          return;
        }

        const profilesTableHandle = profiles.handle;

        const profileDataFromChain = await aptos.getTableItem({
          handle: profilesTableHandle,
          data: {
            key_type: "address",
            value_type: `${import.meta.env.VITE_MODULE_ADDRESS}::${MODULE_NAME}::ProfileData`,
            key: account,
          },
        }) as ProfileDataFromChain;

        console.log("Profile data from chain:", profileDataFromChain);
        setCccd(profileDataFromChain.cccd.toString());
        setProfile(prev => ({ ...prev, did: profileDataFromChain.did }));
        setIsProfileExistInState(true); // Profile exists if we successfully fetch data

      } catch (error: any) {
        console.warn("Lỗi khi lấy ProfileData từ blockchain. Coi là chưa đăng ký:", error);
        setIsProfileExistInState(false);
        // Optionally, set initial CCCD value to empty string if profile not found
        setCccd(''); 
        setProfile(prev => ({ ...prev, did: `did:aptos:${account}` })); // Set default DID
      }
    };
    checkProfileExistence();

  }, [savedProfile, account, accountType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      social: {
        ...prev.social,
        [name]: value
      }
    }));
  };

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPortfolioItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addPortfolioItem = () => {
    if (newPortfolioItem.name && newPortfolioItem.link) {
      setProfile(prev => ({
        ...prev,
        portfolio: [...prev.portfolio, newPortfolioItem]
      }));
      setNewPortfolioItem({ name: "", link: "", rating: 5 });
    }
  };

  const removePortfolioItem = (name: string) => {
    setProfile(prev => ({
      ...prev,
      portfolio: prev.portfolio.filter(item => item.name !== name)
    }));
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountType !== 'aptos' || !window.aptos || !account) {
      setStatus({ type: 'error', message: 'Vui lòng kết nối ví Aptos để lưu hồ sơ.' });
      return;
    }

    setUploading(true);
    setStatus({ type: null, message: '' });

    try {
      // Ensure reputation resource is initialized for the user
      // Check if UserReputation resource already exists for the current account
      const userReputationResourceType = `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::UserReputation`;
      const reputationExists = await aptos.getAccountResource({ accountAddress: account, resourceType: userReputationResourceType })
        .then(() => true)
        .catch(() => false);

      if (!reputationExists) {
        console.log("Initializing user reputation...");
        const initRepTxn = await window.aptos.signAndSubmitTransaction({
          type: "entry_function_payload",
          function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::initialize_reputation`,
          type_arguments: [],
          arguments: []
        });
        await aptos.waitForTransaction({ transactionHash: initRepTxn.hash });
        console.log("User reputation initialized successfully.");
      } else {
        console.log("User reputation already exists, skipping initialization.");
      }

      // Upload profile image if changed
      let profilePicUrl = profile.profilePic;
      if (imageFile) {
          const imageCID = await uploadFileToIPFS(imageFile);
        profilePicUrl = `ipfs://${imageCID}`;
      }

      // Prepare profile data
      const profileData = {
        ...profile,
        profilePic: profilePicUrl,
        lastUpdated: new Date().toISOString(),
      };

      // Upload to IPFS
      const cid = await uploadJSONToIPFS(profileData);

      // Prepare transaction payload
      const payload = {
        type: "entry_function_payload",
        function: `${import.meta.env.VITE_MODULE_ADDRESS}::${MODULE_NAME}::${isProfileExistInState ? 'update_profile' : 'register_profile'}`,
        type_arguments: [],
        arguments: isProfileExistInState 
          ? [cid] // For update_profile
          : [cid, parseInt(cccd), `did:aptos:${account}`], // For register_profile
      };

      // Sign and submit transaction
      const txnHash = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: txnHash.hash });

      // Update local state
      setProfile(prev => ({
        ...prev,
        profile_cid: cid,
        profilePic: profilePicUrl,
      }));

      // Update context
      updateProfile({
        ...profileData,
        profile_cid: cid,
      });

      setStatus({ 
        type: 'success', 
        message: isProfileExistInState ? 'Hồ sơ đã được cập nhật thành công!' : 'Hồ sơ đã được đăng ký thành công!' 
      });

    } catch (error: any) {
      console.error('Error saving profile:', error);
      setStatus({ 
        type: 'error', 
        message: `Lỗi khi lưu hồ sơ: ${error.message || 'Vui lòng thử lại sau.'}` 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="py-16 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black min-h-[80vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold font-heading text-white">Chỉnh sửa hồ sơ</h1>
            {status.type && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                status.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span>{status.message}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Avatar + Info */}
            <div className="col-span-1">
              <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 w-full mb-8 flex flex-col items-center shadow-xl">
                <div className="relative w-36 h-36 mb-4">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-violet-700 p-1">
                  <img 
                    src={imagePreview} 
                      alt="Ảnh đại diện" 
                    className="w-full h-full rounded-full object-cover border-4 border-black"
                  />
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full mt-2">
                  <div className="inline-flex items-center px-3 py-2 bg-white/10 rounded-lg text-xs text-white w-full justify-center font-primary">
                    <span className="truncate break-all">{account || "Chưa kết nối ví"}</span>
                  </div>
                  <div className="inline-flex items-center px-3 py-2 bg-white/10 rounded-lg text-xs text-white w-full justify-center font-primary">
                    <span className="truncate break-all">{profile.did}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-4 justify-center">
                  {profile.social.github && (
                    <a href={profile.social.github} className="text-gray-400 hover:text-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-github text-2xl"></i>
                    </a>
                  )}
                  {profile.social.linkedin && (
                    <a href={profile.social.linkedin} className="text-gray-400 hover:text-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-linkedin text-2xl"></i>
                    </a>
                  )}
                  {profile.social.twitter && (
                    <a href={profile.social.twitter} className="text-gray-400 hover:text-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-twitter text-2xl"></i>
                    </a>
                  )}
                </div>

                <label className="w-full mt-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-center group relative z-10 cursor-pointer overflow-hidden font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10 rounded-lg">
                  <span className="relative inline-flex items-center justify-center gap-2 overflow-hidden font-primary text-base">
                    <Upload size={20} />
                      <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                        Đổi ảnh đại diện
                      </div>
                      <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                        Đổi ảnh đại diện
                      </div>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {/* Right: Form */}
            <div className="col-span-1 md:col-span-2">
              <form onSubmit={handleSubmit} className="w-full space-y-8">
                {/* Basic Info Section */}
                <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8">
                  <h2 className="text-lg font-semibold mb-4 font-heading text-white">Thông tin cơ bản</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-1 font-primary">
                        Họ và tên
                        <input
                          type="text"
                          name="name"
                          value={profile.name}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border rounded-md focus:border-blue-500/50 focus:ring-blue-500/20 mt-1 font-primary ${uploading ? 'bg-gray-700/50 cursor-not-allowed text-gray-400' : 'bg-white/10 border-white/20 text-white placeholder:text-gray-400'}`}
                          required
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1 font-primary">
                        Số CCCD
                        <input
                          type="number"
                          value={cccd}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Limit to 12 digits
                            if (value === '' || (/^\d+$/.test(value) && value.length <= 12)) {
                              setCccd(value);
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-md focus:border-blue-500/50 focus:ring-blue-500/20 mt-1 font-primary ${uploading || isProfileExistInState ? 'bg-gray-700/50 cursor-not-allowed text-gray-400' : 'bg-white/10 border-white/20 text-white placeholder:text-gray-400'}`}
                          placeholder="Nhập số CCCD của bạn"
                          required={!isProfileExistInState}
                          disabled={uploading || isProfileExistInState}
                          min="0"
                          step="1"
                        />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1 font-primary">
                        Giới thiệu bản thân
                        <textarea
                          name="bio"
                          value={profile.bio}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 border rounded-md focus:border-blue-500/50 focus:ring-blue-500/20 mt-1 font-primary"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Social Links Section */}
                <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8">
                  <h2 className="text-lg font-semibold mb-4 font-heading text-white">Mạng xã hội</h2>
                  <div className="space-y-4">
                    {['github', 'linkedin', 'twitter'].map((platform) => (
                      <div key={platform}>
                        <label className="block text-sm font-medium text-white mb-1 font-primary capitalize">
                          {platform === 'github' ? 'GitHub' : platform === 'linkedin' ? 'LinkedIn' : 'Twitter'}
                          <input
                            type="url"
                            name={platform}
                            value={profile.social[platform as keyof typeof profile.social]}
                            onChange={handleSocialChange}
                            className="w-full px-3 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 border rounded-md focus:border-blue-500/50 focus:ring-blue-500/20 mt-1 font-primary"
                            placeholder={`https://${platform}.com/username`}
                            disabled={uploading}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills Section */}
                <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8">
                  <h2 className="text-lg font-semibold mb-4 font-heading text-white">Kỹ năng</h2>
                  <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 border rounded-md focus:border-blue-500/50 focus:ring-blue-500/20 font-primary"
                      placeholder="Thêm kỹ năng mới"
                        disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={uploading || !newSkill.trim()}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <div
                          key={skill}
                          className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-sm"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            disabled={uploading}
                    >
                            <Delete size={16} />
                    </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Portfolio Section */}
                <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8">
                  <h2 className="text-lg font-semibold mb-4 font-heading text-white">Dự án cá nhân</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="name"
                        value={newPortfolioItem.name}
                        onChange={handlePortfolioChange}
                        className="px-3 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 border rounded-md focus:border-blue-500/50 focus:ring-blue-500/20 font-primary"
                        placeholder="Tên dự án"
                        disabled={uploading}
                      />
                      <input
                        type="url"
                        name="link"
                        value={newPortfolioItem.link}
                        onChange={handlePortfolioChange}
                        className="px-3 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 border rounded-md focus:border-blue-500/50 focus:ring-blue-500/20 font-primary"
                        placeholder="Đường dẫn dự án"
                        disabled={uploading}
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        name="rating"
                        value={newPortfolioItem.rating}
                        onChange={handlePortfolioChange}
                        min="1"
                        max="5"
                        step="0.1"
                        className="w-24 px-3 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 border rounded-md focus:border-blue-500/50 focus:ring-blue-500/20 font-primary"
                        disabled={uploading}
                      />
                      <button
                        type="button"
                        onClick={addPortfolioItem}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={uploading || !newPortfolioItem.name.trim() || !newPortfolioItem.link.trim()}
                      >
                        Thêm dự án
                      </button>
                    </div>
                    <div className="space-y-2">
                      {profile.portfolio.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-3 bg-white/10 rounded-lg"
                        >
                          <div>
                            <h3 className="font-medium">{item.name}</h3>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-400 hover:text-blue-300"
                            >
                              {item.link}
                            </a>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-yellow-400">★ {item.rating}</span>
                            <button
                              type="button"
                              onClick={() => removePortfolioItem(item.name)}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                              disabled={uploading}
                            >
                              <Delete size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        <span>{isProfileExistInState ? 'Lưu thay đổi' : 'Đăng ký hồ sơ'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Transfer Ownership Section */}
              <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-yellow-400/20 rounded-2xl p-8 mt-8 shadow-xl">
                <h2 className="text-lg font-semibold mb-4 font-heading text-yellow-400 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" /> Chuyển quyền sở hữu hồ sơ
                </h2>
                <p className="text-gray-300 text-sm mb-4">Bạn có thể chuyển toàn bộ hồ sơ sang địa chỉ ví Aptos khác. Sau khi chuyển, bạn sẽ không còn quyền chỉnh sửa hồ sơ này.</p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!accountType || accountType !== 'aptos' || !window.aptos) {
                      setTransferStatus({ type: 'error', message: 'Vui lòng kết nối ví Aptos để chuyển quyền sở hữu.' });
                      return;
                    }
                    if (!newOwnerAddress.trim()) {
                      setTransferStatus({ type: 'error', message: 'Vui lòng nhập địa chỉ ví mới để chuyển quyền sở hữu.' });
                      return;
                    }

                    setTransferring(true);
                    setTransferStatus({ type: null, message: '' });

                    try {
                      // Check if new owner address already has a profile
                      const moduleAddress = import.meta.env.VITE_MODULE_ADDRESS;
                      const resourceType = `${moduleAddress}::${MODULE_NAME}::${RESOURCE_NAME}` as `${string}::${string}::${string}`;
                      const profileDataType = `${moduleAddress}::${MODULE_NAME}::ProfileData` as `${string}::${string}::${string}`;

                      try {
                        const registryResource = await aptos.getAccountResource({
                          accountAddress: moduleAddress,
                          resourceType: resourceType,
                        });

                        if (registryResource) {
                          const profiles = (registryResource as any)?.profiles;
                          if (profiles?.handle) {
                            await aptos.getTableItem({
                              handle: profiles.handle,
                              data: {
                                key_type: "address",
                                value_type: profileDataType,
                                key: newOwnerAddress.trim(),
                              },
                            });
                            // If we reach here, it means a profile exists for newOwnerAddress
                            setTransferStatus({ type: 'error', message: 'Địa chỉ nhận đã có hồ sơ. Không thể chuyển quyền sở hữu.' });
                            setTransferring(false);
                            return; // Stop the transfer process
                          }
                        }
                      } catch (checkError: any) {
                        // If TableItemNotFound or Resource not found, it's fine, profile doesn't exist for new owner
                        if (!checkError.message.includes("TableItemNotFound") && !checkError.message.includes("Resource not found")) {
                            console.warn("Lỗi khi kiểm tra hồ sơ địa chỉ nhận:", checkError);
                        }
                      }

                      const txnPayload = {
                        type: 'entry_function_payload',
                        function: `${import.meta.env.VITE_MODULE_ADDRESS}::${MODULE_NAME}::transfer_ownership`,
                        type_arguments: [],
                        arguments: [newOwnerAddress.trim()],
                      };
                      const txnHash = await window.aptos.signAndSubmitTransaction(txnPayload);
                      await aptos.waitForTransaction({ transactionHash: txnHash.hash });
                      setTransferStatus({ type: 'success', message: 'Chuyển quyền sở hữu thành công! Vui lòng đăng nhập lại bằng ví mới.' });
                    } catch (error: any) {
                      setTransferStatus({ type: 'error', message: error?.message || 'Chuyển quyền sở hữu thất bại. Vui lòng thử lại.' });
                    } finally {
                      setTransferring(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <input
                    type="text"
                    value={newOwnerAddress}
                    onChange={e => setNewOwnerAddress(e.target.value)}
                    placeholder="Nhập địa chỉ ví Aptos mới..."
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:border-yellow-400/50 focus:ring-yellow-400/20 font-primary"
                    disabled={transferring}
                  />
                  <button
                    type="submit"
                    className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={transferring || !newOwnerAddress.trim()}
                  >
                    {transferring ? (
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                    ) : (
                      <ArrowRight className="w-5 h-5" />
                    )}
                    Chuyển quyền sở hữu
                  </button>
                  {transferStatus.type && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      transferStatus.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {transferStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      <span>{transferStatus.message}</span>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
