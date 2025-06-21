import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { convertIPFSURL } from '@/utils/ipfs';
import { useWallet } from '../context/WalletContext';
import { 
  Search, 
  Clock, 
  Briefcase,
  CheckCircle,
  Info,
  AlertCircle,
  Eye,
  Download,
  XCircle,
  Copy
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';
import { aptos, fetchProfileDetails, decodeCID, fetchMilestoneDetails, getMilestoneCIDs } from '@/utils/aptosUtils';

const MODULE_ADDRESS = "0xabec4e453af5c908c5d7f0b7b59931dd204e2bc5807de364629b4e32eb5fafea";
const JOBS_CONTRACT_ADDRESS = "0xabec4e453af5c908c5d7f0b7b59931dd204e2bc5807de364629b4e32eb5fafea";
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v29";
const PROFILE_MODULE_NAME = "web3_profiles_v29";

export interface JobPost {
  id: string;
  poster: string;
  cid: string;
  start_time: number;
  end_time: number;
  milestones?: any[];
  duration_per_milestone: number[];
  worker: string | null;
  approved: boolean;
  active: boolean;
  current_milestone: number;
  milestone_states: { [key: number]: { 
    submitted: boolean; 
    accepted: boolean; 
    submit_time: number; 
    reject_count: number;
    submission_cid?: any;
    acceptance_cid?: any;
    rejection_cid?: any;
  } };
  submit_time: number | null;
  escrowed_amount: number;
  approve_time: number | null;
  poster_did: string;
  poster_profile_cid: string;
  completed: boolean;
  rejected_count: number;
  job_expired: boolean;
  milestone_deadlines: number[];
  application_deadline: number;
  last_reject_time: number | null;
  locked: boolean;
  title?: string;
  description?: string;
}

interface MilestoneData {
  submitted: boolean;
  accepted: boolean;
  submit_time: number | string;
  reject_count: number;
  submission_cid?: any;
  acceptance_cid?: any;
  rejection_cid?: any;
}

const EVENT_TYPES = [
  "JobPostedEvent",
  "WorkerAppliedEvent",
  "WorkerApprovedEvent",
  "MilestoneSubmittedEvent",
  "MilestoneAcceptedEvent",
  "MilestoneRejectedEvent",
  "JobCanceledEvent",
  "JobCompletedEvent",
  "JobExpiredEvent",
  "FundFlowEvent",
  "WorkerStakeRefundedEvent",
  "WithdrawRequestedEvent",
  "WithdrawApprovedEvent",
  "WithdrawDeniedEvent",
  "CancelRequestedEvent",
  "CancelApprovedEvent",
  "CancelDeniedEvent",
  "JobUnlockConfirmedEvent"
];

async function fetchJobEvents(jobId: string) {
  const allEvents: any[] = [];
  for (const eventType of EVENT_TYPES) {
    const events = await aptos.event.getModuleEventsByEventType({
      eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::${eventType}`,
      options: { limit: 1000 }
    });
    const filtered = events.filter((e: any) => e.data.job_id?.toString() === jobId);
    allEvents.push(...filtered.map(e => ({ ...e, type: eventType })));
  }
  // Sắp xếp theo thời gian
  allEvents.sort((a, b) => {
    const getTime = (data: any) => Number(
      data.time || 
      data.apply_time || 
      data.approve_time || 
      data.submit_time || 
      data.accept_time || 
      data.reject_time || 
      data.cancel_time || 
      data.complete_time || 
      data.expire_time || 
      data.start_time || 
      0
    );
    return getTime(b.data) - getTime(a.data);
  });
  return allEvents;
}

const getEventDisplayName = (eventType: string) => {
  const names = {
    "JobPostedEvent": "Dự án đã được đăng",
    "WorkerAppliedEvent": "Ứng viên đã ứng tuyển",
    "WorkerApprovedEvent": "Ứng viên đã được duyệt",
    "MilestoneSubmittedEvent": "Cột mốc đã được nộp",
    "MilestoneAcceptedEvent": "Cột mốc đã được chấp nhận",
    "MilestoneRejectedEvent": "Cột mốc đã bị từ chối",
    "JobCanceledEvent": "Dự án đã bị hủy",
    "JobCompletedEvent": "Dự án đã hoàn thành",
    "JobExpiredEvent": "Dự án đã hết hạn",
    "FundFlowEvent": "Giao dịch chuyển tiền",
    "WorkerStakeRefundedEvent": "Hoàn tiền cược cho Worker",
    "WithdrawRequestedEvent": "Worker yêu cầu rút ứng tuyển",
    "WithdrawApprovedEvent": "Poster đã chấp nhận rút ứng tuyển",
    "WithdrawDeniedEvent": "Poster đã từ chối rút ứng tuyển",
    "CancelRequestedEvent": "Poster yêu cầu hủy dự án",
    "CancelApprovedEvent": "Worker đã chấp nhận hủy dự án",
    "CancelDeniedEvent": "Worker đã từ chối hủy dự án",
    "JobUnlockConfirmedEvent": "Xác nhận mở khóa dự án"
  };
  return names[eventType] || eventType;
};

const Jobs = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const heroRef = useRef(null);
  const jobsRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const jobsInView = useInView(jobsRef, { once: true });
  const controls = useAnimation();
  const [profileAddress, setProfileAddress] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showAptosLookup, setShowAptosLookup] = useState(false);
  const { account, accountType } = useWallet();
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
    cid: string;
    start_time: number;
    end_time: number;
    duration_per_milestone: number[];
    approved: boolean;
    active: boolean;
    completed: boolean;
    job_expired: boolean;
    milestone_deadlines: number[];
    escrowed_amount: number;
    application_deadline: number;
    current_milestone: number;
    milestone_states: { [key: number]: { submitted: boolean; accepted: boolean; submit_time: number; reject_count: number } };
    submit_time: number | null;
    approve_time: number | null;
    poster_did: string;
    poster_profile_cid: string;
    rejected_count: number;
    locked: boolean;
    last_reject_time: number | null;
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
    cid: string;
    start_time: number;
    end_time: number;
    duration_per_milestone: number[];
    approved: boolean;
    active: boolean;
    completed: boolean;
    job_expired: boolean;
    milestone_deadlines: number[];
    escrowed_amount: number;
    application_deadline: number;
    current_milestone: number;
    milestone_states: { [key: number]: { submitted: boolean; accepted: boolean; submit_time: number; reject_count: number } };
    submit_time: number | null;
    approve_time: number | null;
    poster_did: string;
    poster_profile_cid: string;
    rejected_count: number;
    locked: boolean;
    last_reject_time: number | null;
  }[]>([]);

  const [withdrawing, setWithdrawing] = useState(false);
  const [jobEvents, setJobEvents] = useState<any[]>([]);
  const [hasApplied, setHasApplied] = useState(false);

  // Milestone details dialog states
  const [viewMilestoneDialogOpen, setViewMilestoneDialogOpen] = useState(false);
  const [milestoneDetails, setMilestoneDetails] = useState<any>(null);
  const [loadingMilestoneDetails, setLoadingMilestoneDetails] = useState(false);
  const [selectedMilestoneCid, setSelectedMilestoneCid] = useState<string>('');
  const [selectedMilestoneType, setSelectedMilestoneType] = useState<'submission' | 'acceptance' | 'rejection'>('submission');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number>(0);

  // Job events dialog states
  const [viewJobEventsDialogOpen, setViewJobEventsDialogOpen] = useState(false);
  const [jobEventsDetails, setJobEventsDetails] = useState<any[]>([]);
  const [loadingJobEvents, setLoadingJobEvents] = useState(false);
  const [selectedJobForEvents, setSelectedJobForEvents] = useState<string>('');

  const [canceledJobIds, setCanceledJobIds] = useState<Set<string>>(new Set());
  const [profileFullInfo, setProfileFullInfo] = useState<{
    profile: any;
    jobsCreated: any[];
    jobsApplied: any[];
    historyResult: any[];
  } | null>(null);

  const handleCopy = (text: string, label: string = 'Địa chỉ') => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} đã được sao chép vào clipboard!`);
    }).catch(err => {
      toast.error('Không thể sao chép.');
      console.error('Could not copy text: ', err);
    });
  };

  const getJobStatus = (job) => {
    if (job.status === 'Đã hoàn thành') return { label: 'Đã hoàn thành', key: 'completed', color: 'bg-blue-700/30 text-blue-300' };
    if (job.status === 'Đã hủy') return { label: 'Đã hủy', key: 'canceled', color: 'bg-red-700/30 text-red-300' };
    if (job.status === 'Đã khóa') return { label: 'Đã khóa', key: 'locked', color: 'bg-gray-700/30 text-gray-300' };
    if (job.status === 'Đang thực hiện') return { label: 'Đang thực hiện', key: 'in-progress', color: 'bg-green-700/30 text-green-300' };
    if (job.status === 'Đang tuyển') return { label: 'Đang tuyển', key: 'in-progress', color: 'bg-green-800/30 text-green-400' };
    if (job.status === 'Đã hết hạn') return { label: 'Đã hết hạn', key: 'closed', color: 'bg-red-800/30 text-red-400' };
    return { label: 'Đã đóng', key: 'closed', color: 'bg-gray-400/20 text-gray-400' };
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('vi-VN');
  };

  const getActionDisplayName = (action: string) => {
    switch (action) {
      case 'submit': return 'Nộp cột mốc';
      case 'accept': return 'Chấp nhận';
      case 'reject': return 'Từ chối';
      default: return action;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewMilestoneDetails = async (jobId: string, milestoneIndex: number, cid: string, type: 'submission' | 'acceptance' | 'rejection') => {
    setSelectedJobId(jobId);
    setSelectedMilestoneIndex(milestoneIndex);
    setSelectedMilestoneCid(cid);
    setSelectedMilestoneType(type);
    setMilestoneDetails(null);
    setLoadingMilestoneDetails(true);
    setViewMilestoneDialogOpen(true);

    try {
      // Convert CID bytes to string if needed
      let cidString = cid;
      if (Array.isArray(cid)) {
        cidString = decodeCID(cid);
      } else if (typeof cid === 'string' && cid.startsWith('0x')) {
        cidString = decodeCID(cid);
      }

      if (!cidString) {
        throw new Error('Invalid CID format');
      }

      // Fetch data from IPFS
      const data = await fetchMilestoneDetails(cidString);
      setMilestoneDetails(data);
    } catch (error) {
      console.error('Error fetching milestone details:', error);
      toast.error('Không thể tải thông tin chi tiết từ IPFS');
      setMilestoneDetails({ error: 'Không thể tải dữ liệu' });
    } finally {
      setLoadingMilestoneDetails(false);
    }
  };

  const handleViewJobEvents = async (jobId: string) => {
    setSelectedJobForEvents(jobId);
    setJobEventsDetails([]);
    setLoadingJobEvents(true);
    setViewJobEventsDialogOpen(true);

    try {
      // Fetch all events for this job
      const events = await fetchJobEvents(jobId);
      setJobEventsDetails(events);
    } catch (error) {
      console.error('Error fetching job events:', error);
      toast.error('Không thể tải sự kiện của dự án');
    } finally {
      setLoadingJobEvents(false);
    }
  };

  useEffect(() => {
    let filtered = jobs;
    
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.cid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.poster.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredJobs(filtered);
  }, [jobs, searchTerm]);
  
  useEffect(() => {
    if (heroInView) {
      controls.start('visible');
    }
  }, [controls, heroInView]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const eventsResource = await aptos.getAccountResource({
        accountAddress: JOBS_CONTRACT_ADDRESS,
        resourceType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Events`,
      });

      if (!eventsResource || !(eventsResource as any).post_event?.guid?.id) {
        console.warn("JobPostedEvent handle not found or marketplace not initialized.");
        setLoading(false);
        return;
      }
      const rawEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
        options: {
          limit: 50,
          orderBy: [{ transaction_version: "desc" }]
        }
      });
      const jobsResource = await aptos.getAccountResource({
        accountAddress: JOBS_CONTRACT_ADDRESS,
        resourceType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Jobs`,
      });
      const jobsTableHandle = jobsResource && (jobsResource as any).jobs?.handle;

      const fetchedJobs: JobPost[] = [];
      for (const event of rawEvents) {
        const eventData = event.data as any;
        let jobCid = eventData.cid;
        if (typeof jobCid === 'string' && jobCid.startsWith('0x')) {
          const hex = jobCid.replace(/^0x/, '');
          const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
          jobCid = new TextDecoder().decode(bytes);
        } else if (Array.isArray(jobCid)) {
          jobCid = new TextDecoder().decode(new Uint8Array(jobCid));
        }
        try {
          const jobDetailsUrl = convertIPFSURL(jobCid);
          const response = await fetch(jobDetailsUrl);
          const jobDataFromIPFS = await response.json();
          let jobOnChain: any = null;
          if (jobsTableHandle) {
            try {
              jobOnChain = await aptos.getTableItem({
                handle: jobsTableHandle,
                data: {
                  key_type: "u64",
                  value_type: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Job`,
                  key: eventData.job_id.toString(),
                },
              });
            } catch (e) {
            }
          }
          const jobPost: JobPost = {
            id: eventData.job_id.toString(),
            cid: jobCid,
            poster: jobOnChain?.poster || eventData.poster,
            worker: jobOnChain?.worker || null,
            escrowed_amount: Number(jobOnChain?.escrowed_amount ?? eventData.escrowed_amount),
            start_time: Number(jobOnChain?.start_time ?? eventData.start_time),
            end_time: Number(jobOnChain?.end_time ?? eventData.end_time),
            locked: jobOnChain?.locked ?? eventData.locked,
            milestones: jobOnChain?.milestones ? jobOnChain.milestones.map(Number) : (Array.isArray(eventData.milestones) ? eventData.milestones.map(Number) : []),
            milestone_states: {},
            application_deadline: Number(jobOnChain?.application_deadline ?? eventData.application_deadline),
            duration_per_milestone: jobOnChain?.duration_per_milestone ? jobOnChain.duration_per_milestone.map(Number) : (Array.isArray(eventData.duration_per_milestone) ? eventData.duration_per_milestone.map(Number) : []),
            approved: jobOnChain?.approved ?? eventData.approved,
            active: jobOnChain?.active ?? eventData.active,
            current_milestone: Number(jobOnChain?.current_milestone ?? eventData.current_milestone),
            submit_time: jobOnChain?.submit_time ? Number(jobOnChain.submit_time) : (eventData.submit_time ? Number(eventData.submit_time) : null),
            approve_time: jobOnChain?.approve_time ? Number(jobOnChain.approve_time) : (eventData.approve_time ? Number(eventData.approve_time) : null),
            poster_did: jobOnChain?.poster_did ?? eventData.poster_did,
            poster_profile_cid: jobOnChain?.poster_profile_cid ?? eventData.poster_profile_cid,
            completed: jobOnChain?.completed ?? eventData.completed,
            rejected_count: Number(jobOnChain?.rejected_count ?? eventData.rejected_count),
            job_expired: jobOnChain?.job_expired ?? eventData.job_expired,
            milestone_deadlines: jobOnChain?.milestone_deadlines ? jobOnChain.milestone_deadlines.map(Number) : (Array.isArray(eventData.milestone_deadlines) ? eventData.milestone_deadlines.map(Number) : []),
            last_reject_time: jobOnChain?.last_reject_time ? Number(jobOnChain.last_reject_time) : (eventData.last_reject_time ? Number(eventData.last_reject_time) : null),
            title: jobOnChain?.title || jobDataFromIPFS.title,
            description: jobOnChain?.description || jobDataFromIPFS.description,
          };

          // Fetch milestone states with CID fields
          if (jobOnChain?.milestone_states?.handle && Array.isArray(jobPost.milestones)) {
            for (let i = 0; i < jobPost.milestones.length; i++) {
              try {
                const milestoneData = await aptos.getTableItem({
                  handle: jobOnChain.milestone_states.handle,
                  data: {
                    key_type: "u64",
                    value_type: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::MilestoneData`,
                    key: String(i),
                  },
                }) as MilestoneData;
                jobPost.milestone_states[i] = {
                  submitted: milestoneData.submitted,
                  accepted: milestoneData.accepted,
                  submit_time: Number(milestoneData.submit_time),
                  reject_count: Number(milestoneData.reject_count),
                  submission_cid: milestoneData.submission_cid,
                  acceptance_cid: milestoneData.acceptance_cid,
                  rejection_cid: milestoneData.rejection_cid,
                };
              } catch (e) {
                // Handle error silently
              }
            }
          }

          fetchedJobs.push(jobPost);
        } catch (ipfsError) {
          console.error(`Error processing job from IPFS CID ${jobCid}:`, ipfsError);
        }
      }
      setJobs(fetchedJobs);
      setFilteredJobs(fetchedJobs);
      setLoading(false);
      const canceledEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobCanceledEvent`,
        options: { limit: 1000 }
      });
      const canceledIds = new Set(canceledEvents.map(e => e.data.job_id.toString()));
      setCanceledJobIds(canceledIds);
    } catch (error) {
      console.error("Failed to load jobs:", error);
      setLoading(false);
      toast.error("Failed to load jobs. Please try again later.");
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);
  
  const handleApplyToJob = (job: JobPost | typeof profileJobsCreated[0] | typeof profileJobsApplied[0]) => {
    setSelectedJob(job as JobPost);
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

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::apply`,
        type_arguments: [],
        arguments: [
          selectedJob.id 
        ]
      });
      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Đơn ứng tuyển của bạn đã được gửi thành công!');
      setApplyDialogOpen(false);
      loadJobs();
    } catch (error: any) {
      if (error?.message?.includes('EALREADY_APPLIED') || error?.message?.includes('code: 15')) {
        toast.error('Bạn đã apply, vui lòng chờ 8 tiếng mới được apply lại.');
      } else if (error?.message?.includes('EALREADY_HAS_WORKER')) {
        toast.error('Đã có người apply, vui lòng chờ kết quả hoặc khi job mở lại.');
      } else if (error?.message?.includes('ENOT_AUTHORIZED')) {
        toast.error('Bạn không thể ứng tuyển vào dự án do chính mình tạo.');
      } else {
        toast.error(`Ứng tuyển thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
      }
    }
  };

  const handleWithdrawApply = async () => {
    if (!selectedJob) return;
    setWithdrawing(true);
    try {
      const tx = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::worker_withdraw_apply`,
        type_arguments: [],
        arguments: [selectedJob.id]
      });
      await aptos.waitForTransaction({ transactionHash: tx.hash });
      toast.success('Bạn đã rút ứng tuyển, stake đã được hoàn lại!');
      setApplyDialogOpen(false);
      loadJobs();
    } catch (error: any) {
      toast.error(`Rút ứng tuyển thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleFullQuery = async () => {
    setProfileLoading(true);
    setProfileError(null);
    setProfileFullInfo(null);

    try {
      const profileInfo = await fetchProfileDetails(profileAddress);
      const moduleAddress = MODULE_ADDRESS;
      const createdEventsUrl = `https://fullnode.testnet.aptoslabs.com/v1/accounts/${moduleAddress}/events/${moduleAddress}::${PROFILE_MODULE_NAME}::Events/profile_created_event`;
      const updatedEventsUrl = `https://fullnode.testnet.aptoslabs.com/v1/accounts/${moduleAddress}/events/${moduleAddress}::${PROFILE_MODULE_NAME}::Events/profile_updated_event`;
      const fetchEventsSafe = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            if (res.status === 404) return [];
            throw new Error(`HTTP ${res.status}`);
          }
          return await res.json();
        } catch (e) {
          return [];
        }
      };
      const createdEvents = await fetchEventsSafe(createdEventsUrl);
      const updatedEvents = await fetchEventsSafe(updatedEventsUrl);
      const filteredCreated = createdEvents.filter((e: any) => e.data.user?.toLowerCase() === profileAddress.toLowerCase());
      const filteredUpdated = updatedEvents.filter((e: any) => e.data.user?.toLowerCase() === profileAddress.toLowerCase());
      let allEvents: any[] = [];
      if (filteredCreated.length > 0) {
        allEvents.push({ ...filteredCreated[0], type: 'ProfileRegistered' });
      }
      filteredUpdated.forEach(e => allEvents.push({ ...e, type: 'ProfileUpdated' }));
      allEvents.sort((a, b) => Number((b.data.updated_at || b.data.created_at)) - Number((a.data.updated_at || a.data.created_at)));

      const [postedEvents, appliedEvents, approvedEvents, completedEvents, canceledEvents, expiredEvents] = await Promise.all([
        aptos.event.getModuleEventsByEventType({
          eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
          options: { limit: 100 }
        }),
        aptos.event.getModuleEventsByEventType({
          eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerAppliedEvent`,
          options: { limit: 100 }
        }),
        aptos.event.getModuleEventsByEventType({
          eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerApprovedEvent`,
          options: { limit: 100 }
        }),
        aptos.event.getModuleEventsByEventType({
          eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobCompletedEvent`,
          options: { limit: 100 }
        }),
        aptos.event.getModuleEventsByEventType({
          eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobCanceledEvent`,
          options: { limit: 100 }
        }),
        aptos.event.getModuleEventsByEventType({
          eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobExpiredEvent`,
          options: { limit: 100 }
        })
      ]);
      const jobStatusMap = {};
      completedEvents.forEach(e => { jobStatusMap[e.data.job_id.toString()] = 'Đã hoàn thành'; });
      canceledEvents.forEach(e => { jobStatusMap[e.data.job_id.toString()] = 'Đã hủy'; });
      expiredEvents.forEach(e => { jobStatusMap[e.data.job_id.toString()] = 'Đã hết hạn'; });
      approvedEvents.forEach(e => {
        const id = e.data.job_id.toString();
        if (!jobStatusMap[id]) jobStatusMap[id] = 'Đang thực hiện';
      });
      const jobsCreated = postedEvents.filter(e => e.data.poster.toLowerCase() === profileAddress.toLowerCase());
      const jobsApplied = appliedEvents.filter(e => e.data.worker.toLowerCase() === profileAddress.toLowerCase());
      const jobsWorked = approvedEvents.filter(e => e.data.worker.toLowerCase() === profileAddress.toLowerCase());
      const processJobData = async (event: any) => {
        try {
          const jobIdStr = event.data.job_id.toString();
          let cid = event.data.cid;
          if (typeof cid === 'string' && cid.startsWith('0x')) {
            const hex = cid.replace(/^0x/, '');
            const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
            cid = new TextDecoder().decode(bytes);
          } else if (Array.isArray(cid)) {
            cid = new TextDecoder().decode(new Uint8Array(cid));
          }
          const jobDetailsUrl = convertIPFSURL(cid);
          const response = await fetch(jobDetailsUrl);
          if (!response.ok) return null;
          const jobData = await response.json();

          // Fetch job data from blockchain to get milestone states
          let jobOnChain: any = null;
          try {
            const jobsResource = await aptos.getAccountResource({
              accountAddress: JOBS_CONTRACT_ADDRESS,
              resourceType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Jobs`,
            });
            const jobsTableHandle = jobsResource && (jobsResource as any).jobs?.handle;
            if (jobsTableHandle) {
              jobOnChain = await aptos.getTableItem({
                handle: jobsTableHandle,
                data: {
                  key_type: "u64",
                  value_type: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Job`,
                  key: jobIdStr,
                },
              });
            }
          } catch (e) {
            // Handle error silently
          }

          // Fetch milestone states with CID fields
          let milestone_states = {};
          if (jobOnChain?.milestone_states?.handle && Array.isArray(jobOnChain.milestones)) {
            for (let i = 0; i < jobOnChain.milestones.length; i++) {
              try {
                const milestoneData = await aptos.getTableItem({
                  handle: jobOnChain.milestone_states.handle,
                  data: {
                    key_type: "u64",
                    value_type: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::MilestoneData`,
                    key: String(i),
                  },
                }) as MilestoneData;
                milestone_states[i] = {
                  submitted: milestoneData.submitted,
                  accepted: milestoneData.accepted,
                  submit_time: Number(milestoneData.submit_time),
                  reject_count: Number(milestoneData.reject_count),
                  submission_cid: milestoneData.submission_cid,
                  acceptance_cid: milestoneData.acceptance_cid,
                  rejection_cid: milestoneData.rejection_cid,
                };
              } catch (e) {
                // Handle error silently
              }
            }
          }

          return {
            id: jobIdStr,
            title: jobData.title || `Job ID: ${jobIdStr}`,
            description: jobData.description || '',
            status: jobStatusMap[jobIdStr] || 'Đang tuyển',
            poster: event.data.poster,
            worker: event.data.worker || null,
            milestones: jobData.milestones || [],
            completedBy: null,
            approvedWorkers: [],
            createdAt: Number(event.data.start_time),
            completedAt: null,
            cid: cid,
            start_time: Number(event.data.start_time),
            end_time: Number(event.data.end_time || 0),
            duration_per_milestone: event.data.duration_per_milestone || [],
            approved: event.data.approved || false,
            active: event.data.active || false,
            completed: event.data.completed || false,
            job_expired: event.data.job_expired || false,
            milestone_deadlines: event.data.milestone_deadlines || [],
            escrowed_amount: Number(event.data.escrowed_amount || 0),
            application_deadline: Number(event.data.application_deadline || 0),
            current_milestone: Number(event.data.current_milestone || 0),
            milestone_states: milestone_states,
            submit_time: event.data.submit_time ? Number(event.data.submit_time) : null,
            approve_time: event.data.approve_time ? Number(event.data.approve_time) : null,
            poster_did: event.data.poster_did || '',
            poster_profile_cid: event.data.poster_profile_cid || '',
            rejected_count: Number(event.data.rejected_count || 0),
            locked: event.data.locked || false,
            last_reject_time: event.data.last_reject_time ? Number(event.data.last_reject_time) : null
          };
        } catch (error) {
          return null;
        }
      };
      const jobsCreatedInfo = (await Promise.all(jobsCreated.map(processJobData))).filter(Boolean);
      const jobsCreatedWithEvents = await Promise.all(
        jobsCreatedInfo.map(async (job: any) => ({
          ...job,
          events: await fetchJobEvents(job.id)
        }))
      );

      const appliedJobIds = new Set([
        ...jobsApplied.map(e => e.data.job_id.toString()),
        ...jobsWorked.map(e => e.data.job_id.toString())
      ]);
      const jobsAppliedOrWorked = postedEvents.filter(e => appliedJobIds.has(e.data.job_id.toString()));
      const jobsAppliedInfo = (await Promise.all(jobsAppliedOrWorked.map(processJobData))).filter(Boolean);
      const jobsAppliedWithEvents = await Promise.all(
        jobsAppliedInfo.map(async (job: any) => ({
          ...job,
          events: await fetchJobEvents(job.id)
        }))
      );

      setProfileFullInfo({
        profile: profileInfo,
        jobsCreated: jobsCreatedWithEvents,
        jobsApplied: jobsAppliedWithEvents,
        historyResult: allEvents
      });
    } catch (e) {
      setProfileError('Có lỗi xảy ra');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (selectedJob && account) {
      fetchJobEvents(selectedJob.id).then(events => {
        setJobEvents(events);
        setHasApplied(
          events.some(ev =>
            ev.type === 'WorkerAppliedEvent' &&
            ev.data.worker && ev.data.worker.toLowerCase() === account.toLowerCase()
          )
        );
      });
    } else {
      setHasApplied(false);
      setJobEvents([]);
    }
  }, [selectedJob, account]);

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
                    <div className="flex gap-2">
                      <Button
                        onClick={handleFullQuery}
                        disabled={profileLoading || !profileAddress}
                        className="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30 rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        Truy vấn
                      </Button>
                    </div>
                  </div>
                  {profileLoading && <div className="text-blue-400 text-xs mb-2 flex items-center gap-2 justify-center py-4"><Info className="w-4 h-4 animate-spin" /> Đang truy vấn...</div>}
                  {profileError && <div className="text-red-400 text-xs mb-2 flex items-center gap-2 justify-center py-4"><AlertCircle className="w-4 h-4" /> <span>Đã xảy ra lỗi khi tra cứu hồ sơ. Vui lòng thử lại.</span></div>}
                  {profileFullInfo && (
                    <div className="mt-4 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-white/10 rounded-xl p-4 shadow-xl">
                      {/* Thông tin profile */}
                      <div className="flex items-center gap-4 mb-4">
                        <img src={profileFullInfo.profile.profilePic} alt="avatar" className="w-12 h-12 rounded-full border border-blue-400" />
                        <div>
                          <div className="font-bold text-lg text-white">{profileFullInfo.profile.name}</div>
                          <div className="text-xs text-gray-400 break-all font-medium flex items-center gap-2">
                            <span>{profileAddress}</span>
                            <Copy size={12} className="cursor-pointer hover:text-white" onClick={() => handleCopy(profileAddress, 'Địa chỉ ví')} />
                          </div>
                          <div className="text-xs text-gray-400 break-all font-medium">DID: {profileFullInfo.profile.did}</div>
                        </div>
                      </div>
                      {/* Lịch sử cập nhật */}
                      {profileFullInfo.historyResult.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-bold text-white mb-2 text-base">Lịch sử cập nhật và chuyển quyền sở hữu:</h4>
                          <ul className="space-y-3">
                            {profileFullInfo.historyResult.map((item, idx) => (
                              <li key={idx} className="bg-gray-800/50 rounded p-3">
                                <div className="font-semibold text-blue-300 text-sm">Loại sự kiện: {item.type === 'ProfileRegistered' ? 'Đăng ký hồ sơ' : item.type === 'ProfileUpdated' ? 'Cập nhật hồ sơ' : 'Chuyển quyền sở hữu'}</div>
                                <div className="text-xs text-gray-400 font-medium">
                                  Thời gian: {
                                    item.type === 'ProfileRegistered' && item.data.created_at ? new Date(Number(item.data.created_at) * 1000).toLocaleString() :
                                    item.type === 'ProfileUpdated' && item.data.updated_at ? new Date(Number(item.data.updated_at) * 1000).toLocaleString() :
                                    '-'
                                  }
                                </div>
                                {item.data.user && <div className="text-xs text-gray-400 flex items-center gap-1"><span>Người dùng: {item.data.user}</span><Copy size={12} className="cursor-pointer hover:text-white" onClick={() => handleCopy(item.data.user, 'Địa chỉ người dùng')} /></div>}
                                {item.data.cid && <div className="text-xs text-gray-400">CID mới: {item.data.cid}</div>}
                                {item.data.cccd && <div className="text-xs text-gray-400">CCCD: {item.data.cccd}</div>}
                                {item.data.did && <div className="text-xs text-gray-400">DID: {item.data.did}</div>}
                                {item.data.from && <div className="text-xs text-gray-400 flex items-center gap-1"><span>Từ: {item.data.from}</span><Copy size={12} className="cursor-pointer hover:text-white" onClick={() => handleCopy(item.data.from, 'Địa chỉ ví')} /></div>}
                                {item.data.to && <div className="text-xs text-gray-400 flex items-center gap-1"><span>Đến: {item.data.to}</span><Copy size={12} className="cursor-pointer hover:text-white" onClick={() => handleCopy(item.data.to, 'Địa chỉ ví')} /></div>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Dự án đã tạo */}
                      {profileFullInfo.jobsCreated.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-bold text-white mb-2 text-lg">Dự án đã tạo</h3>
                          <ul className="space-y-4">
                            {profileFullInfo.jobsCreated.map(job => (
                              <li key={job.id} className="bg-gradient-to-br from-gray-900/70 to-gray-800/80 rounded-xl border border-white/10 shadow p-6 flex flex-col gap-2">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xl font-bold text-blue-400 truncate">{job.title}</span>
                                  <span className="text-xs px-3 py-1 rounded bg-blue-700/30 text-blue-300 font-medium">{job.status}</span>
                                </div>
                                {Array.isArray(job.milestones) && job.milestones.length > 0 && (
                                  <div className="mt-2">
                                    <h4 className="text-xs font-medium text-gray-400 mb-1">Milestones:</h4>
                                    <ul className="space-y-1">
                                      {job.milestones.map((milestone, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-xs text-gray-300">
                                          <span>Cột mốc {milestone.index !== undefined ? milestone.index + 1 : idx + 1}: {milestone.amount ? milestone.amount / 100_000_000 : 0} APT</span>
                                          <span className="ml-2 truncate">{milestone.status || '-'}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {/* Milestone Details Buttons */}
                                {job.milestone_states && Object.keys(job.milestone_states).length > 0 && (
                                  <div className="mt-2">
                                    <h4 className="text-xs font-medium text-blue-300 mb-1">Chi tiết cột mốc:</h4>
                                    <div className="space-y-2">
                                      {Object.entries(job.milestone_states).map(([index, state]: [string, any]) => {
                                        const milestoneIndex = Number(index);
                                        return (
                                          <div key={index} className="flex flex-wrap gap-1">
                                            {state.submission_cid && (
                                              <div className="flex flex-col gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30 text-xs"
                                                  onClick={() => handleViewMilestoneDetails(job.id, milestoneIndex, state.submission_cid, 'submission')}
                                                >
                                                  <Eye className="w-3 h-3 mr-1" />
                                                  Nộp {milestoneIndex + 1}
                                                </Button>
                                                <div className="text-xs text-gray-500">
                                                  CID: {decodeCID(state.submission_cid).slice(0, 10)}...
                                                </div>
                                              </div>
                                            )}
                                            {state.acceptance_cid && (
                                              <div className="flex flex-col gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30 text-xs"
                                                  onClick={() => handleViewMilestoneDetails(job.id, milestoneIndex, state.acceptance_cid, 'acceptance')}
                                                >
                                                  <Eye className="w-3 h-3 mr-1" />
                                                  Chấp nhận {milestoneIndex + 1}
                                                </Button>
                                                <div className="text-xs text-gray-500">
                                                  CID: {decodeCID(state.acceptance_cid).slice(0, 10)}...
                                                </div>
                                              </div>
                                            )}
                                            {state.rejection_cid && (
                                              <div className="flex flex-col gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-400/30 text-xs"
                                                  onClick={() => handleViewMilestoneDetails(job.id, milestoneIndex, state.rejection_cid, 'rejection')}
                                                >
                                                  <Eye className="w-3 h-3 mr-1" />
                                                  Từ chối {milestoneIndex + 1}
                                                </Button>
                                                <div className="text-xs text-gray-500">
                                                  CID: {decodeCID(state.rejection_cid).slice(0, 10)}...
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
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
              {filteredJobs.map((job, index) => {
                let status = '';
                if (job.completed) status = 'Đã hoàn thành';
                else if (canceledJobIds.has(job.id)) status = 'Đã hủy';
                else if (job.job_expired) status = 'Đã đóng';
                else if (job.locked) status = 'Đã khóa';
                else if (job.active && job.worker) status = 'Đang thực hiện';
                else if (job.active) status = 'Đang thực hiện';
                else status = 'Đã đóng';
                const jobWithStatus = { ...job, status };
                const statusObj = getJobStatus(jobWithStatus);
                const startTime = job.start_time ? new Date(job.start_time * 1000).toLocaleString() : 'Chưa xác định';
                const deadline = job.application_deadline ? new Date(job.application_deadline * 1000).toLocaleString() : 'Chưa xác định';
            
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={jobsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group h-full"
                  >
                    <Card className="min-h-[340px] flex flex-col justify-between group cursor-pointer hover:border-blue-500/50 transition-all duration-300 rounded-xl shadow-lg bg-gradient-to-br from-gray-900/70 to-gray-800/80 border border-white/10 p-6">
                      <CardHeader className="mb-2">
                        <CardTitle className="text-2xl font-bold text-blue-400 mb-1 truncate">
                          {job?.title ? job.title : `Job ID: ${job.id}`}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-300 font-medium truncate">
                            Người đăng: {job.poster ? `${job.poster.slice(0, 6)}...${job.poster.slice(-4)}` : ''}
                          </span>
                          {job.poster && <Copy size={14} className="cursor-pointer hover:text-white flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleCopy(job.poster, 'Địa chỉ người đăng'); }} />}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <div className="mb-2 text-gray-400 text-sm">
                          <span className="block">
                            <Clock className="inline w-4 h-4 text-orange-400 mr-1" />
                            Bắt đầu: {startTime}
                          </span>
                          <span className="block">
                            <Clock className="inline w-4 h-4 text-orange-400 mr-1" />
                            Deadline: {deadline}
                          </span>
                        </div>
                        {/* <div className="mb-2 text-green-400 font-semibold text-lg">
                          Mức thuê: {job.escrowed_amount ? Number(job.escrowed_amount) / 100_000_000 : 0} APT
                        </div> */}
                        {job?.description && (
                          <div className="mb-2 text-gray-300 text-sm line-clamp-2 break-words">
                            {job.description}
                          </div>
                        )}
                        
                        {Array.isArray(job.milestones) && job.milestones.length > 0 && 'milestone_deadlines' in job && 'start_time' in job && 'duration_per_milestone' in job && (
                          <div className="mt-2">
                            <h4 className="text-xs font-medium text-gray-400 mb-1">Milestones:</h4>
                            <ul className="space-y-1">
                              {job.milestones.map((milestone, idx) => {
                                let deadline = '';
                                if (job.approved && Array.isArray(job.milestone_deadlines) && job.milestone_deadlines[idx]) {
                                  deadline = new Date(job.milestone_deadlines[idx] * 1000).toLocaleDateString();
                                }
                                if (typeof milestone === 'object' && milestone !== null && 'amount' in milestone) {
                                  return (
                                    <li key={idx} className="flex justify-between items-center text-xs text-gray-300">
                                      <span>Cột mốc {milestone.index !== undefined ? milestone.index + 1 : idx + 1}: {milestone.amount ? milestone.amount / 100_000_000 : 0} APT{Array.isArray(job.duration_per_milestone) && job.duration_per_milestone[idx] && <span className="ml-2 text-yellow-400">({Math.round(job.duration_per_milestone[idx] / (24 * 60 * 60))} ngày)</span>}{deadline && <span className="ml-2 text-gray-400"></span>}</span>
                                      <span className="ml-2 truncate">{milestone.status || '-'}</span>
                                    </li>
                                  );
                                } else {
                                  return (
                                    <li key={idx} className="flex justify-between items-center text-xs text-gray-300">
                                      <span>Cột mốc {idx + 1}: {typeof milestone === 'number' ? milestone / 100_000_000 : String(milestone)} APT{Array.isArray(job.duration_per_milestone) && job.duration_per_milestone[idx] && <span className="ml-2 text-yellow-400">({Math.round(job.duration_per_milestone[idx] / (24 * 60 * 60))} ngày)</span>}{deadline && <span className="ml-2 text-gray-400"></span>}</span>
                                    </li>
                                  );
                                }
                              })}
                            </ul>
                          </div>
                        )}
                        <div className="flex gap-2 mt-auto pt-4">
                          <Badge className={statusObj.color}>{statusObj.label}</Badge>
                          {job.active && !job.completed && !job.job_expired && (
                            <Button
                              className="ml-auto bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30 px-4 py-2 rounded-full text-sm font-semibold shadow"
                              onClick={() => handleApplyToJob(job)}
                            >
                              Ứng tuyển
                            </Button>
                          )}
                        </div>

                        {/* View All Events Button */}
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30 text-xs w-full"
                            onClick={() => handleViewJobEvents(job.id)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Xem tất cả sự kiện
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
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
                }}
                variant="outline"
                className="group relative z-10 cursor-pointer overflow-hidden rounded-full font-semibold py-3 px-8 transition-all duration-300 shadow bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
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
        <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white truncate">
              Ứng tuyển dự án
            </DialogTitle>
            <DialogDescription className="text-gray-400 truncate">
              {selectedJob?.title ? selectedJob.title : `Job ID: ${selectedJob?.id}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-white/10">
              <h4 className="font-medium text-white mb-2 truncate">Thông tin dự án</h4>
              {selectedJob?.description && (
                <div className="mb-2 text-gray-300 text-sm line-clamp-3 break-words">
                  {selectedJob.description}
                </div>
              )}
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between items-center">
                  <span>Người đăng:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{selectedJob?.poster ? `${selectedJob.poster.slice(0, 6)}...${selectedJob.poster.slice(-4)}` : '-'}</span>
                    {selectedJob?.poster && <Copy size={14} className="cursor-pointer hover:text-white" onClick={() => handleCopy(selectedJob.poster, 'Địa chỉ người đăng')} />}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Escrowed:</span>
                  <span className="text-green-400">{selectedJob?.escrowed_amount ? Number(selectedJob.escrowed_amount) / 100_000_000 : 0} APT</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian bắt đầu:</span>
                  <span>{selectedJob?.start_time ? new Date(selectedJob.start_time * 1000).toLocaleString() : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deadline:</span>
                  <span>{selectedJob?.application_deadline ? new Date(selectedJob.application_deadline * 1000).toLocaleString() : '-'}</span>
                </div>
              </div>
              {Array.isArray(selectedJob?.milestones) && selectedJob.milestones.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Milestones:</h4>
                  <ul className="space-y-1">
                    {selectedJob.milestones.slice(0, 3).map((m, idx) => {
                      let deadline = '';
                      if ('milestone_deadlines' in selectedJob && Array.isArray(selectedJob.milestone_deadlines) && selectedJob.milestone_deadlines[idx]) {
                        deadline = new Date(selectedJob.milestone_deadlines[idx] * 1000).toLocaleDateString();
                      } else if ('start_time' in selectedJob && 'duration_per_milestone' in selectedJob && Array.isArray(selectedJob.duration_per_milestone) && selectedJob.duration_per_milestone.length > 0) {
                        let sumDuration = 0;
                        for (let i = 0; i <= idx; i++) {
                          sumDuration += selectedJob.duration_per_milestone[i] || 0;
                        }
                        if (sumDuration > 0 && selectedJob.start_time) {
                          deadline = new Date((selectedJob.start_time + sumDuration) * 1000).toLocaleDateString();
                        }
                      }
                      if (typeof m === 'object' && m !== null && 'amount' in m) {
                        return (
                          <li key={idx} className="flex justify-between text-xs text-gray-300">
                            <span>Cột mốc {m.index !== undefined ? m.index + 1 : idx + 1}: {m.amount ? m.amount / 100_000_000 : 0} APT{Array.isArray(selectedJob.duration_per_milestone) && selectedJob.duration_per_milestone[idx] && <span className="ml-2 text-yellow-400">({Math.round(selectedJob.duration_per_milestone[idx] / (24 * 60 * 60))} ngày)</span>}{deadline && <span className="ml-2 text-gray-400"></span>}</span>
                            <span className="ml-2 truncate">{m.status || '-'}</span>
                          </li>
                        );
                      } else {
                        return (
                          <li key={idx} className="flex justify-between text-xs text-gray-300">
                            <span>Cột mốc {idx + 1}: {typeof m === 'number' ? m / 100_000_000 : String(m)}{Array.isArray(selectedJob.duration_per_milestone) && selectedJob.duration_per_milestone[idx] && <span className="ml-2 text-yellow-400">({Math.round(selectedJob.duration_per_milestone[idx] / (24 * 60 * 60))} ngày)</span>}{deadline && <span className="ml-2 text-gray-400"></span>}</span>
                          </li>
                        );
                      }
                    })}
                    {selectedJob.milestones.length > 3 && <li className="text-xs text-gray-500">...và {selectedJob.milestones.length - 3} cột mốc khác</li>}
                  </ul>
                </div>
              )}
            </div>
            <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded p-2">
              Khi ứng tuyển, bạn sẽ bị khóa tạm thời 1 APT. Nếu bị từ chối hoặc tự rút ứng tuyển, số tiền này sẽ được hoàn lại.
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSendApplication}
                className="group relative z-10 w-full cursor-pointer overflow-hidden rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30 font-semibold py-3 px-8 transition-all duration-300 shadow"
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
              {selectedJob && selectedJob.active && !selectedJob.approved && hasApplied && (
                <Button
                  variant="outline"
                  onClick={handleWithdrawApply}
                  disabled={withdrawing}
                  className="group relative w-full z-10 cursor-pointer overflow-hidden rounded-full font-semibold py-3 px-8 transition-all duration-300 shadow bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                >
                  {withdrawing ? 'Đang rút...' : 'Rút ứng tuyển'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setApplyDialogOpen(false)}
                className="group relative w-full z-10 cursor-pointer overflow-hidden rounded-full font-semibold py-3 px-8 transition-all duration-300 shadow bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
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

      {/* Milestone Details Dialog */}
      <Dialog open={viewMilestoneDialogOpen} onOpenChange={setViewMilestoneDialogOpen}>
        <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Chi tiết cột mốc {selectedMilestoneIndex + 1}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedMilestoneType === 'submission' ? 'Thông tin nộp cột mốc' : 
               selectedMilestoneType === 'acceptance' ? 'Thông tin chấp nhận cột mốc' : 
               'Thông tin từ chối cột mốc'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loadingMilestoneDetails ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : milestoneDetails ? (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Thông tin cơ bản</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Job ID:</span>
                      <span className="text-white ml-2">{selectedJobId}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Cột mốc:</span>
                      <span className="text-white ml-2">{selectedMilestoneIndex + 1}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Loại:</span>
                      <span className="text-white ml-2">
                        {selectedMilestoneType === 'submission' ? 'Nộp' : 
                         selectedMilestoneType === 'acceptance' ? 'Chấp nhận' : 'Từ chối'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">CID:</span>
                      <span className="text-white ml-2 font-mono text-xs break-all">{selectedMilestoneCid}</span>
                    </div>
                  </div>
                </div>

                {/* Action Details */}
                {milestoneDetails.action && (
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">Chi tiết hành động</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Hành động:</span>
                        <span className="text-white ml-2">{getActionDisplayName(milestoneDetails.action)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Thời gian:</span>
                        <span className="text-white ml-2">{formatTimestamp(milestoneDetails.timestamp)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Địa chỉ người dùng:</span>
                        <span className="text-white ml-2 font-mono text-xs">{milestoneDetails.userAddress}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message */}
                {milestoneDetails.message && (
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {selectedMilestoneType === 'submission' ? 'Mô tả công việc' : 
                       selectedMilestoneType === 'acceptance' ? 'Ghi chú chấp nhận' : 'Lý do từ chối'}
                    </h3>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{milestoneDetails.message}</p>
                  </div>
                )}

                {/* Link */}
                {milestoneDetails.link && (
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">Link tham khảo</h3>
                    <a 
                      href={milestoneDetails.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm break-all"
                    >
                      {milestoneDetails.link}
                    </a>
                  </div>
                )}

                {/* File Info */}
                {milestoneDetails.fileInfo && (
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">Thông tin file</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Tên file:</span>
                        <span className="text-white ml-2">{milestoneDetails.fileInfo.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Kích thước:</span>
                        <span className="text-white ml-2">{formatFileSize(milestoneDetails.fileInfo.size)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Loại file:</span>
                        <span className="text-white ml-2">{milestoneDetails.fileInfo.type}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {milestoneDetails.metadata && (
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">Metadata</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Loại hành động:</span>
                        <span className="text-white ml-2">{milestoneDetails.metadata.actionType}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Mô tả:</span>
                        <span className="text-white ml-2">{milestoneDetails.metadata.description}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw Data (for debugging) */}
                <details className="bg-gray-800/50 p-4 rounded-lg">
                  <summary className="text-lg font-semibold text-white cursor-pointer">Dữ liệu thô</summary>
                  <pre className="text-xs text-gray-300 mt-2 overflow-x-auto">
                    {JSON.stringify(milestoneDetails, null, 2)}
                  </pre>
                </details>

                {/* CID Debug Info */}
                <details className="bg-gray-800/50 p-4 rounded-lg">
                  <summary className="text-lg font-semibold text-white cursor-pointer">Thông tin CID (Debug)</summary>
                  <div className="mt-2 space-y-2 text-xs">
                    <div>
                      <span className="text-gray-400">CID gốc:</span>
                      <span className="text-white ml-2 font-mono break-all">{JSON.stringify(selectedMilestoneCid)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">CID đã decode:</span>
                      <span className="text-white ml-2 font-mono break-all">{decodeCID(selectedMilestoneCid)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">IPFS URL:</span>
                      <a 
                        href={convertIPFSURL(decodeCID(selectedMilestoneCid))} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 ml-2 break-all"
                      >
                        {convertIPFSURL(decodeCID(selectedMilestoneCid))}
                      </a>
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Không có thông tin chi tiết</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Events Dialog */}
      <Dialog open={viewJobEventsDialogOpen} onOpenChange={setViewJobEventsDialogOpen}>
        <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Chi tiết sự kiện của dự án {selectedJobForEvents}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {loadingJobEvents ? 'Đang tải sự kiện...' : 'Tất cả sự kiện blockchain của dự án này'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loadingJobEvents ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : jobEventsDetails.length > 0 ? (
              <div className="space-y-4">
                {jobEventsDetails.map((event, index) => (
                  <div key={index} className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">{getEventDisplayName(event.type)}</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Job ID:</span>
                        <span className="text-white ml-2">{event.data.job_id}</span>
                      </div>
                      {event.data.time && (
                        <div>
                          <span className="text-gray-400">Thời gian:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.time)}</span>
                        </div>
                      )}
                      {event.data.start_time && (
                        <div>
                          <span className="text-gray-400">Thời gian đăng dự án:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.start_time)}</span>
                        </div>
                      )}

                      {event.data.application_deadline && (
                        <div>
                          <span className="text-gray-400">Thời hạn ứng tuyển:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.application_deadline)}</span>
                        </div>
                      )}
                      {event.data.poster && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Người đăng:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono text-xs">{event.data.poster}</span>
                            <Copy size={12} className="cursor-pointer hover:text-white" onClick={() => handleCopy(event.data.poster, 'Địa chỉ người đăng')} />
                          </div>
                        </div>
                      )}
                      {event.data.worker && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Người làm:</span>
                           <div className="flex items-center gap-2">
                            <span className="text-white font-mono text-xs">{event.data.worker}</span>
                            <Copy size={12} className="cursor-pointer hover:text-white" onClick={() => handleCopy(event.data.worker, 'Địa chỉ người làm')} />
                          </div>
                        </div>
                      )}
                       {event.data.to && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Đến địa chỉ:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono text-xs">{event.data.to}</span>
                            <Copy size={12} className="cursor-pointer hover:text-white" onClick={() => handleCopy(event.data.to, 'Địa chỉ ví')} />
                          </div>
                        </div>
                      )}
                      {event.data.amount && (
                        <div>
                          <span className="text-gray-400">Số tiền:</span>
                          <span className="text-white ml-2">{Number(event.data.amount) / 100_000_000} APT</span>
                        </div>
                      )}
                      {event.data.worker_amount && (
                        <div>
                          <span className="text-gray-400">Worker nhận:</span>
                          <span className="text-white ml-2">{Number(event.data.worker_amount) / 100_000_000} APT</span>
                        </div>
                      )}
                      {event.data.poster_amount && (
                        <div>
                          <span className="text-gray-400">Poster nhận:</span>
                          <span className="text-white ml-2">{Number(event.data.poster_amount) / 100_000_000} APT</span>
                        </div>
                      )}
                      {event.data.escrow_amount && (
                        <div>
                          <span className="text-gray-400">Escrow nhận:</span>
                          <span className="text-white ml-2">{Number(event.data.escrow_amount) / 100_000_000} APT</span>
                        </div>
                      )}
                      {event.data.reason && (
                        <div>
                          <span className="text-gray-400">Lý do:</span>
                          <span className="text-white ml-2">{event.data.reason === '1' ? 'Worker tự rút' : event.data.reason === '2' ? 'Poster từ chối' : 'Mở lại job'}</span>
                        </div>
                      )}
                      {event.data.poster_confirmed !== undefined && (
                        <div>
                          <span className="text-gray-400">Poster xác nhận:</span>
                          <span className="text-white ml-2 inline-flex items-center">
                            {event.data.poster_confirmed ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                          </span>
                        </div>
                      )}
                      {event.data.worker_confirmed !== undefined && (
                        <div>
                          <span className="text-gray-400">Worker xác nhận:</span>
                          <span className="text-white ml-2 inline-flex items-center">
                            {event.data.worker_confirmed ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                          </span>
                        </div>
                      )}
                      {event.data.milestone !== undefined && (
                        <div>
                          <span className="text-gray-400">Cột mốc:</span>
                          <span className="text-white ml-2">{Number(event.data.milestone) + 1}</span>
                        </div>
                      )}
                      {event.data.submit_time && (
                        <div>
                          <span className="text-gray-400">Thời gian nộp:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.submit_time)}</span>
                        </div>
                      )}
                      {event.data.accept_time && (
                        <div>
                          <span className="text-gray-400">Thời gian chấp nhận:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.accept_time)}</span>
                        </div>
                      )}
                      {event.data.reject_time && (
                        <div>
                          <span className="text-gray-400">Thời gian từ chối:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.reject_time)}</span>
                        </div>
                      )}
                      {event.data.approve_time && (
                        <div>
                          <span className="text-gray-400">Thời gian duyệt:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.approve_time)}</span>
                        </div>
                      )}
                      {event.data.apply_time && (
                        <div>
                          <span className="text-gray-400">Thời gian ứng tuyển:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.apply_time)}</span>
                        </div>
                      )}
                      {event.data.cancel_time && (
                        <div>
                          <span className="text-gray-400">Thời gian hủy:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.cancel_time)}</span>
                        </div>
                      )}
                      {event.data.complete_time && (
                        <div>
                          <span className="text-gray-400">Thời gian hoàn thành:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.complete_time)}</span>
                        </div>
                      )}
                      {event.data.expire_time && (
                        <div>
                          <span className="text-gray-400">Thời gian hết hạn:</span>
                          <span className="text-white ml-2">{formatTimestamp(event.data.expire_time)}</span>
                        </div>
                      )}
                      {event.data.reject_count !== undefined && (
                        <div>
                          <span className="text-gray-400">Số lần từ chối:</span>
                          <span className="text-white ml-2">{event.data.reject_count}</span>
                        </div>
                      )}
                      {event.data.work_cid && (
                        <div>
                          <span className="text-gray-400">CID công việc:</span>
                          <span className="text-white ml-2 font-mono text-xs break-all">{decodeCID(event.data.work_cid)}</span>
                        </div>
                      )}
                      {event.data.acceptance_cid && (
                        <div>
                          <span className="text-gray-400">CID chấp nhận:</span>
                          <span className="text-white ml-2 font-mono text-xs break-all">{decodeCID(event.data.acceptance_cid)}</span>
                        </div>
                      )}
                      {event.data.rejection_cid && (
                        <div>
                          <span className="text-gray-400">CID từ chối:</span>
                          <span className="text-white ml-2 font-mono text-xs break-all">{decodeCID(event.data.rejection_cid)}</span>
                        </div>
                      )}
                      {event.data.cid && (
                        <div>
                          <span className="text-gray-400">CID:</span>
                          <span className="text-white ml-2 font-mono text-xs break-all">{decodeCID(event.data.cid)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Không có sự kiện nào cho dự án này</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Jobs;
