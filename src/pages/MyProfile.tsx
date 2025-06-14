import React, { useState, useEffect } from "react";
import Navbar from "@/components/ui2/Navbar";
import { Star, Shield, Tag, CheckCircle2, AlertCircle } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { convertIPFSURL } from "../utils/ipfs";
import { Navigate } from "react-router-dom";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { motion } from "framer-motion";
import { useProfile } from "../contexts/ProfileContext";

const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS;
const MODULE_NAME = "web3_profiles_v10";
const RESOURCE_NAME = "ProfileRegistryV10";

const config = new AptosConfig({ network: Network.TESTNET, clientConfig: { API_KEY: "AG-LA7UZDTNF2T1Y6H1DFA6CNSGVRQSRUKSA" } });
const aptos = new Aptos(config);

const JOBS_CONTRACT_ADDRESS = "0x20c226e275090c4f0854f05b2a6a08a638ecdad2a1c4cfa2014ed6d6e1dc0a66";
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v13";

interface ProfileDataFromChain {
  cid: string;
  cccd: number;
  did: string;
  created_at: number;
}

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
  lens: string;
  skillNFTs: string[];
  gitcoinStamps: number;
  skills: string[];
  portfolio: { name: string; link: string; rating: number }[];
  reviews: { client: string; date: string; comment: string }[];
  lastCID?: string;
  cccd: number;
  createdAt: number;
}

export default function MyProfile() {
  const { account, accountType } = useWallet();
  const { profile: contextProfile, loading: profileLoadingContext, refetchProfile } = useProfile();
  const [profile, setProfile] = useState<Profile>({
    name: "",
    bio: "",
    profilePic: "",
    wallet: "",
    did: "",
    verified: false,
    social: {
      github: "",
      linkedin: "",
      twitter: "",
    },
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
    lens: "",
    skillNFTs: [],
    gitcoinStamps: 0,
    skills: [],
    portfolio: [],
    reviews: [],
    cccd: 0,
    createdAt: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("profile"); // 'profile', 'history', 'myjobs'

  // State cho truy vấn lịch sử theo địa chỉ
  const [queryAddress, setQueryAddress] = useState(""); // Sẽ không còn dùng cho input search
  const [historyResult, setHistoryResult] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1); // Thêm state cho trang hiện tại
  const itemsPerPage = 3; // Số mục mỗi trang
  const [ipfsError, setIpfsError] = useState<string | null>(null);

  // --- Thêm state cho jobs của tôi ---
  const [myJobsLoading, setMyJobsLoading] = useState(false);
  const [myJobsError, setMyJobsError] = useState<string | null>(null);
  const [myJobsCreated, setMyJobsCreated] = useState<any[]>([]);
  const [myJobsApplied, setMyJobsApplied] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!account || accountType !== 'aptos') {
        setLoading(false);
        console.log("MyProfile: No Aptos account connected.");
        return;
      }
      setLoading(true); // Bắt đầu tải cục bộ

      try {
        // Kích hoạt refetch từ ProfileContext để đảm bảo context có dữ liệu mới nhất, bao gồm danh tiếng
        await refetchProfile();

        console.log("MyProfile: Attempting to fetch registry resource from:", MODULE_ADDRESS);
        const registryResource = await aptos.getAccountResource({
          accountAddress: MODULE_ADDRESS,
          resourceType: `${MODULE_ADDRESS}::${MODULE_NAME}::${RESOURCE_NAME}` as `${string}::${string}::${string}`,
        });

        if (!registryResource) {
          console.log("MyProfile: Profile registry resource not found for module.");
          throw new Error("Profile not registered: Resource data missing.");
        }

        console.log("MyProfile: Registry resource found.", registryResource);
        const profiles = (registryResource as any)?.profiles;
        if (!profiles?.handle) {
          console.log("MyProfile: Profiles table handle missing from registry resource.");
          throw new Error("Profile not registered: Profiles table handle missing.");
        }

        const profilesTableHandle = profiles.handle;
        console.log("MyProfile: Profiles table handle:", profilesTableHandle);

        console.log("MyProfile: Attempting to get table item for account:", account);
        const profileDataFromChain = await aptos.getTableItem({
          handle: profilesTableHandle,
          data: {
            key_type: "address",
            value_type: `${MODULE_ADDRESS}::${MODULE_NAME}::ProfileData` as `${string}::${string}::${string}`,
            key: account,
          },
        }) as ProfileDataFromChain;

        console.log("MyProfile: Profile data from chain:", profileDataFromChain);
        const profileCID = profileDataFromChain.cid;
        const cccdData = profileDataFromChain.cccd;
        const didData = profileDataFromChain.did;
        const createdAt = profileDataFromChain.created_at;

        // Sử dụng dữ liệu danh tiếng từ contextProfile
        const reputationToUse = contextProfile?.reputation || {
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
        };

        // Populate basic profile data from chain first
        setProfile(prev => ({
          ...prev,
          cccd: cccdData,
          did: didData,
          wallet: account,
          createdAt: createdAt,
          reputation: reputationToUse, // Sử dụng danh tiếng từ context
        }));

        if (!profileCID) {
          console.log("MyProfile: Profile CID is empty. Cannot fetch from IPFS.");
          setIpfsError("Không có CID. Dữ liệu chi tiết hồ sơ không khả dụng từ IPFS."); // Set a specific IPFS error
        } else {
          try {
            console.log("MyProfile: Fetching profile data from IPFS using CID:", profileCID);
            const url = convertIPFSURL(profileCID);
        const response = await fetch(url);
        const text = await response.text();
        if (!response.ok || text.startsWith("<!DOCTYPE")) {
              console.error(`MyProfile: IPFS fetch failed: ${response.status} - ${text.slice(0, 50)}...`);
              throw new Error(`IPFS fetch failed: ${response.status} - ${text.slice(0, 50)}...`);
        }
        const profileData = JSON.parse(text);
            console.log("MyProfile: Profile data from IPFS:", profileData);
            setProfile(prev => ({
              ...prev,
              ...profileData, // Merge with existing blockchain data
              // Ensure these are from chain, not overwritten by IPFS data if IPFS is outdated
              cccd: cccdData,
              did: didData,
              wallet: account,
              reputation: reputationToUse, // Đảm bảo danh tiếng vẫn từ context sau khi merge IPFS
            }));
            setIpfsError(null); // Clear any previous IPFS errors
            console.log("MyProfile: Profile set successfully (with IPFS data).");
          } catch (ipfsErr: any) {
            console.error("MyProfile: Lỗi khi tải dữ liệu từ IPFS:", ipfsErr);
            setIpfsError(`Đã xảy ra lỗi khi tải dữ liệu chi tiết hồ sơ từ IPFS: ${ipfsErr.message || String(ipfsErr)}. Có thể do lỗi mạng hoặc dữ liệu không còn khả dụng.`);
            console.log("MyProfile: Continuing with blockchain-only profile data due to IPFS error.");
          }
        }
      } catch (err: any) {
        console.error("MyProfile: Lỗi khi tải hồ sơ tổng thể từ blockchain (Resource/TableItem not found):", err);
        if (
          err.toString().includes("Profile not registered") ||
          err.toString().includes("TableItemNotFound") ||
          err.toString().includes("Resource not found") ||
          err.toString().includes("Cannot read properties of undefined") ||
          err.message.includes("CID is empty") // Thêm lỗi CID rỗng
        ) {
          setError("PROFILE_NOT_FOUND");
          console.log("MyProfile: Setting error to PROFILE_NOT_FOUND (blockchain level).");
          return;
        }
        setError("Đã xảy ra lỗi khi tải hồ sơ. Vui lòng thử lại.");
        console.log("MyProfile: Setting generic error.");
      } finally {
        setLoading(false);
        console.log("MyProfile: Loading finished.");
      }
    };
    fetchProfile();
  }, [account, accountType, refetchProfile, contextProfile]);

  // Trigger fetch history when tab changes or account changes
  useEffect(() => {
    if (activeTab === 'history' && account) {
      fetchHistoryByAddress(account);
    }
  }, [activeTab, account]);

  // Hàm truy vấn lịch sử cập nhật hồ sơ theo địa chỉ (dùng endpoint đúng)
  const fetchHistoryByAddress = async (address: string) => {
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryResult([]);
    try {
      const moduleAddress = import.meta.env.VITE_MODULE_ADDRESS;
      
      // Fetch ProfileUpdated events
      console.log(`Fetching ProfileUpdated events for module: ${moduleAddress}`);
      const updateEventsRes = await fetch(
        `https://fullnode.testnet.aptoslabs.com/v1/accounts/${moduleAddress}/events/${moduleAddress}::${MODULE_NAME}::${RESOURCE_NAME}/update_events`
      );
      const updateEvents = await updateEventsRes.json();
      console.log("Raw ProfileUpdated events:", updateEvents);

      // Fetch ProfileOwnershipTransferred events
      console.log(`Fetching ProfileOwnershipTransferred events for module: ${moduleAddress}`);
      const transferEventsRes = await fetch(
        `https://fullnode.testnet.aptoslabs.com/v1/accounts/${moduleAddress}/events/${moduleAddress}::${MODULE_NAME}::${RESOURCE_NAME}/transfer_events`
      );
      const transferEvents = await transferEventsRes.json();
      console.log("Raw ProfileOwnershipTransferred events:", transferEvents);

      let allEvents: any[] = [];

      if (Array.isArray(updateEvents)) {
        // Sort updates by timestamp to identify the first one as registration
        updateEvents.sort((a: any, b: any) => Number(a.data.timestamp_seconds) - Number(b.data.timestamp_seconds));

        const filteredUpdates = updateEvents.filter((e: any) => e.data.user?.toLowerCase() === address.toLowerCase());
        
        filteredUpdates.forEach((e: any, index: number) => {
          if (index === 0) {
            allEvents.push({ ...e, type: 'ProfileRegistered' }); // Mark the first as Registered
          } else {
            allEvents.push({ ...e, type: 'ProfileUpdated' });    // Mark subsequent as Updated
          }
        });
        console.log("Filtered and categorized ProfileUpdated/Registered events for address:", address, allEvents.filter(e => e.type !== 'ProfileOwnershipTransferred'));
      }

      if (Array.isArray(transferEvents)) {
        const filteredTransfers = transferEvents.filter((e: any) => 
          e.data.from?.toLowerCase() === address.toLowerCase() || 
          e.data.to?.toLowerCase() === address.toLowerCase()
        );
        console.log("Filtered ProfileOwnershipTransferred events for address:", address, filteredTransfers);
        allEvents = allEvents.concat(filteredTransfers.map((e: any) => ({ ...e, type: 'ProfileOwnershipTransferred' })));
      }

    
      allEvents.sort((a, b) => Number(b.data.timestamp_seconds) - Number(a.data.timestamp_seconds));

      if (allEvents.length > 0) {
        setHistoryResult(allEvents);
        setCurrentPage(1); 
      } else if (updateEvents.message || transferEvents.message) {
        setHistoryError("Đã xảy ra lỗi khi tải lịch sử. Vui lòng thử lại.");
      } else {
        setHistoryError("Không có lịch sử cập nhật cho địa chỉ này.");
      }

    } catch (err) {
      console.error("Lỗi khi fetch lịch sử:", err);
      setHistoryError("Đã xảy ra lỗi khi tải lịch sử. Vui lòng thử lại.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- Fetch jobs khi vào tab "myjobs" ---
  useEffect(() => {
    if (activeTab === 'myjobs' && account) {
      fetchMyJobs(account);
    }
    // eslint-disable-next-line
  }, [activeTab, account]);

  const fetchMyJobs = async (address: string) => {
    setMyJobsLoading(true);
    setMyJobsError(null);
    setMyJobsCreated([]);
    setMyJobsApplied([]);
    try {
      // 1. Lấy tất cả JobPostedEvent
      const rawPostedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
        options: { limit: 100 }
      });
      // 2. Lấy tất cả WorkerAppliedEvent
      const rawAppliedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerAppliedEvent`,
        options: { limit: 100 }
      });
      // 3. Lấy tất cả WorkerApprovedEvent
      const rawApprovedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerApprovedEvent`,
        options: { limit: 100 }
      });
      // 4. Lấy tất cả JobCompletedEvent
      const rawCompletedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobCompletedEvent`,
        options: { limit: 100 }
      });
      // 5. Lấy tất cả JobCanceledEvent
      const rawCanceledEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobCanceledEvent`,
        options: { limit: 100 }
      });
      // 6. Lấy tất cả JobExpiredEvent
      const rawExpiredEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobExpiredEvent`,
        options: { limit: 100 }
      });
      // Map trạng thái job
      const jobStatusMap = {};
      rawCompletedEvents.forEach(e => { jobStatusMap[e.data.job_id.toString()] = 'Đã hoàn thành'; });
      rawCanceledEvents.forEach(e => { jobStatusMap[e.data.job_id.toString()] = 'Đã hủy'; });
      rawExpiredEvents.forEach(e => { jobStatusMap[e.data.job_id.toString()] = 'Đã hết hạn'; });
      rawApprovedEvents.forEach(e => {
        const id = e.data.job_id.toString();
        if (!jobStatusMap[id]) jobStatusMap[id] = 'Đang thực hiện';
      });
      rawPostedEvents.forEach(e => {
        const id = e.data.job_id.toString();
        if (!jobStatusMap[id]) jobStatusMap[id] = 'Đang tuyển';
      });
      // Lọc job đã tạo
      const jobsCreated = rawPostedEvents.filter(e => e.data.poster.toLowerCase() === address.toLowerCase());
      // Lọc job đã apply
      const jobsApplied = rawAppliedEvents.filter(e => e.data.worker.toLowerCase() === address.toLowerCase());
      // Lọc job đã được nhận (worker)
      const jobsWorked = rawApprovedEvents.filter(e => e.data.worker.toLowerCase() === address.toLowerCase());
      // Lấy thông tin chi tiết job (từ IPFS)
      const getJobInfo = async (event) => {
        try {
          const jobIdStr = event.data.job_id.toString();
          const jobDetailsUrl = convertIPFSURL(event.data.cid);
          const response = await fetch(jobDetailsUrl);
          if (!response.ok) return null;
          const jobData = await response.json();
          // 1. Lấy tất cả event liên quan
          let postedEvents = [];
          let approvedEvents = [];
          let milestoneAcceptedEvents = [];
          let completedEvents = [];
          try {
            postedEvents = await aptos.event.getModuleEventsByEventType({
              eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
              options: { limit: 1000 }
            });
            approvedEvents = await aptos.event.getModuleEventsByEventType({
              eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerApprovedEvent`,
              options: { limit: 1000 }
            });
            milestoneAcceptedEvents = await aptos.event.getModuleEventsByEventType({
              eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::MilestoneAcceptedEvent`,
              options: { limit: 1000 }
            });
            completedEvents = await aptos.event.getModuleEventsByEventType({
              eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobCompletedEvent`,
              options: { limit: 1000 }
            });
          } catch {}
          // 2. Thời gian tạo job
          const postedEvent = postedEvents.find(e => e.data.job_id.toString() === jobIdStr);
          const createdAt = postedEvent ? Number(postedEvent.data.start_time) : null;
          const poster = postedEvent ? postedEvent.data.poster : event.data.poster;
          // 3. Người đã được duyệt (có thể nhiều lần)
          const approvedWorkers = approvedEvents
            .filter(e => e.data.job_id.toString() === jobIdStr)
            .map(e => e.data.worker)
            .filter((v, i, arr) => typeof v === 'string' && arr.indexOf(v) === i);
          // 4. Milestone accepted cuối cùng
          const jobMilestoneAccepted = milestoneAcceptedEvents
            .filter(e => e.data.job_id.toString() === jobIdStr);
          let completedAt: number | null = null;
          let completedBy: string | null = null;
          if (jobMilestoneAccepted.length > 0) {
            // milestone cuối là milestone có index lớn nhất
            const lastAccepted = jobMilestoneAccepted.reduce((a, b) => a.data.milestone > b.data.milestone ? a : b);
            completedAt = Number(lastAccepted.data.accept_time);
            // completedBy là worker đã được duyệt gần nhất trước thời điểm accept_time
            const approvedBefore = approvedEvents
              .filter(e => e.data.job_id.toString() === jobIdStr && Number(e.data.approve_time) <= completedAt)
              .sort((a, b) => Number(b.data.approve_time) - Number(a.data.approve_time));
            completedBy = approvedBefore.length > 0 ? approvedBefore[0].data.worker : null;
          }
          // Nếu không có milestone accepted, lấy từ JobCompletedEvent
          if (!completedAt) {
            const jobCompleted = completedEvents.find(e => e.data.job_id.toString() === jobIdStr);
            if (jobCompleted) {
              completedAt = Number(jobCompleted.data.complete_time);
              // completedBy là worker đã được duyệt gần nhất trước thời điểm complete_time
              const approvedBefore = approvedEvents
                .filter(e => e.data.job_id.toString() === jobIdStr && Number(e.data.approve_time) <= completedAt)
                .sort((a, b) => Number(b.data.approve_time) - Number(a.data.approve_time));
              completedBy = approvedBefore.length > 0 ? approvedBefore[0].data.worker : null;
            }
          }
          // 5. Trạng thái
          let status = 'Đang tuyển';
          if (completedAt && completedBy) status = 'Đã hoàn thành';
          else if (approvedWorkers.length > 0) status = 'Đang thực hiện';
          return {
            id: jobIdStr,
            title: jobData.title || 'Untitled Job',
            status,
            poster,
            worker: completedBy,
            milestones: [],
            completedBy,
            approvedWorkers,
            createdAt,
            completedAt
          };
        } catch (e) {
          console.error('Lỗi khi lấy thông tin job:', e);
          return null;
        }
      };
      // Dự án đã tạo
      const jobsCreatedInfo = await Promise.all(jobsCreated.map(getJobInfo));
      setMyJobsCreated(jobsCreatedInfo.filter(Boolean));
      // Dự án đã apply/làm
      const appliedJobIds = new Set(jobsApplied.map(e => e.data.job_id.toString()));
      jobsWorked.forEach(e => appliedJobIds.add(e.data.job_id.toString()));
      const jobsAppliedOrWorked = rawPostedEvents.filter(e => appliedJobIds.has(e.data.job_id.toString()));
      const jobsAppliedInfo = await Promise.all(jobsAppliedOrWorked.map(getJobInfo));
      setMyJobsApplied(jobsAppliedInfo.filter(Boolean));
    } catch (err: any) {
      setMyJobsError(`Lỗi không xác định: ${err.message || String(err)}`);
    } finally {
      setMyJobsLoading(false);
    }
  };

  // --- Hàm copy địa chỉ ---
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {/* toast có thể thêm nếu muốn */})
      .catch(() => {/* toast có thể thêm nếu muốn */});
  };

  if (loading || profileLoadingContext) { // Kết hợp loading cục bộ và loading từ context
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  if (error) {
    if (error === "PROFILE_NOT_FOUND") {
      return <Navigate to="/settings" replace />;
    }
    return (
      <div className="min-h-screen bg-black text-white flex flex-col  justify-center">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4">
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-white/10 rounded-2xl p-8 shadow-xl max-w-lg w-full text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Không có thông tin hồ sơ trên hệ thống</h2>
            <p className="text-gray-300 mb-6 text-base md:text-lg">Không thể tải dữ liệu hồ sơ từ blockchain.<br/>Vui lòng đăng ký định danh thông tin nếu chưa đăng ký.</p>
            <a
              href="/settings"
              className="inline-block mb-6 px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold shadow transition-all duration-200"
            >
              Đăng ký định danh thông tin ngay
            </a>
            <div className="bg-black/60 border border-white/10 rounded-lg p-3 max-h-40 overflow-auto text-xs text-left text-gray-400 break-words whitespace-pre-wrap">
              <span>Đã xảy ra lỗi. Vui lòng thử lại sau.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="py-16 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black min-h-[80vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold font-heading text-white">Hồ sơ của tôi</h1>
            {error && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                error === 'PROFILE_NOT_FOUND' ? 'bg-red-500/20 text-red-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <AlertCircle size={20} /> 
                <span>{error === 'PROFILE_NOT_FOUND' ? 'Hồ sơ không tồn tại' : 'Đã xảy ra lỗi khi tải hồ sơ. Vui lòng thử lại.'}</span>
              </div>
            )}
          </div>

    
          <div className="flex border-b border-white/10 mb-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === "profile"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white"
              } transition-colors duration-200`}
            >
              Thông tin cá nhân
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === "history"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white"
              } transition-colors duration-200`}
            >
              Lịch sử cập nhật
            </button>
            <button
              onClick={() => setActiveTab("myjobs")}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === "myjobs"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white"
              } transition-colors duration-200`}
            >
              Dự án của tôi
            </button>
          </div>

          {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1">
              <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 w-full mb-8 flex flex-col items-center shadow-xl">
                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-blue-600 to-violet-700 p-1 mb-4">
                  <img
                    src={convertIPFSURL(profile.profilePic)}
                    alt={profile.name}
                    className="w-full h-full rounded-full object-cover border-4 border-black"
                  />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1 text-center font-heading">{profile.name}</h1>
                <p className="text-gray-400 mb-3 text-center font-primary">{profile.bio}</p>
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                  {profile.skills.slice(0, 4).map(skill => (
                    <span
                      key={skill}
                      className="bg-blue-600/20 text-blue-300 rounded-full px-4 py-1 text-sm font-medium mb-1 font-primary"
                    >
                      {skill}
                    </span>
                  ))}
                  {profile.skills.length > 4 && (
                    <span className="bg-white/10 text-gray-300 rounded-full px-4 py-1 text-sm font-medium mb-1 font-primary">+{profile.skills.length - 4} kỹ năng khác</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full mt-2">
                  <span className="inline-flex items-center px-3 py-2 bg-white/10 rounded-lg text-xs text-white w-full justify-center font-primary">
                      Ví: {profile.wallet.slice(0, 6)}...{profile.wallet.slice(-4)}
                  </span>
                  {profile.cccd !== 0 && (
                    <span className="inline-flex items-center px-3 py-2 bg-white/10 rounded-lg text-xs text-white w-full justify-center font-primary">
                      CCCD: {profile.cccd}
                    </span>
                  )}
                    {ipfsError && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs w-full justify-center font-primary break-words break-all">
                        <AlertCircle size={16} />
                        <span>{ipfsError}</span>
                      </div>
                    )}
                </div>
                <div className="flex gap-3 mt-4 justify-center">
                  {profile.social.github && (
                    <a href={profile.social.github} className="text-gray-400 hover:text-blue-400" target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-github text-2xl"></i>
                    </a>
                  )}
                  {profile.social.linkedin && (
                    <a href={profile.social.linkedin} className="text-gray-400 hover:text-blue-400" target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-linkedin text-2xl"></i>
                    </a>
                  )}
                  {profile.social.twitter && (
                    <a href={profile.social.twitter} className="text-gray-400 hover:text-blue-400" target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-twitter text-2xl"></i>
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="col-span-1 md:col-span-2 flex flex-col gap-8">
              <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 w-full">
                <h2 className="text-lg font-semibold mb-4 font-heading text-white">Kỹ năng / Dịch vụ cung cấp</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(skill => (
                    <span
                      key={skill}
                      className="bg-blue-600/20 text-blue-300 rounded-full px-4 py-1 text-sm font-medium mb-1 font-primary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 w-full">
                  <h2 className="text-lg font-semibold mb-4 font-heading text-white">Điểm uy tín</h2>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-bold text-blue-400 font-heading">{profile.reputation.score}</span>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={18}
                            className={i < Math.round(profile.reputation.level) ? "text-blue-400" : "text-gray-700"}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm font-primary">
                      Cấp độ: {profile.reputation.level} ({profile.reputation.metrics?.total_jobs_completed || 0} dự án đã hoàn thành)
                    </span>
                  </div>
                  <div className="space-y-2 mt-4">
                    <h3 className="text-sm font-semibold text-gray-300">Chỉ số danh tiếng:</h3>
                    {profile.reputation.metrics?.total_jobs_completed !== undefined && (
                      <div className="text-sm font-primary text-white/80">
                        Tổng dự án hoàn thành: <span className="font-semibold text-blue-400">{profile.reputation.metrics?.total_jobs_completed}</span>
                      </div>
                    )}
                    {profile.reputation.metrics?.total_jobs_posted !== undefined && (
                      <div className="text-sm font-primary text-white/80">
                        Tổng dự án đã đăng: <span className="font-semibold text-blue-400">{profile.reputation.metrics?.total_jobs_posted}</span>
                      </div>
                    )}
                    {profile.reputation.metrics?.total_amount_transacted !== undefined && (
                      <div className="text-sm font-primary text-white/80">
                        Tổng số tiền giao dịch: <span className="font-semibold text-blue-400">{profile.reputation.metrics?.total_amount_transacted / 100_000_000} APT</span>
                      </div>
                    )}
                    {profile.reputation.metrics?.on_time_delivery_count !== undefined && profile.reputation.metrics?.total_milestones !== undefined && profile.reputation.metrics.total_milestones > 0 && (
                      <div className="text-sm font-primary text-white/80">
                        Tỷ lệ hoàn thành đúng hạn: <span className="font-semibold text-blue-400">{((profile.reputation.metrics.on_time_delivery_count / profile.reputation.metrics.total_milestones) * 100).toFixed(2)}%</span>
                      </div>
                    )}
                    {profile.reputation.metrics?.response_count !== undefined && profile.reputation.metrics?.response_count > 0 && (
                      <div className="text-sm font-primary text-white/80">
                        Thời gian phản hồi trung bình: <span className="font-semibold text-blue-400">{(profile.reputation.metrics.total_response_time / profile.reputation.metrics.response_count / 60).toFixed(2)} phút</span>
                      </div>
                    )}
                    {/* Add more metrics as needed */}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 w-full">
                  <h2 className="text-lg font-semibold mb-4 font-heading text-white">Chứng chỉ Web3</h2>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <Shield className="text-blue-400" />
                      <span>
                        <span className="font-medium font-primary text-white">DID đã xác thực</span>
                        <br />
                          <span className="text-xs text-gray-400 font-primary break-all">{profile.did}</span>
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Tag className="text-blue-400" />
                      <span>
                        <span className="font-medium font-primary text-white">Xác thực Lens Protocol</span>
                        <br />
                        <span className="text-xs text-gray-400 font-primary">{profile.lens}</span>
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Star className="text-blue-400" />
                      <span>
                        <span className="font-medium font-primary text-white">Skill NFTs</span>
                        <br />
                        <span className="text-xs text-gray-400 font-primary">
                          {profile.skillNFTs.length} kỹ năng đã xác thực
                        </span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 w-full">
                <h2 className="text-lg font-semibold mb-4 font-heading text-white">Dự án nổi bật</h2>
                <ul className="space-y-2">
                  {profile.portfolio.map((proj) => (
                    <li key={proj.name} className="flex items-center gap-3">
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 font-medium hover:underline font-primary"
                      >
                        {proj.name}
                      </a>
                      <Star className="text-blue-400" size={16} />
                      <span className="font-semibold text-gray-300 font-primary">{proj.rating}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 w-full">
                <h2 className="text-lg font-semibold mb-4 font-heading text-white">Đánh giá</h2>
                <ul className="divide-y divide-white/10">
                  {profile.reviews.map((review, idx) => (
                    <li key={idx} className="py-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold font-primary text-white/90">{review.client}</span>
                        <span className="text-xs text-gray-400 font-primary">{review.date}</span>
                      </div>
                      <p className="text-gray-300 mt-1 font-primary">"{review.comment}"</p>
                    </li>
                  ))}
                </ul>
              </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 w-full shadow-xl"
            >
              <h2 className="text-2xl font-bold mb-6 font-heading text-white text-center">Lịch sử cập nhật và chuyển quyền</h2>
              
              {historyLoading && (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
                  <span className="ml-4 text-blue-400">Đang truy vấn lịch sử...</span>
                </div>
              )}
              {historyError && (
                <div className="text-red-400 mb-2 text-center py-10">{historyError}</div>
              )}
              {!historyLoading && !historyError && historyResult.length > 0 && (
                <div className="bg-white/5 rounded p-3">
                  <ul className="divide-y divide-gray-700">
                    {historyResult.slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    ).map((item, idx) => (
                      <li key={item.guid?.creation_number + '-' + item.sequence_number || idx} className="py-4 px-3 hover:bg-white/10 transition-colors duration-200 rounded-md">
                        {item.type === 'ProfileRegistered' ? (
                          <>
                            <div className="flex items-center gap-2 mb-1"><b>Loại sự kiện:</b> <span className="text-blue-400 font-semibold">Đăng ký hồ sơ</span></div>
                            <div className="text-sm text-gray-300"><b>Thời gian:</b> {new Date(Number(item.data.timestamp_seconds) * 1000).toLocaleString()}</div>
                            <div className="text-sm text-gray-300"><b>Người dùng:</b> <span className="break-all text-gray-400">{item.data.user}</span></div>
                            <div className="text-sm text-gray-300"><b>CID mới:</b> <span className="break-all text-gray-400">{item.data.cid}</span></div>
                            <div className="text-sm text-gray-300"><b>CCCD mới:</b> <span className="break-all text-gray-400">{item.data.cccd}</span></div>
                            <div className="text-sm text-gray-300"><b>DID mới:</b> <span className="break-all text-gray-400">{item.data.did}</span></div>
                          </>
                        ) : item.type === 'ProfileUpdated' ? (
                          <>
                            <div className="flex items-center gap-2 mb-1"><b>Loại sự kiện:</b> <span className="text-blue-400 font-semibold">Cập nhật hồ sơ</span></div>
                            <div className="text-sm text-gray-300"><b>Thời gian:</b> {new Date(Number(item.data.timestamp_seconds) * 1000).toLocaleString()}</div>
                            <div className="text-sm text-gray-300"><b>Người dùng:</b> <span className="break-all text-gray-400">{item.data.user}</span></div>
                            <div className="text-sm text-gray-300"><b>CID mới:</b> <span className="break-all text-gray-400">{item.data.cid}</span></div>
                            <div className="text-sm text-gray-300"><b>CCCD mới:</b> <span className="break-all text-gray-400">{item.data.cccd}</span></div>
                            <div className="text-sm text-gray-300"><b>DID mới:</b> <span className="break-all text-gray-400">{item.data.did}</span></div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-1"><b>Loại sự kiện:</b> <span className="text-yellow-400 font-semibold">Chuyển quyền sở hữu</span></div>
                            <div className="text-sm text-gray-300"><b>Thời gian:</b> {new Date(Number(item.data.timestamp_seconds) * 1000).toLocaleString()}</div>
                            <div className="text-sm text-gray-300"><b>Từ:</b> <span className="break-all text-gray-400">{item.data.from}</span></div>
                            <div className="text-sm text-gray-300"><b>Đến:</b> <span className="break-all text-gray-400">{item.data.to}</span></div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  {historyResult.length > itemsPerPage && (
                    <div className="flex justify-center items-center mt-6 gap-4">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Trang trước
                      </button>
                      <span className="text-gray-300">Trang {currentPage} / {Math.ceil(historyResult.length / itemsPerPage)}</span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(historyResult.length / itemsPerPage), prev + 1))}
                        disabled={currentPage === Math.ceil(historyResult.length / itemsPerPage)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Trang sau
                      </button>
            </div>
                  )}
          </div>
              )}
              {!historyLoading && !historyError && historyResult.length === 0 && (
                <div className="text-gray-400 mt-2 text-center py-10">Không có lịch sử cập nhật cho địa chỉ này.</div>
              )}
            </motion.div>
          )}

          {activeTab === "myjobs" && (
            <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 w-full shadow-xl">
              <h2 className="text-2xl font-bold mb-6 font-heading text-white text-center">Dự án của tôi</h2>
              {myJobsLoading && (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
                  <span className="ml-4 text-blue-400">Đang truy vấn dự án...</span>
                </div>
              )}
              {myJobsError && (
                <div className="text-red-400 mb-2 text-center py-10">{myJobsError}</div>
              )}
              {!myJobsLoading && !myJobsError && (
                <>
                  {myJobsCreated.length > 0 && (
                    <div className="mb-8">
                      <h3 className="font-bold text-white mb-2">Dự án đã tạo</h3>
                      <ul className="space-y-4">
                        {myJobsCreated.map(job => (
                          <li key={job.id} className="bg-gray-800/50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-white font-medium">{job.title}</span>
                              <span className="text-xs px-2 py-1 rounded bg-blue-700/30 text-blue-300">{job.status}</span>
                            </div>
                            <div className="text-sm text-gray-400 space-y-1">
                              <div><b>Thời gian tạo:</b> {job.createdAt ? new Date(job.createdAt * 1000).toLocaleString() : '-'}</div>
                              <div><b>Thời gian hoàn thành:</b> {job.completedAt ? new Date(job.completedAt * 1000).toLocaleString() : '-'}</div>
                              <div><b>Người đăng:</b> {typeof job.poster === 'string' && job.poster ? (
                                <span className="inline-flex items-center gap-1">
                                  {job.poster.slice(0, 6)}...{job.poster.slice(-4)}
                                  <button onClick={() => handleCopy(job.poster)} className="text-gray-400 hover:text-blue-400" title="Copy"><CheckCircle2 size={12} /></button>
                                </span>
                              ) : '-'}</div>
                              <div><b>Người đã được duyệt:</b> {job.approvedWorkers && job.approvedWorkers.length > 0 ? job.approvedWorkers.map((addr, idx) => (
                                <span key={addr} className="inline-flex items-center gap-1 mr-2">
                                  {addr.slice(0, 6)}...{addr.slice(-4)}
                                  <button onClick={() => handleCopy(addr)} className="text-gray-400 hover:text-blue-400" title="Copy"><CheckCircle2 size={12} /></button>
                                  {idx < job.approvedWorkers.length - 1 ? ',' : null}
                                </span>
                              )) : '-'}</div>
                              <div><b>Người hoàn thành cột mốc cuối:</b> {typeof job.completedBy === 'string' && job.completedBy ? (
                                <span className="inline-flex items-center gap-1">
                                  {job.completedBy.slice(0, 6)}...{job.completedBy.slice(-4)}
                                  <button onClick={() => handleCopy(job.completedBy)} className="text-gray-400 hover:text-blue-400" title="Copy"><CheckCircle2 size={12} /></button>
                                </span>
                              ) : '-'}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {myJobsApplied.length > 0 && (
                    <div className="mb-8">
                      <h3 className="font-bold text-white mb-2">Dự án đã ứng tuyển/đã làm</h3>
                      <ul className="space-y-4">
                        {myJobsApplied.map(job => (
                          <li key={job.id} className="bg-gray-800/50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-white font-medium">{job.title}</span>
                              <span className="text-xs px-2 py-1 rounded bg-green-700/30 text-green-300">{job.status}</span>
                            </div>
                            <div className="text-sm text-gray-400 space-y-1">
                              <div><b>Thời gian tạo:</b> {job.createdAt ? new Date(job.createdAt * 1000).toLocaleString() : '-'}</div>
                              <div><b>Thời gian hoàn thành:</b> {job.completedAt ? new Date(job.completedAt * 1000).toLocaleString() : '-'}</div>
                              <div><b>Người đăng:</b> {typeof job.poster === 'string' && job.poster ? (
                                <span className="inline-flex items-center gap-1">
                                  {job.poster.slice(0, 6)}...{job.poster.slice(-4)}
                                  <button onClick={() => handleCopy(job.poster)} className="text-gray-400 hover:text-blue-400" title="Copy"><CheckCircle2 size={12} /></button>
                                </span>
                              ) : '-'}</div>
                              <div><b>Người đã được duyệt:</b> {job.approvedWorkers && job.approvedWorkers.length > 0 ? job.approvedWorkers.map((addr, idx) => (
                                <span key={addr} className="inline-flex items-center gap-1 mr-2">
                                  {addr.slice(0, 6)}...{addr.slice(-4)}
                                  <button onClick={() => handleCopy(addr)} className="text-gray-400 hover:text-blue-400" title="Copy"><CheckCircle2 size={12} /></button>
                                  {idx < job.approvedWorkers.length - 1 ? ',' : null}
                                </span>
                              )) : '-'}</div>
                              <div><b>Người hoàn thành cột mốc cuối:</b> {typeof job.completedBy === 'string' && job.completedBy ? (
                                <span className="inline-flex items-center gap-1">
                                  {job.completedBy.slice(0, 6)}...{job.completedBy.slice(-4)}
                                  <button onClick={() => handleCopy(job.completedBy)} className="text-gray-400 hover:text-blue-400" title="Copy"><CheckCircle2 size={12} /></button>
                                </span>
                              ) : '-'}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {myJobsCreated.length === 0 && myJobsApplied.length === 0 && (
                    <div className="text-gray-400 mt-2 text-center py-10">Bạn chưa có dự án nào liên quan.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
