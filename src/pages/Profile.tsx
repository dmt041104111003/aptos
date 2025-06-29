import Navbar from "@/components/ui2/Navbar";
import Footer from "@/components/ui2/Footer";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, CheckIcon, Copy, AlertCircle, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { aptos } from "@/utils/aptosUtils";
import { useWallet } from "../context/WalletContext";

const MODULE_ADDRESS = "0x89adff5f04a2fb054a9d4765f54bb87465c9b0212e8f19326e6df4c5150bbcaf";
const MODULE_NAME = "web3_profiles_v29";
const RESOURCE_NAME = "Profiles";

interface ProfileDataFromChain {
  name: string;
  cid: string;
  cccd: string;
  did: string;
  created_at: number;
  face_verified?: boolean;
  distance?: number;
  is_real?: boolean;
  processing_time?: number;
  verify_message?: string;
  bio?: string;
  profilePic?: string;
}

export default function Profile() {
  const { account } = useWallet();
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<ProfileDataFromChain | null>(null);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const { address } = useParams();

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!address) return;
      try {
        const registryResource = await aptos.getAccountResource({
          accountAddress: MODULE_ADDRESS,
          resourceType: `${MODULE_ADDRESS}::${MODULE_NAME}::${RESOURCE_NAME}`,
        });
        if (!registryResource) return;
        const profiles = registryResource.profiles;
        if (!profiles?.handle) return;
        const profileDataFromChain = await aptos.getTableItem({
          handle: profiles.handle,
          data: {
            key_type: "address",
            value_type: `${MODULE_ADDRESS}::${MODULE_NAME}::ProfileData`,
            key: address,
          },
        });
        setProfile(profileDataFromChain as ProfileDataFromChain);
      } catch (err) {
        setProfile(null);
      }
    };
    fetchProfile();

    // Fetch trust_score from contract
    const fetchTrustScore = async () => {
      if (!address) return;
      try {
        const result = await aptos.view({
          payload: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_trust_score_by_address`,
            functionArguments: [address],
          },
        });
        setTrustScore(Number(result[0]));
      } catch (err) {
        setTrustScore(null);
      }
    };
    fetchTrustScore();
  }, [address]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white">
      <Navbar />
      <div className="w-full flex justify-center">
        <div className="max-w-6xl w-full flex flex-col md:flex-row gap-10 py-12 px-4">
          {/* Sidebar trái */}
          <div className="md:w-1/3 w-full bg-gray-900/80 rounded-2xl p-10 flex flex-col items-center shadow-2xl min-w-[320px] max-w-md mx-auto">
            <img
              src={profile?.profilePic || "/logo/logo.png"}
              alt="Avatar"
              className="w-44 h-44 rounded-full border-4 border-blue-500 shadow mb-6 object-cover"
            />
            <h2 className="text-3xl font-bold mb-3 text-center break-words max-w-full">{profile?.name || "(Chưa cập nhật tên)"}</h2>
            {profile?.face_verified ? (
              <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-semibold shadow mb-3">
                <CheckIcon className="w-5 h-5" /> ĐÃ XÁC THỰC KHUÔN MẶT
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-red-500 text-white text-sm font-semibold shadow mb-3">
                <AlertCircle className="w-5 h-5" /> CHƯA XÁC THỰC KHUÔN MẶT
              </span>
            )}
            {/* Điểm uy tín */}
            <div className="w-full mt-6">
              <span className="font-semibold text-base text-gray-200 mb-2 block">Điểm uy tín</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-blue-400">
                  {trustScore !== null ? trustScore : 0}
                </span>
                <span className="text-xl text-gray-400">/ 100</span>
              </div>
              <div className="w-full h-4 bg-gray-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-500"
                  style={{ width: `${Math.min(trustScore ?? 0, 100)}%` }}
                ></div>
              </div>
              {trustScore !== null && trustScore >= 80 && (
                <span className="mt-3 inline-block px-4 py-2 rounded-full bg-green-500 text-white text-xs font-semibold shadow">
                  Uy tín cao
                </span>
              )}
              {trustScore !== null && trustScore < 50 && (
                <span className="mt-3 inline-block px-4 py-2 rounded-full bg-yellow-500 text-white text-xs font-semibold shadow">
                  Cần cải thiện
                </span>
              )}
            </div>
            {/* Thông tin liên hệ */}
            <div className="w-full mt-10 space-y-3 text-base text-gray-300">
              <div className="flex items-center gap-2 break-all">
                <Mail className="w-5 h-5" /> Email: <span className="text-white">(chưa cập nhật)</span>
              </div>
              <div className="flex items-center gap-2 break-all">
                <Phone className="w-5 h-5" /> Số điện thoại: <span className="text-white">(chưa cập nhật)</span>
              </div>
              <div className="flex items-center gap-2 break-all">
                Ví: <span className="text-blue-400 font-mono">{address?.toString().slice(0, 12)}...{address?.toString().slice(-6)}</span>
                <button onClick={handleCopy} title="Sao chép địa chỉ">
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
          {/* Main phải */}
          <div className="flex-1 w-full space-y-10 min-w-[320px] max-w-2xl mx-auto">
            <div className="bg-gray-900/80 rounded-2xl p-10 shadow-2xl">
              <h3 className="text-2xl font-semibold mb-6 text-blue-400">Giới thiệu bản thân</h3>
              <p className="text-gray-200 text-lg min-h-[60px] break-words">{profile?.bio || "(Chưa cập nhật)"}</p>
              {profile?.verify_message && (
                <div className="mt-6 text-base text-blue-300 italic break-words">{profile.verify_message}</div>
              )}
            </div>
            <div className="bg-gray-900/80 rounded-2xl p-10 shadow-2xl">
              <h3 className="text-2xl font-semibold mb-6 text-blue-400">Thông tin blockchain</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-200">
                <div className="break-all"><span className="font-semibold">DID:</span> {profile?.did || "(chưa có)"}</div>
                <div className="break-all"><span className="font-semibold">Số CCCD:</span> {profile?.cccd || "(chưa có)"}</div>
                <div><span className="font-semibold">Ngày tạo:</span> {profile?.created_at ? new Date(Number(profile.created_at) * 1000).toLocaleDateString() : "(chưa có)"}</div>
                <div className="break-all"><span className="font-semibold">CID:</span> <span className="font-mono text-xs">{profile?.cid || "(chưa có)"}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
