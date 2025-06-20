import React, { useState, useEffect } from "react";
import Navbar from "@/components/ui2/Navbar";
import { Delete, Plus, Save, Upload, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { uploadJSONToIPFS, uploadFileToIPFS } from "@/utils/pinata";
import { useProfile } from '../contexts/ProfileContext';
import { Aptos, AptosConfig, Network, ClientConfig } from "@aptos-labs/ts-sdk";

interface ProfileDataFromChain {
  cid: string;
  cccd: string;
  did: string;
  name: string;
  created_at: number;
}

const MODULE_ADDRESS = "0xabec4e453af5c908c5d7f0b7b59931dd204e2bc5807de364629b4e32eb5fafea";
const MODULE_NAME = "web3_profiles_v29";
const RESOURCE_NAME = "Profiles";


const config = new AptosConfig({ network: Network.TESTNET, clientConfig: { API_KEY: "AG-LA7UZDTNF2T1Y6H1DFA6CNSGVRQSRUKSA" } });
const aptos = new Aptos(config);

export default function Settings() {
  const { account, accountType } = useWallet();
  const { profile: savedProfile, updateProfile } = useProfile();
  const [profile, setProfile] = useState(savedProfile);
  const [newSkill, setNewSkill] = useState("");
  const [imagePreview, setImagePreview] = useState(savedProfile.profilePic);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [cccd, setCccd] = useState("");
  const [isProfileExistInState, setIsProfileExistInState] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [skills, setSkills] = useState<string[]>([]);
  const [cccdInput, setCccdInput] = useState(savedProfile.cccd ? savedProfile.cccd.toString() : "");

  useEffect(() => {
    setProfile(savedProfile);
    setImagePreview(savedProfile.profilePic);
    setCccdInput(savedProfile.cccd ? savedProfile.cccd.toString() : "");

    const checkProfileExistence = async () => {
      if (!account || accountType !== 'aptos') {
        setIsProfileExistInState(false);
        return;
      }
      try {
        const registryResource = await aptos.getAccountResource({
          accountAddress: MODULE_ADDRESS,
          resourceType: `${MODULE_ADDRESS}::${MODULE_NAME}::${RESOURCE_NAME}`,
        });

        if (!registryResource) {
          setIsProfileExistInState(false);
          return;
        }

        const profiles = (registryResource as any)?.profiles;
        if (!profiles?.handle) {
          setIsProfileExistInState(false);
          return;
        }

        const profilesTableHandle = profiles.handle;

        const profileDataFromChain = await aptos.getTableItem({
          handle: profilesTableHandle,
          data: {
            key_type: "address",
            value_type: `${MODULE_ADDRESS}::${MODULE_NAME}::ProfileData`,
            key: account,
          },
        }) as ProfileDataFromChain;

        setIsProfileExistInState(true);
        setCccdInput(profileDataFromChain.cccd ? profileDataFromChain.cccd.toString() : "");
        setCccd(profileDataFromChain.cccd ? profileDataFromChain.cccd.toString() : "");
        setProfile(prev => ({
          ...prev,
          did: profileDataFromChain.did,
          name: profileDataFromChain.name,
        }));
      } catch (error: any) {
        setIsProfileExistInState(false);
        setCccd('');
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
      let profilePicUrl = profile.profilePic;
      if (imageFile) {
        const imageCID = await uploadFileToIPFS(imageFile);
        profilePicUrl = `ipfs://${imageCID}`;
      }
      const profileData = {
        ...profile,
        skills,
        profilePic: profilePicUrl,
        lastUpdated: new Date().toISOString(),
      };

      const cid = await uploadJSONToIPFS(profileData);
      const payload = {
        type: "entry_function_payload",
        function: `${import.meta.env.VITE_MODULE_ADDRESS}::${MODULE_NAME}::${isProfileExistInState ? 'update_profile' : 'register_profile'}`,
        type_arguments: [],
        arguments: isProfileExistInState 
          ? [cid, profile.name] 
          : [`did:aptos:${account}`, cccdInput, cid, profile.name],
      };

      const txnHash = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: txnHash.hash });

      setProfile(prev => ({
        ...prev,
        profile_cid: cid,
        profilePic: profilePicUrl,
      }));

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
                    <input
                      type="text"
                      value={profile.did}
                      readOnly={isProfileExistInState}
                      disabled={isProfileExistInState}
                      className={`w-full border-none outline-none text-xs text-center ${isProfileExistInState ? 'bg-gray-700/50 cursor-not-allowed text-gray-400' : 'bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50'}`}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white font-semibold shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => document.getElementById('profilePicInput')?.click()}
                  disabled={uploading}
                >
                  <Upload size={20} />
                  Đổi ảnh đại diện
                </button>
                <input
                  id="profilePicInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={uploading}
                />
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
                          readOnly={isProfileExistInState}
                          disabled={isProfileExistInState || uploading}
                          className={`w-full px-3 py-2 border rounded-md mt-1 font-primary ${isProfileExistInState ? 'bg-gray-700/50 cursor-not-allowed text-gray-400' : 'bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50'}`}
                        />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1 font-primary">
                        Số CCCD
                        <input
                          type="text"
                          value={cccdInput}
                          maxLength={12}
                          onChange={e => {
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                            setCccdInput(value);
                          }}
                          readOnly={isProfileExistInState}
                          disabled={isProfileExistInState}
                          className={`w-full px-3 py-2 border rounded-md mt-1 font-primary ${isProfileExistInState ? 'bg-gray-700/50 cursor-not-allowed text-gray-400' : 'bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50'}`}
                          placeholder="Nhập số CCCD của bạn"
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
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-white mb-1 font-primary">Kỹ năng</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newSkill}
                          onChange={e => setNewSkill(e.target.value)}
                          placeholder="Nhập kỹ năng mới"
                          className="flex-1 px-3 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 border rounded-md focus:border-blue-500/50 focus:ring-blue-500/20 font-primary"
                          disabled={uploading}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSkill.trim() && !skills.includes(newSkill.trim())) {
                              setSkills([...skills, newSkill.trim()]);
                              setNewSkill('');
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={uploading || !newSkill.trim()}
                        >
                          Thêm
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skills.map(skill => (
                          <span key={skill} className="bg-white/10 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            {skill}
                            <button
                              type="button"
                              onClick={() => setSkills(skills.filter(s => s !== skill))}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                              disabled={uploading}
                            >x</button>
                          </span>
                        ))}
                      </div>
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
                      const txnPayload = {
                        type: 'entry_function_payload',
                        function: `${MODULE_ADDRESS}::${MODULE_NAME}::transfer_ownership`,
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
