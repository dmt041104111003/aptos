import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { convertIPFSURL } from '@/utils/ipfs';
import { useWallet } from '../context/WalletContext';
import { useProfile } from '../contexts/ProfileContext';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Briefcase,
  Star,
  CheckCircle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Zap,
  Globe,
  Building,
  RefreshCw,
  Info,
  AlertCircle,
  Copy
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';
import { aptos, aptosConfig, fetchProfileDetails, ProfileDataFromChain } from '@/utils/aptosUtils';
import { Aptos, AptosConfig, Network, ClientConfig } from "@aptos-labs/ts-sdk";

declare global { interface Window { ethereum?: any } }

const CONTRACT_ADDRESS = "0x20c226e275090c4f0854f05b2a6a08a638ecdad2a1c4cfa2014ed6d6e1dc0a66";
const MODULE_ADDRESS = "0x20c226e275090c4f0854f05b2a6a08a638ecdad2a1c4cfa2014ed6d6e1dc0a66";
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v12";
const PROFILE_MODULE_NAME = "web3_profiles_v9";
const PROFILE_RESOURCE_NAME = "ProfileRegistryV9";

export interface JobPost {
  id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  budget: { min: number; max: number; currency: string };
  duration: string;
  location: "remote" | "onsite" | "hybrid";
  immediate: boolean;
  experience: string;
  attachments: string[];
  poster: string;
  posterProfile: string; // CID of poster's profile on IPFS
  postedAt: string; // ISO string of when the job was posted (from event.start_time)
  initialFundAmount: number; // Funds escrowed for the job
  client: {
    id: string;
    name: string;
    avatar: string;
  };
  // Fields directly from the Move contract's Job struct
  start_time: number; // u64
  end_time: number; // u64
  milestones: number[]; // vector<u64> - amounts for each milestone
  duration_per_milestone: number[]; // vector<u64> - duration in seconds for each milestone
  worker: string | null; // Option<address>
  approved: boolean;
  active: boolean;
  current_milestone: number; // u64
  milestone_states: { [key: number]: { submitted: boolean; accepted: boolean; submit_time: number; reject_count: number } }; // table<u64, MilestoneData>
  submit_time: number | null; // Option<u64>
  escrowed_amount: number; // u64
  applications: { worker: string; apply_time: number; did: string; profile_cid: string; workerProfileName: string; workerProfileAvatar: string }[]; // vector<Application>
  approve_time: number | null; // Option<u64>
  poster_did: string; // DID of the job poster
  poster_profile_cid: string; // CID of the job poster's profile (from contract)
  completed: boolean;
  rejected_count: number; // u8
  job_expired: boolean;
  auto_confirmed: boolean[]; // vector<bool>
  milestone_deadlines: number[]; // vector<u64>
  application_deadline: number; // u64
  selected_application_index: number | null; // Option<u64>
  last_reject_time: number | null; // Option<u64>
}

const Jobs = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const navigate = useNavigate();
  
  const heroRef = useRef(null);
  const jobsRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const jobsInView = useInView(jobsRef, { once: true });
  const controls = useAnimation();

  const [profileAddress, setProfileAddress] = useState("");
  const [profileResult, setProfileResult] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showAptosLookup, setShowAptosLookup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const [historyResult, setHistoryResult] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const { account, accountType } = useWallet();
  const { profile } = useProfile();

  // Thêm state lưu thông tin hồ sơ tra cứu
  const [queriedProfile, setQueriedProfile] = useState<{
    name: string;
    avatar: string;
    did: string;
    profile_cid: string;
    reputation_score?: number;
    reputation_level?: number;
    reputation_metrics?: {
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
  } | null>(null);

  // State cho dự án đã tạo và đã apply/làm khi tra cứu hồ sơ
  const [profileJobsCreated, setProfileJobsCreated] = useState<{
    id: string;
    title: string;
    status: string;
    poster: string;
    worker: string | null;
    milestones: {
      index: number;
      amount: number;
      status: string;
      completedAt?: number;
    }[];
    completedBy?: string | null;
    approvedWorkers?: string[];
    createdAt?: number;
    completedAt?: number | null;
  }[]>([]);

  const [profileJobsApplied, setProfileJobsApplied] = useState<{
    id: string;
    title: string;
    status: string;
    poster: string;
    worker: string | null;
    milestones: {
      index: number;
      amount: number;
      status: string;
      completedAt?: number;
    }[];
    completedBy?: string | null;
    approvedWorkers?: string[];
    createdAt?: number;
    completedAt?: number | null;
  }[]>([]);

  useEffect(() => {
    let filtered = jobs;
    
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(job => job.category === categoryFilter);
    }
    
    if (locationFilter !== 'all') {
      filtered = filtered.filter(job => job.location === locationFilter);
    }
    
    setFilteredJobs(filtered);
  }, [jobs, searchTerm, categoryFilter, locationFilter]);
  
  useEffect(() => {
    if (heroInView) {
      controls.start('visible');
    }
  }, [controls, heroInView]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const eventsResource = await aptos.getAccountResource({
        accountAddress: CONTRACT_ADDRESS,
        resourceType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Events`,
      });

      if (!eventsResource || !(eventsResource as any).post_event?.guid?.id) {
        console.warn("JobPostedEvent handle not found or marketplace not initialized.");
        setLoading(false);
        return;
      }

      const postEventHandle = (eventsResource as any).post_event;

      const rawEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
        options: {
          limit: 50, // Fetch a reasonable number of recent events
          orderBy: [{ transaction_version: "desc" }] // Fetch newest events first
        }
      });

      console.log("Fetched raw JobPostedEvents", rawEvents);

      const fetchedJobs: JobPost[] = [];
      const uniquePosterAddresses = new Set<string>();

      for (const event of rawEvents) {
        uniquePosterAddresses.add(event.data.poster);
      }

      const profileDetailsMap = new Map<string, { name: string; avatar: string }>();
      const fetchProfilePromises = Array.from(uniquePosterAddresses).map(async (address) => {
        const profile = await fetchProfileDetails(address);
        profileDetailsMap.set(address, profile);
      });
      await Promise.all(fetchProfilePromises);

      for (const event of rawEvents) {
        const eventData = event.data as any; // JobPostedEvent data from blockchain
        const jobCid = eventData.cid; // CID pointing to job details on IPFS

        if (jobCid) {
          try {
            const jobDetailsUrl = convertIPFSURL(jobCid);
            const response = await fetch(jobDetailsUrl);
            
            const contentType = response.headers.get('content-type');
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`IPFS fetch failed for CID ${jobCid}. Status: ${response.status}. Response text: ${errorText.slice(0, 500)}`);
              continue; // Skip this job if HTTP response is not OK
            }

            if (!contentType || !contentType.includes('application/json')) {
              const errorText = await response.text();
              console.warn(`IPFS response for CID ${jobCid} is not JSON. Content-Type: ${contentType}. Response text: ${errorText.slice(0, 500)}`);
              continue; // Skip if content type is not JSON
            }

            let jobDataFromIPFS: any;
            try {
              jobDataFromIPFS = await response.json(); // Attempt to parse JSON
            } catch (jsonError) {
              const errorText = await response.text();
              console.error(`Failed to parse JSON for CID ${jobCid}. Error: ${jsonError}. Raw response: ${errorText.slice(0, 500)}`);
              continue; // Skip if JSON parsing fails
            }

            // Use pre-fetched poster profile data
            const posterProfile = profileDetailsMap.get(eventData.poster) || { name: "Client", avatar: "" };

            // Construct jobPost object, ensuring all fields from JobPost interface are populated
            const jobPost: JobPost = {
              id: eventData.job_id.toString(),
              title: jobDataFromIPFS.title || "Untitled Job",
              description: jobDataFromIPFS.description || "No description provided.",
              category: jobDataFromIPFS.category || "Uncategorized",
              skills: jobDataFromIPFS.skills || [],
              budget: {
                min: jobDataFromIPFS.budgetMin || 0,
                max: jobDataFromIPFS.budgetMax || 0,
                currency: "USDC" // Assuming USDC
              },
              duration: jobDataFromIPFS.duration || "Flexible",
              location: jobDataFromIPFS.location || "remote",
              immediate: jobDataFromIPFS.immediate || false,
              experience: jobDataFromIPFS.experience || "Any",
              attachments: jobDataFromIPFS.attachments || [],
              poster: eventData.poster,
              posterProfile: jobDataFromIPFS.posterProfile || "",
              postedAt: new Date(Number(eventData.start_time) * 1000).toISOString(),
              initialFundAmount: jobDataFromIPFS.initialFundAmount || 0,
              poster_did: jobDataFromIPFS.posterDid || "", // Corrected from posterDid
              client: {
                id: eventData.poster,
                name: posterProfile.name,
                avatar: posterProfile.avatar
              },
              start_time: Number(eventData.start_time),
              end_time: Number(eventData.end_time || 0),
              milestones: eventData.milestones ? eventData.milestones.map(Number) : [],
              duration_per_milestone: eventData.duration_per_milestone ? eventData.duration_per_milestone.map(Number) : [],
              worker: eventData.worker || null,
              approved: eventData.approved || false,
              active: eventData.active || false,
              current_milestone: Number(eventData.current_milestone || 0),
              milestone_states: eventData.milestone_states?.data ? 
                Object.fromEntries(
                  Object.entries(eventData.milestone_states.data).map(([key, value]: [string, any]) => [
                    Number(key),
                    {
                      submitted: value.submitted || false,
                      accepted: value.accepted || false,
                      submit_time: Number(value.submit_time || 0),
                      reject_count: Number(value.reject_count || 0),
                    },
                  ])
                ) : {},
              submit_time: eventData.submit_time ? Number(eventData.submit_time) : null,
              escrowed_amount: Number(eventData.escrowed_amount || 0),
              applications: eventData.applications ? eventData.applications.map((app: any) => ({
                worker: app.worker,
                apply_time: Number(app.apply_time),
                did: app.did,
                profile_cid: app.profile_cid,
                workerProfileName: app.workerProfileName || "",
                workerProfileAvatar: app.workerProfileAvatar || "",
              })) : [],
              approve_time: eventData.approve_time ? Number(eventData.approve_time) : null,
              poster_profile_cid: eventData.poster_profile_cid || "",
              completed: eventData.completed || false,
              rejected_count: Number(eventData.rejected_count || 0),
              job_expired: eventData.job_expired || false,
              auto_confirmed: eventData.auto_confirmed || [],
              milestone_deadlines: eventData.milestone_deadlines ? eventData.milestone_deadlines.map(Number) : [],
              application_deadline: Number(eventData.application_deadline || 0),
              selected_application_index: eventData.selected_application_index ? Number(eventData.selected_application_index) : null,
              last_reject_time: eventData.last_reject_time ? Number(eventData.last_reject_time) : null,
            };
            fetchedJobs.push(jobPost);

          } catch (ipfsError) {
            console.error(`Error processing job from IPFS CID ${jobCid}:`, ipfsError);
          }
        }
      }

      setJobs(fetchedJobs);
      setFilteredJobs(fetchedJobs); // Keep filteredJobs in sync initially
      setLoading(false);

    } catch (error) {
      console.error("Failed to load jobs:", error);
      setLoading(false);
      toast.error("Failed to load jobs. Please try again later.");
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);
  
  const handleApplyToJob = (job: JobPost) => {
    setSelectedJob(job);
    setApplyDialogOpen(true);
  };
  
  const handleSendApplication = async () => {
    if (!selectedJob) {
      toast.error('Không tìm thấy thông tin dự án.');
      return;
    }

    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để ứng tuyển.');
      return;
    }

    if (!profile || !profile.did || !profile.lastCID) {
      toast.error('Vui lòng hoàn tất hồ sơ của bạn trên trang Cài đặt trước khi ứng tuyển.');
      return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::apply_for_job`,
        type_arguments: [],
        arguments: [
          selectedJob.id, // job_id: u64
          profile.did, // worker_did: String
          profile.lastCID // worker_profile_cid: String
        ]
      });

      await aptos.waitForTransaction({
        transactionHash: transaction.hash,
      });

      toast.success('Đơn ứng tuyển của bạn đã được gửi thành công!');
    setApplyDialogOpen(false);
      loadJobs(); // Re-load jobs to reflect changes

      // No navigation needed as per new requirements, just update state/UI
    } catch (error: any) {
      console.error('Ứng tuyển thất bại:', error);
      toast.error(`Ứng tuyển thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };
  
  const getLocationIcon = (location: string) => {
    switch(location) {
      case 'remote': return <Globe className="w-4 h-4" />;
      case 'onsite': return <Building className="w-4 h-4" />;
      case 'hybrid': return <RefreshCw className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };
  
  const formatPostedTime = (postedAt: string) => {
    const now = new Date();
    const posted = new Date(postedAt);
    const diffHours = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Vừa đăng';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  const categories = [
    { value: 'all', label: 'Tất cả' },
    { value: 'web-development', label: 'Web Development' },
    { value: 'mobile-development', label: 'Mobile Development' },
    { value: 'design', label: 'Design' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'writing', label: 'Content Writing' },
    { value: 'blockchain', label: 'Blockchain' },
  ];

  const locations = [
    { value: 'all', label: 'Tất cả' },
    { value: 'remote', label: 'Remote' },
    { value: 'onsite', label: 'On-site' },
    { value: 'hybrid', label: 'Hybrid' },
  ];

  const handleQueryProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    setProfileResult(null);
    setHistoryResult([]);
    setHistoryError(null);
    setCurrentPage(1);
    setProfileJobsCreated([]);
    setProfileJobsApplied([]);
    setQueriedProfile(null);

    if (!profileAddress.trim()) {
      setProfileError("Vui lòng nhập địa chỉ ví Aptos để tra cứu.");
      setProfileLoading(false);
      return;
    }

    try {
      // Lấy thông tin hồ sơ (nếu có)
      const profileInfo = await fetchProfileDetails(profileAddress);
      
      // Lấy dữ liệu danh tiếng (reputation)
      let reputationScore = 0;
      let reputationLevel = 0;
      let reputationMetrics = {
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
      };

      try {
        console.log("Jobs: Fetching UserReputation resource for account:", profileAddress);
        const userReputationResource = await aptos.getAccountResource({
          accountAddress: profileAddress,
          resourceType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::UserReputation`,
        });
        
        if (userReputationResource) {
          console.log("Jobs: UserReputation resource found:", userReputationResource);
          reputationScore = Number((userReputationResource as any).reputation_score);
          reputationLevel = Number((userReputationResource as any).reputation_level);
          reputationMetrics = {
            total_jobs_completed: Number((userReputationResource as any).metrics.total_jobs_completed),
            total_jobs_cancelled: Number((userReputationResource as any).metrics.total_jobs_cancelled),
            total_amount_transacted: Number((userReputationResource as any).metrics.total_amount_transacted),
            last_activity_time: Number((userReputationResource as any).metrics.last_activity_time),
            total_milestones_completed: Number((userReputationResource as any).metrics.total_milestones_completed),
            total_milestones_rejected: Number((userReputationResource as any).metrics.total_milestones_rejected),
            on_time_delivery_count: Number((userReputationResource as any).metrics.on_time_delivery_count),
            total_milestones: Number((userReputationResource as any).metrics.total_milestones),
            total_jobs_posted: Number((userReputationResource as any).metrics.total_jobs_posted),
            total_milestones_accepted: Number((userReputationResource as any).metrics.total_milestones_accepted),
            total_milestones_rejected_by_client: Number((userReputationResource as any).metrics.total_milestones_rejected_by_client),
            total_response_time: Number((userReputationResource as any).metrics.total_response_time),
            response_count: Number((userReputationResource as any).metrics.response_count),
          };
        } else {
          console.log("Jobs: UserReputation resource not found for this account.");
        }
      } catch (repError: any) {
        console.warn("Jobs: Error fetching UserReputation resource:", repError);
        // Continue without reputation data if there's an error
      }

      setQueriedProfile({
        ...profileInfo,
        reputation_score: reputationScore,
        reputation_level: reputationLevel,
        reputation_metrics: reputationMetrics,
      });

      // Kiểm tra có hồ sơ không bằng cách check did/profile_cid
      const hasProfile = !!profileInfo.did && !!profileInfo.profile_cid;
      setProfileResult(hasProfile ? "Đã đăng ký hồ sơ" : "Chưa có hồ sơ");

      // Lấy lịch sử cập nhật/chuyển quyền
      const moduleAddress = MODULE_ADDRESS;
        const updateEventsRes = await fetch(
          `https://fullnode.testnet.aptoslabs.com/v1/accounts/${moduleAddress}/events/${moduleAddress}::${PROFILE_MODULE_NAME}::${PROFILE_RESOURCE_NAME}/update_events`
        );
        const updateEvents = await updateEventsRes.json();
        const transferEventsRes = await fetch(
          `https://fullnode.testnet.aptoslabs.com/v1/accounts/${moduleAddress}/events/${moduleAddress}::${PROFILE_MODULE_NAME}::${PROFILE_RESOURCE_NAME}/transfer_events`
        );
        const transferEvents = await transferEventsRes.json();
        let allEvents: any[] = [];
        if (Array.isArray(updateEvents)) {
        updateEvents.sort((a: any, b: any) => Number(a.data.timestamp_seconds) - Number(b.data.timestamp_seconds));
          const filteredUpdates = updateEvents.filter((e: any) => e.data.user?.toLowerCase() === profileAddress.toLowerCase());
        filteredUpdates.forEach((e: any, index: number) => {
          if (index === 0) {
            allEvents.push({ ...e, type: 'ProfileRegistered' });
          } else {
            allEvents.push({ ...e, type: 'ProfileUpdated' });
          }
        });
      }
        if (Array.isArray(transferEvents)) {
          const filteredTransfers = transferEvents.filter((e: any) => 
            e.data.from?.toLowerCase() === profileAddress.toLowerCase() || 
            e.data.to?.toLowerCase() === profileAddress.toLowerCase()
          );
          allEvents = allEvents.concat(filteredTransfers.map((e: any) => ({ ...e, type: 'ProfileOwnershipTransferred' })));
        }
        allEvents.sort((a, b) => Number(b.data.timestamp_seconds) - Number(a.data.timestamp_seconds));
        setHistoryResult(allEvents);
        setCurrentPage(1); 

      // --- Truy vấn các job liên quan đến address ---
      // 1. Lấy tất cả JobPostedEvent
      const rawPostedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
        options: { limit: 100 }
      });
      // 2. Lấy tất cả WorkerAppliedEvent
      const rawAppliedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerAppliedEvent`,
        options: { limit: 100 }
      });
      // 3. Lấy tất cả WorkerApprovedEvent
      const rawApprovedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerApprovedEvent`,
        options: { limit: 100 }
      });
      // 4. Lấy tất cả JobCompletedEvent
      const rawCompletedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobCompletedEvent`,
        options: { limit: 100 }
      });
      // 5. Lấy tất cả JobCanceledEvent
      const rawCanceledEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobCanceledEvent`,
        options: { limit: 100 }
      });
      // 6. Lấy tất cả JobExpiredEvent
      const rawExpiredEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobExpiredEvent`,
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
      const jobsCreated = rawPostedEvents.filter(e => e.data.poster.toLowerCase() === profileAddress.toLowerCase());
      // Lọc job đã apply
      const jobsApplied = rawAppliedEvents.filter(e => e.data.worker.toLowerCase() === profileAddress.toLowerCase());
      // Lọc job đã được nhận (worker)
      const jobsWorked = rawApprovedEvents.filter(e => e.data.worker.toLowerCase() === profileAddress.toLowerCase());
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
              eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
              options: { limit: 1000 }
            });
            approvedEvents = await aptos.event.getModuleEventsByEventType({
              eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerApprovedEvent`,
              options: { limit: 1000 }
            });
            milestoneAcceptedEvents = await aptos.event.getModuleEventsByEventType({
              eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::MilestoneAcceptedEvent`,
              options: { limit: 1000 }
            });
            completedEvents = await aptos.event.getModuleEventsByEventType({
              eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobCompletedEvent`,
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
      setProfileJobsCreated(jobsCreatedInfo.filter(Boolean));
      // Dự án đã apply/làm
      const appliedJobIds = new Set(jobsApplied.map(e => e.data.job_id.toString()));
      jobsWorked.forEach(e => appliedJobIds.add(e.data.job_id.toString()));
      const jobsAppliedOrWorked = rawPostedEvents.filter(e => appliedJobIds.has(e.data.job_id.toString()));
      const jobsAppliedInfo = await Promise.all(jobsAppliedOrWorked.map(getJobInfo));
      setProfileJobsApplied(jobsAppliedInfo.filter(Boolean));
    } catch (err: any) {
      setProfileError(`Lỗi không xác định: ${err.message || String(err)}`);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Đã sao chép địa chỉ ví!"))
      .catch(() => toast.error("Không thể sao chép."));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <section ref={heroRef} className="relative py-20 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black">
        <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Khám phá <span className="text-white">Dự án</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Tìm kiếm cơ hội freelancing trong thế giới Web3. Kết nối với khách hàng toàn cầu và xây dựng sự nghiệp của bạn.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
          >
            <div className="flex flex-col lg:flex-row gap-4">
 
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm dự án, kỹ năng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12 rounded-xl"
                />
              </div>

   
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full lg:w-48 bg-white/10 border-white/20 text-white h-12 rounded-xl">
                  <SelectValue placeholder="Danh mục" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value} className="text-white hover:bg-gray-800">
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full lg:w-48 bg-white/10 border-white/20 text-white h-12 rounded-xl">
                  <SelectValue placeholder="Địa điểm" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {locations.map((location) => (
                    <SelectItem key={location.value} value={location.value} className="text-white hover:bg-gray-800">
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <button
                className="text-xs text-blue-400 hover:underline focus:outline-none font-semibold flex items-center gap-1"
                onClick={() => setShowAptosLookup(v => !v)}
              >
                <Info className="w-4 h-4" /> {showAptosLookup ? 'Ẩn tra cứu hồ sơ Aptos' : 'Tra cứu hồ sơ Aptos'}
              </button>
              {showAptosLookup && (
                <div className="mt-4 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-white/10 rounded-xl p-4 shadow-xl">
                  <h3 className="text-base font-bold mb-2 text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-400" /> Tra cứu hồ sơ người dùng trên Aptos
                  </h3>
                  <p className="text-gray-400 text-xs mb-3">Nhập địa chỉ ví Aptos để kiểm tra hồ sơ định danh. Bạn có thể kiểm tra trạng thái, lấy CID, xem chi tiết hoặc lịch sử cập nhật.</p>
                  <div className="flex flex-col gap-2 mb-3">
                    <input
                      type="text"
                      value={profileAddress}
                      onChange={e => setProfileAddress(e.target.value)}
                      placeholder="Nhập địa chỉ ví Aptos..."
                      className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 font-primary"
                    />
                    <Button 
                      onClick={handleQueryProfile} 
                      disabled={profileLoading || !profileAddress}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                      {profileLoading ? (
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      Truy vấn hồ sơ
                    </Button>
                  </div>
                  {profileLoading && <div className="text-blue-400 text-xs mb-2 flex items-center gap-2 justify-center py-4"><Info className="w-4 h-4 animate-spin" /> Đang truy vấn...</div>}
                  {profileError && <div className="text-red-400 text-xs mb-2 flex items-center gap-2 justify-center py-4"><AlertCircle className="w-4 h-4" /> <span>Đã xảy ra lỗi khi tra cứu hồ sơ. Vui lòng thử lại.</span></div>}
                  {queriedProfile && (
                    <div className="mt-4 p-4 bg-gray-900/60 rounded-xl border border-white/10">
                      <div className="flex items-center gap-4 mb-4">
                        <img src={queriedProfile.avatar} alt="avatar" className="w-12 h-12 rounded-full border border-blue-400" />
                        <div>
                          <div className="font-bold text-lg text-white">{queriedProfile.name}</div>
                          <div className="text-xs text-gray-400 break-all">{profileAddress}</div>
                          <div className="text-xs text-gray-400 break-all">DID: {queriedProfile.did}</div>
                        </div>
                      </div>
                      <div className="text-green-400 font-semibold mb-2">{profileResult}</div>
                      {queriedProfile.reputation_score !== undefined && (
                        <div className="mt-4 p-4 bg-gray-900/60 rounded-xl border border-white/10">
                          <h4 className="font-bold text-white mb-2">Điểm uy tín:</h4>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex flex-col items-center">
                              <span className="text-4xl font-bold text-blue-400 font-heading">{queriedProfile.reputation_score}</span>
                              <div className="flex items-center mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={18}
                                    className={i < Math.round(queriedProfile.reputation_level || 0) ? "text-blue-400" : "text-gray-700"}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-gray-400 text-sm font-primary">
                              Cấp độ: {queriedProfile.reputation_level} ({queriedProfile.reputation_metrics?.total_jobs_completed || 0} dự án đã hoàn thành)
                            </span>
                          </div>
                          {queriedProfile.reputation_metrics && (
                            <div className="space-y-2 mt-4">
                              <h3 className="text-sm font-semibold text-gray-300">Chỉ số danh tiếng:</h3>
                              {queriedProfile.reputation_metrics.total_jobs_completed > 0 && (
                                <div className="text-sm font-primary text-white/80">
                                  Tổng dự án hoàn thành: <span className="font-semibold text-blue-400">{queriedProfile.reputation_metrics.total_jobs_completed}</span>
                    </div>
                  )}
                              {queriedProfile.reputation_metrics.total_jobs_posted > 0 && (
                                <div className="text-sm font-primary text-white/80">
                                  Tổng dự án đã đăng: <span className="font-semibold text-blue-400">{queriedProfile.reputation_metrics.total_jobs_posted}</span>
                                </div>
                              )}
                              {queriedProfile.reputation_metrics.total_amount_transacted > 0 && (
                                <div className="text-sm font-primary text-white/80">
                                  Tổng số tiền giao dịch: <span className="font-semibold text-blue-400">{queriedProfile.reputation_metrics.total_amount_transacted / 100_000_000} APT</span>
                                </div>
                              )}
                              {queriedProfile.reputation_metrics.on_time_delivery_count > 0 && queriedProfile.reputation_metrics.total_milestones > 0 && (
                                <div className="text-sm font-primary text-white/80">
                                  Tỷ lệ hoàn thành đúng hạn: <span className="font-semibold text-blue-400">{((queriedProfile.reputation_metrics.on_time_delivery_count / queriedProfile.reputation_metrics.total_milestones) * 100).toFixed(2)}%</span>
                                </div>
                              )}
                              {queriedProfile.reputation_metrics.response_count > 0 && (
                                <div className="text-sm font-primary text-white/80">
                                  Thời gian phản hồi trung bình: <span className="font-semibold text-blue-400">{(queriedProfile.reputation_metrics.total_response_time / queriedProfile.reputation_metrics.response_count / 60).toFixed(2)} phút</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {historyResult.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-bold text-white mb-2">Lịch sử cập nhật và chuyển quyền:</h4>
                          <ul className="space-y-3">
                            {historyResult.map((item, idx) => (
                              <li key={idx} className="bg-gray-800/50 rounded p-3">
                                <div className="font-semibold text-blue-300">Loại sự kiện: {item.type === 'ProfileRegistered' ? 'Đăng ký hồ sơ' : item.type === 'ProfileUpdated' ? 'Cập nhật hồ sơ' : 'Chuyển quyền sở hữu'}</div>
                                <div className="text-xs text-gray-400">Thời gian: {new Date(Number(item.data.timestamp_seconds) * 1000).toLocaleString()}</div>
                                {item.data.user && <div className="text-xs text-gray-400">Người dùng: {item.data.user}</div>}
                                {item.data.cid && <div className="text-xs text-gray-400">CID mới: {item.data.cid}</div>}
                                {item.data.cccd && <div className="text-xs text-gray-400">CCCD mới: {item.data.cccd}</div>}
                                {item.data.did && <div className="text-xs text-gray-400">DID mới: {item.data.did}</div>}
                                {item.data.from && <div className="text-xs text-gray-400">Từ: {item.data.from}</div>}
                                {item.data.to && <div className="text-xs text-gray-400">Đến: {item.data.to}</div>}
                          </li>
                        ))}
                      </ul>
                        </div>
                      )}
                      {profileJobsCreated.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-bold text-white mb-2">Dự án đã tạo</h3>
                          <ul className="space-y-4">
                            {profileJobsCreated.map(job => (
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
                                      <button onClick={() => handleCopy(job.poster)} className="text-gray-400 hover:text-blue-400" title="Copy"><Copy size={12} /></button>
                                    </span>
                                  ) : '-'}</div>
                                  <div><b>Người đã được duyệt:</b> {job.approvedWorkers && job.approvedWorkers.length > 0 ? job.approvedWorkers.map((addr, idx) => (
                                    <span key={addr} className="inline-flex items-center gap-1 mr-2">
                                      {addr.slice(0, 6)}...{addr.slice(-4)}
                                      <button onClick={() => handleCopy(addr)} className="text-gray-400 hover:text-blue-400" title="Copy"><Copy size={12} /></button>
                                      {idx < job.approvedWorkers.length - 1 && ','}
                                    </span>
                                  )) : '-'}</div>
                                  <div><b>Người hoàn thành cột mốc cuối:</b> {typeof job.completedBy === 'string' && job.completedBy ? (
                                    <span className="inline-flex items-center gap-1">
                                      {job.completedBy.slice(0, 6)}...{job.completedBy.slice(-4)}
                                      <button onClick={() => handleCopy(job.completedBy!)} className="text-gray-400 hover:text-blue-400" title="Copy"><Copy size={12} /></button>
                                    </span>
                                  ) : '-'}</div>
                                </div>
                                {job.milestones.length > 0 && (
                                  <div className="mt-3">
                                    <h4 className="text-sm font-medium text-gray-300 mb-2">Các cột mốc:</h4>
                                    <ul className="space-y-2">
                                      {job.milestones.map(milestone => (
                                        <li key={milestone.index} className="flex justify-between items-center text-sm">
                                          <span className="text-gray-400">Cột mốc {milestone.index + 1}: {milestone.amount / 1_000_000} APT</span>
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                              milestone.status === 'Đã hoàn thành' ? 'bg-green-700/30 text-green-300' :
                                              milestone.status === 'Đã nộp' ? 'bg-blue-700/30 text-blue-300' :
                                              milestone.status.includes('từ chối') ? 'bg-red-700/30 text-red-300' :
                                              'bg-gray-700/30 text-gray-300'
                                            }`}>
                                              {milestone.status}
                                            </span>
                                            {milestone.completedAt && (
                                              <span className="text-xs text-gray-500">
                                                {new Date(milestone.completedAt * 1000).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {profileJobsApplied.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-bold text-white mb-2">Dự án đã ứng tuyển/đã làm</h3>
                          <ul className="space-y-4">
                            {profileJobsApplied.map(job => (
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
                                      <button onClick={() => handleCopy(job.poster)} className="text-gray-400 hover:text-blue-400" title="Copy"><Copy size={12} /></button>
                                    </span>
                                  ) : '-'}</div>
                                  <div><b>Người đã được duyệt:</b> {job.approvedWorkers && job.approvedWorkers.length > 0 ? job.approvedWorkers.map((addr, idx) => (
                                    <span key={addr} className="inline-flex items-center gap-1 mr-2">
                                      {addr.slice(0, 6)}...{addr.slice(-4)}
                                      <button onClick={() => handleCopy(addr)} className="text-gray-400 hover:text-blue-400" title="Copy"><Copy size={12} /></button>
                                      {idx < job.approvedWorkers.length - 1 && ','}
                                    </span>
                                  )) : '-'}</div>
                                  <div><b>Người hoàn thành cột mốc cuối:</b> {typeof job.completedBy === 'string' && job.completedBy ? (
                                    <span className="inline-flex items-center gap-1">
                                      {job.completedBy.slice(0, 6)}...{job.completedBy.slice(-4)}
                                      <button onClick={() => handleCopy(job.completedBy!)} className="text-gray-400 hover:text-blue-400" title="Copy"><Copy size={12} /></button>
                                    </span>
                                  ) : '-'}</div>
                                </div>
                                {job.milestones.length > 0 && (
                                  <div className="mt-3">
                                    <h4 className="text-sm font-medium text-gray-300 mb-2">Các cột mốc:</h4>
                                    <ul className="space-y-2">
                                      {job.milestones.map(milestone => (
                                        <li key={milestone.index} className="flex justify-between items-center text-sm">
                                          <span className="text-gray-400">Cột mốc {milestone.index + 1}: {milestone.amount / 1_000_000} APT</span>
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                              milestone.status === 'Đã hoàn thành' ? 'bg-green-700/30 text-green-300' :
                                              milestone.status === 'Đã nộp' ? 'bg-blue-700/30 text-blue-300' :
                                              milestone.status.includes('từ chối') ? 'bg-red-700/30 text-red-300' :
                                              'bg-gray-700/30 text-gray-300'
                                            }`}>
                                              {milestone.status}
                                            </span>
                                            {milestone.completedAt && (
                                              <span className="text-xs text-gray-500">
                                                {new Date(milestone.completedAt * 1000).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section ref={jobsRef} className="py-16 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={jobsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap justify-center gap-8 mb-12"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{filteredJobs.length}</div>
              <div className="text-gray-400">Dự án hiện có</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-violet-400">{jobs.length}</div>
              <div className="text-gray-400">Tổng dự án</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">24/7</div>
              <div className="text-gray-400">Hỗ trợ</div>
            </div>
          </motion.div>


          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          )}


          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={jobsInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={jobsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group h-full"
                >
                  <Card className=" h-full flex flex-col bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-white/10 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-300 overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {job.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {job.client.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-300">Người đăng: {job.client.name}</div>
                              <div className="text-xs text-gray-500">Đăng lúc: {formatPostedTime(job.postedAt)}</div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span>Địa chỉ ví: {job.poster.slice(0, 6)}...{job.poster.slice(-4)}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopy(job.poster); }}
                                  className="text-gray-500 hover:text-blue-400 p-1 rounded-sm transition-colors"
                                  title="Sao chép địa chỉ ví"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {job.immediate && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            <Zap className="w-3 h-3 mr-1" />
                            Gấp
                          </Badge>
                        )}
                      </div>
                      
                      <CardDescription className="text-gray-400 line-clamp-3">
                        {job.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col flex-1 justify-between pt-0">
              
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 3 && (
                          <Badge variant="secondary" className="bg-gray-600/50 text-gray-300">
                            +{job.skills.length - 3}
                          </Badge>
                        )}
                      </div>

          
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span>
                            ${job.budget.min.toLocaleString()} - ${job.budget.max.toLocaleString()} {job.budget.currency}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4 text-orange-400" />
                          <span>{job.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          {getLocationIcon(job.location)}
                          <span className="capitalize">{job.location}</span>
                        </div>
                      </div>

         
                      <Button onClick={() => handleApplyToJob(job)} className="group relative z-10 w-full cursor-pointer overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold py-3 px-8 transition-all duration-300 shadow">
                        <span className="relative inline-flex overflow-hidden font-primary text-base">
                          <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                            Ứng tuyển ngay
                          </div>
                          <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                            Ứng tuyển ngay
                          </div>
                        </span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform inline-block" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                <Briefcase className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">Không tìm thấy dự án</h3>
              <p className="text-gray-500 mb-6">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setLocationFilter('all');
                }}
                variant="outline"
                className="group relative z-10 cursor-pointer overflow-hidden rounded-full  font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10"
              >
                <span className="relative inline-flex overflow-hidden font-primary text-base">
                  <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                    Đặt lại bộ lọc
                  </div>
                  <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                    Đặt lại bộ lọc
                  </div>
                </span>
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="bg-gray-900 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Ứng tuyển dự án
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedJob?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-white/10">
              <h4 className="font-medium text-white mb-2">Thông tin dự án</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Ngân sách:</span>
                  <span className="text-green-400">
                    ${selectedJob?.budget.min.toLocaleString()} - ${selectedJob?.budget.max.toLocaleString()} {selectedJob?.budget.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian:</span>
                  <span>{selectedJob?.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span>Địa điểm:</span>
                  <span className="capitalize">{selectedJob?.location}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleSendApplication}
                className="group relative z-10 w-full cursor-pointer overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold py-3 px-8 transition-all duration-300 shadow"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="relative inline-flex overflow-hidden font-primary text-base">
                  <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                    Ứng tuyển ngay
                  </div>
                  <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                    Ứng tuyển ngay
                  </div>
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setApplyDialogOpen(false)}
                className="group relative w-full z-10 cursor-pointer overflow-hidden rounded-full  font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10"
              >
                <span className="relative inline-flex overflow-hidden font-primary text-base">
                  <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                    Hủy
                  </div>
                  <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                    Hủy
                  </div>
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Jobs;
