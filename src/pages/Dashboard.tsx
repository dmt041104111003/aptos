import { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {

  DollarSign,
  Clock,
  CheckCircle,

  X,
  Upload
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';
import { useWallet } from '../context/WalletContext';
import { useProfile } from '../contexts/ProfileContext';
import { convertIPFSURL } from '@/utils/ipfs';
import { toast } from '@/components/ui/sonner';
import { aptos, fetchProfileDetails } from '@/utils/aptosUtils';

interface JobPost {
  id: string; 
  poster: string;
  cid: string;
  start_time: number;
  end_time: number;
  milestones: number[];
  duration_per_milestone: number[];
  worker: string | null;
  approved: boolean;
  active: boolean;
  current_milestone: number;
  milestone_states: { [key: number]: { submitted: boolean; accepted: boolean; submit_time: number; reject_count: number } };
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


type MilestoneData = {
  submitted: boolean;
  accepted: boolean;
  submit_time: number | string;
  reject_count: number;
};

const JOBS_CONTRACT_ADDRESS = "0x3bedba4da817a6ef620393ed3f1d5ccf4a527af2586dff6b3aaa35201ca04490";
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v29";

const TABS = [
  { key: 'in-progress', label: 'Đang thực hiện' },
  { key: 'completed', label: 'Đã hoàn thành' },
  { key: 'canceled', label: 'Đã hủy' },
  { key: 'locked', label: 'Đã khóa' },
  { key: 'closed', label: 'Đã đóng' },
];

const getJobStatus = (job: JobPost) => {
  if (job.completed) return { label: 'Đã hoàn thành', color: 'bg-blue-700/30 text-blue-300', key: 'completed' };
  if (job.job_expired) return { label: 'Đã hủy', color: 'bg-red-700/30 text-red-300', key: 'canceled' };
  if (job.locked) return { label: 'Đã khóa', color: 'bg-gray-700/30 text-gray-300', key: 'locked' };
  if (job.active && job.worker) return { label: 'Đang thực hiện', color: 'bg-green-700/30 text-green-300', key: 'in-progress' };
  if (job.active && !job.worker) return { label: 'Đang tuyển', color: 'bg-yellow-700/30 text-yellow-300', key: 'in-progress' };
  return { label: 'Đã đóng', color: 'bg-gray-400/20 text-gray-400', key: 'closed' };
};


const Dashboard = () => {
  const { account, accountType } = useWallet();
  const { refetchProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<string>('in-progress');
  const [inProgressJobs, setInProgressJobs] = useState<JobPost[]>([]);
  const [completedJobs, setCompletedJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });

  useEffect(() => {
    loadUserJobs();
  }, [account, accountType]);

  const loadUserJobs = async () => {
    if (!account || accountType !== 'aptos') {
      setLoading(false);
      setError("Vui lòng kết nối ví Aptos để xem công việc của bạn.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedInProgressJobs: (JobPost & { title?: string; description?: string })[] = [];
      const fetchedCompletedJobs: (JobPost & { title?: string; description?: string })[] = [];

      const eventsResource = await aptos.getAccountResource({
        accountAddress: JOBS_CONTRACT_ADDRESS,
        resourceType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Events`,
      });

      if (!eventsResource || !(eventsResource as any).post_event?.guid?.id) {
        setLoading(false);
        return;
      }

      const rawPostedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
        options: { limit: 100 },
      });

   
      const jobDetailsMap = new Map<string, any>();
      for (const event of rawPostedEvents) {
        let jobCid = event.data.cid;
        if (typeof jobCid === 'string' && jobCid.startsWith('0x')) {
          const hex = jobCid.replace(/^0x/, '');
          const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
          jobCid = new TextDecoder().decode(bytes);
        } else if (Array.isArray(jobCid)) {
          jobCid = new TextDecoder().decode(new Uint8Array(jobCid));
        }
        if (jobCid) {
          try {
            const jobDetailsUrl = convertIPFSURL(jobCid);
            const response = await fetch(jobDetailsUrl);
            if (response.ok) {
              const jobDataFromIPFS = await response.json();
              jobDetailsMap.set(event.data.job_id.toString(), jobDataFromIPFS);
            }
          } catch {}
        }
      }

      const jobsResource = await aptos.getAccountResource({
        accountAddress: JOBS_CONTRACT_ADDRESS,
        resourceType: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Jobs`,
      });
      if (!jobsResource || !(jobsResource as any).jobs?.handle) {
        setLoading(false);
        return;
      }
      const jobsTableHandle = (jobsResource as any).jobs.handle;

      for (const event of rawPostedEvents) {
        const jobId = event.data.job_id.toString();
        let jobOnChain: any = null;
        try {
          jobOnChain = await aptos.getTableItem<any>({
            handle: jobsTableHandle,
            data: {
              key_type: "u64",
              value_type: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Job`,
              key: jobId,
            },
          });
        } catch {}
        if (!jobOnChain) continue;
        const jobDataFromIPFS: Record<string, any> = jobDetailsMap.get(jobId) || {};

   
        let worker: string | null = null;
        if (jobOnChain.worker) {
          if (typeof jobOnChain.worker === 'string') {
            worker = jobOnChain.worker;
          } else if (typeof jobOnChain.worker === 'object' && jobOnChain.worker !== null) {
            if ('vec' in jobOnChain.worker && Array.isArray(jobOnChain.worker.vec) && jobOnChain.worker.vec.length > 0) {
              worker = jobOnChain.worker.vec[0];
            } else if ('some' in jobOnChain.worker) {
              worker = jobOnChain.worker.some;
            }
          }
        }

        const milestoneStatesHandle = jobOnChain.milestone_states?.handle;
        let milestone_states = {};
        if (milestoneStatesHandle && Array.isArray(jobOnChain.milestones)) {
          for (let i = 0; i < jobOnChain.milestones.length; i++) {
            try {
              const milestoneData = await aptos.getTableItem({
                handle: milestoneStatesHandle,
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
              };
            } catch (e) {
 
            }
          }
        }

        const jobPost: JobPost & { title?: string; description?: string } = {
          id: jobId,
          poster: jobOnChain.poster,
          cid: jobDataFromIPFS.cid || '',
          start_time: Number(jobOnChain.start_time),
          end_time: Number(jobOnChain.end_time || 0),
          milestones: jobOnChain.milestones ? jobOnChain.milestones.map(Number) : [],
          duration_per_milestone: jobOnChain.duration_per_milestone ? jobOnChain.duration_per_milestone.map(Number) : [],
          worker: worker,
          approved: jobOnChain.approved,
          active: jobOnChain.active,
          current_milestone: Number(jobOnChain.current_milestone),
          milestone_states: milestone_states,
          submit_time: jobOnChain.submit_time ? Number(jobOnChain.submit_time) : null,
          escrowed_amount: Number(jobOnChain.escrowed_amount),
          approve_time: jobOnChain.approve_time ? Number(jobOnChain.approve_time) : null,
          poster_did: jobOnChain.poster_did,
          poster_profile_cid: jobOnChain.poster_profile_cid,
          completed: jobOnChain.completed,
          rejected_count: Number(jobOnChain.rejected_count),
          job_expired: jobOnChain.job_expired,
          milestone_deadlines: jobOnChain.milestone_deadlines ? jobOnChain.milestone_deadlines.map(Number) : [],
          application_deadline: Number(jobOnChain.application_deadline),
          last_reject_time: jobOnChain.last_reject_time ? Number(jobOnChain.last_reject_time) : null,
          locked: jobOnChain.locked,
          title: jobOnChain.title || jobDataFromIPFS.title,
          description: jobOnChain.description || jobDataFromIPFS.description,
        };
        const userAddress = account.toLowerCase();
        const isPoster = jobPost.poster.toLowerCase() === userAddress;
        const isWorker = jobPost.worker && jobPost.worker.toLowerCase() === userAddress;
        if (isPoster || isWorker) {
          if (jobPost.completed || jobPost.job_expired || !jobPost.active) {
            fetchedCompletedJobs.push(jobPost);
          } else {
            fetchedInProgressJobs.push(jobPost);
          }
        }

        console.log('DEBUG milestone_states raw:', jobOnChain.milestone_states);
      }
      setInProgressJobs(fetchedInProgressJobs);
      setCompletedJobs(fetchedCompletedJobs);
      setLoading(false);
    } catch (error: any) {
      setError(`Failed to load jobs: ${error.message || "Unknown error"}`);
      setLoading(false);
    }
  };

  // const formatPostedTime = (timestamp: number) => {
  //   const now = Date.now() / 1000;
  //   const diffSeconds = now - timestamp;

  //   if (diffSeconds < 60) return `${Math.floor(diffSeconds)} giây trước`;
  //   const diffMinutes = diffSeconds / 60;
  //   if (diffMinutes < 60) return `${Math.floor(diffMinutes)} phút trước`;
  //   const diffHours = diffMinutes / 60;
  //   if (diffHours < 24) return `${Math.floor(diffHours)} giờ trước`;
  //   const diffDays = diffHours / 24;
  //   return `${Math.floor(diffDays)} ngày trước`;
  // };

  const getMilestoneStatus = (job: JobPost, index: number) => {
    const milestoneData = job.milestone_states[index];
    if (!milestoneData) return 'Chưa khởi tạo';
    if (milestoneData.accepted) return 'Đã chấp nhận';
    if (milestoneData.submitted) return 'Đã nộp, đang chờ';
    if (milestoneData.reject_count > 0) return `Đã từ chối (${milestoneData.reject_count})`;
    return 'Chưa nộp';
  };

  // const getMilestoneBadgeVariant = (job: JobPost, index: number) => {
  //   const milestoneData = job.milestone_states[index];
  //   if (!milestoneData) return 'secondary'; 
  //   if (milestoneData.accepted) return 'default';
  //   if (milestoneData.submitted) return 'secondary';
  //   if (milestoneData.reject_count > 0) return 'destructive';
  //   return 'outline';
  // };

  const handleApproveWorker = async (jobId: string, workerAddress: string) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để chấp nhận ứng viên.');
      return;
    }
    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::approve_worker`,
        type_arguments: [],
        arguments: [String(jobId), workerAddress]
      });
      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Ứng viên đã được chấp nhận thành công!');
      loadUserJobs();
      refetchProfile();
    } catch (error: any) {
      if (error?.message?.includes('EALREADY_HAS_WORKER')) {
        toast.error('Job đã có worker, không thể duyệt lại.');
      } else if (error?.message?.includes('EWORKER_NOT_APPLIED')) {
        toast.error('Chưa có ứng viên nào để duyệt.');
      } else if (error?.message?.includes('ENOT_SELECTED')) {
        toast.error('Chỉ được duyệt đúng ứng viên đang apply.');
      } else if (error?.message?.includes('ENOT_POSTER')) {
        toast.error('Bạn không phải chủ job này.');
      } else if (error?.message?.includes('ENO_PROFILE')) {
        toast.error('Ứng viên chưa có hồ sơ.');
      } else if (error?.message?.includes('EJOB_NOT_FOUND')) {
        toast.error('Job không tồn tại.');
      } else {
        toast.error(`Chấp nhận ứng viên thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
      }
    }
  };

  const handleSubmitMilestone = async (jobId: string, milestoneIndex: number) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để nộp cột mốc.');
      return;
    }

    try {
      console.log('Submitting milestone:', { jobId, milestoneIndex });
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::submit_milestone`,
        type_arguments: [],
        arguments: [
          Number(jobId), 
          Number(milestoneIndex) 
        ]
      });

      console.log('Transaction submitted:', transaction);
      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      console.log('Transaction confirmed');
      
      toast.success(`Cột mốc ${milestoneIndex + 1} đã được nộp thành công!`);
      

      console.log('Loading jobs after submission...');
      await loadUserJobs();
      console.log('Jobs loaded after submission');
      
      refetchProfile();
    } catch (error: any) {
      console.error('Nộp cột mốc thất bại:', error);
      toast.error(`Nộp cột mốc thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleAcceptMilestone = async (jobId: string, milestoneIndex: number) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để chấp nhận cột mốc.');
      return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::accept_milestone`,
        type_arguments: [],
        arguments: [
          Number(jobId), 
          Number(milestoneIndex) 
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success(`Cột mốc ${milestoneIndex + 1} đã được chấp nhận thành công!`);
      loadUserJobs();
      refetchProfile(); 
    } catch (error: any) {
      console.error('Chấp nhận cột mốc thất bại:', error);
      toast.error(`Chấp nhận cột mốc thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleRejectMilestone = async (jobId: string, milestoneIndex: number) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để từ chối cột mốc.');
      return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::reject_milestone`,
        type_arguments: [],
        arguments: [
          Number(jobId),
          Number(milestoneIndex) 
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success(`Cột mốc ${milestoneIndex + 1} đã được từ chối.`);
      loadUserJobs();
      refetchProfile(); 
    } catch (error: any) {
      console.error('Từ chối cột mốc thất bại:', error);
      toast.error(`Từ chối cột mốc thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để hủy dự án.');
      return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::cancel_job`,
        type_arguments: [],
        arguments: [
          jobId // job_id: u64
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Dự án đã được hủy thành công!');
      loadUserJobs();
      refetchProfile(); 
    } catch (error: any) {
      console.error('Hủy dự án thất bại:', error);
      toast.error(`Hủy dự án thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để hoàn thành dự án.');
      return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::complete_job`,
        type_arguments: [],
        arguments: [
          jobId 
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Dự án đã được đánh dấu hoàn thành thành công!');
      loadUserJobs();
      refetchProfile(); 
    } catch (error: any) {
      console.error('Hoàn thành dự án thất bại:', error);
      toast.error(`Hoàn thành dự án thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleExpireJob = async (jobId: string) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để đánh dấu hết hạn dự án.');
      return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::expire_job`,
        type_arguments: [],
        arguments: [
          jobId 
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Dự án đã được đánh dấu hết hạn thành công!');
      loadUserJobs();
      refetchProfile(); 
    } catch (error: any) {
      console.error('Đánh dấu hết hạn dự án thất bại:', error);
      toast.error(`Đánh dấu hết hạn dự án thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  // const handleCopy = (text: string) => {
  //   navigator.clipboard.writeText(text)
  //     .then(() => toast.success("Đã sao chép địa chỉ ví!"))
  //     .catch(() => toast.error("Không thể sao chép."));
  // };

  // const handleApplyJob = async (jobId: string) => {
  //   if (!account || accountType !== 'aptos' || !window.aptos) {
  //     toast.error('Vui lòng kết nối ví Aptos để ứng tuyển.');
  //     return;
  //   }
  //   try {
  //     const transaction = await window.aptos.signAndSubmitTransaction({
  //       type: "entry_function_payload",
  //       function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::apply`,
  //       type_arguments: [],
  //       arguments: [jobId]
  //     });
  //     await aptos.waitForTransaction({ transactionHash: transaction.hash });
  //     toast.success('Đơn ứng tuyển của bạn đã được gửi thành công!');
  //     loadUserJobs();
  //   } catch (error: any) {
  //     if (error?.message?.includes('EALREADY_APPLIED') || error?.message?.includes('code: 15')) {
  //       toast.error('Bạn đã apply, vui lòng chờ 8 tiếng mới được apply lại.');
  //     } else {
  //       toast.error(`Ứng tuyển thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
  //     }
  //   }
  // };

  const handleRejectWorker = async (jobId: string) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để từ chối ứng viên.');
      return;
    }
    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::reopen_applications`,
        type_arguments: [],
        arguments: [jobId]
      });
      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Đã từ chối ứng viên và mở lại job cho người khác apply!');
      loadUserJobs();
    } catch (error: any) {
      toast.error(`Từ chối ứng viên thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const renderJobCard = (job: JobPost & { title?: string; description?: string }, type: string) => {
    const userAddress = account?.toLowerCase();
    const isPoster = job.poster.toLowerCase() === userAddress;
    const isWorker = job.worker && job.worker.toLowerCase() === userAddress;
    const statusObj = getJobStatus(job);
    const canCancel = isPoster && job.active && (!job.worker || job.current_milestone === 0);
    const canComplete = isPoster && job.active && job.worker && job.current_milestone === job.milestones.length;
    const canExpire = isPoster && !job.completed && !job.job_expired && job.active && (Date.now() / 1000) > job.application_deadline;
    const canSubmitMilestone = isWorker && job.active && !job.completed;
    console.log('DEBUG JOB:', job);

    return (
      <motion.div
        key={job.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/80 border border-white/10 p-6 rounded-xl shadow-lg hover:border-blue-500/50 transition-all duration-300 flex flex-col h-full">
          <CardHeader className="mb-2">
            <CardTitle className="text-2xl font-bold text-blue-400 mb-1 truncate">
              {job.title ? job.title : `Job ID: ${job.id}`}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-300 font-medium truncate">
                Người đăng: {job.poster ? `${job.poster.slice(0, 6)}...${job.poster.slice(-4)}` : ''}
              </span>
              <span className="text-sm text-green-400 font-medium truncate ml-4">
                Người làm: {job.worker ? `${job.worker.slice(0, 6)}...${job.worker.slice(-4)}` : <span className="text-gray-500">Chưa có</span>}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            {job.description && (
              <div className="mb-2 text-gray-300 text-sm line-clamp-2 break-words">
                {job.description}
              </div>
            )}
            <div className="mb-2 text-gray-400 text-sm space-y-1">
              <div>
                <Clock className="inline w-4 h-4 text-orange-400 mr-1" />
                Bắt đầu: {job.start_time ? new Date(job.start_time * 1000).toLocaleString() : '-'}
              </div>
              <div>
                <Clock className="inline w-4 h-4 text-orange-400 mr-1" />
                Deadline ứng tuyển: {job.application_deadline ? new Date(job.application_deadline * 1000).toLocaleString() : '-'}
              </div>
              <div>
                <DollarSign className="w-5 h-5 inline mr-1 text-green-400" />
                Escrowed: {job.escrowed_amount ? job.escrowed_amount / 100_000_000 : 0} APT
              </div>
              <div>
                <span className="text-xs text-gray-400">Số lần bị từ chối: {job.rejected_count || 0}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400">{job.locked ? 'Job đã bị khóa' : ''}</span>
              </div>
            </div>

    
            {job.active && !job.completed && job.milestone_states && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Cột mốc hiện tại:</h4>
                {Object.entries(job.milestone_states).map(([index, state]: [string, any]) => {
                  const milestoneIndex = Number(index);
                  const milestoneData = state;
               
                  console.log({ milestoneIndex, milestoneData, isPoster, isWorker, jobId: job.id, jobActive: job.active, jobCompleted: job.completed, currentUser: account, poster: job.poster, worker: job.worker, currentMilestone: job.current_milestone });
                  // DEBUG: Luôn hiển thị button accept/reject nếu bật DEBUG_ALWAYS_SHOW_BUTTONS
                  // if (DEBUG_ALWAYS_SHOW_BUTTONS || (isPoster && milestoneData.submitted && !milestoneData.accepted)) {
                  //   return (
                  //     <div key={index} className="flex items-center justify-between gap-2 mb-2">
                  //       {/* <span className="text-sm text-gray-400">
                  //         [DEBUG] Cột mốc {milestoneIndex + 1} - submitted: {String(milestoneData.submitted)} - accepted: {String(milestoneData.accepted)}
                  //       </span> */}
                  //       <div className="flex gap-2">
                  //         <Button
                  //           size="sm"
                  //           className="bg-green-600/20 text-green-400 hover:bg-green-600/30"
                  //           onClick={() => handleAcceptMilestone(job.id, milestoneIndex)}
                  //         >
                  //           Chấp nhận
                  //         </Button>
                  //         <Button
                  //           size="sm"
                  //           variant="destructive"
                  //           className="bg-red-600/20 text-red-400 hover:bg-red-600/30"
                  //           onClick={() => handleRejectMilestone(job.id, milestoneIndex)}
                  //         >
                  //           Từ chối
                  //         </Button>
                  //       </div>
                  //     </div>
                  //   );
                  // }
                  // Worker can submit milestone
                  if (isWorker && !milestoneData.submitted && milestoneIndex === job.current_milestone) {
                    return (
                      <div key={index} className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm text-gray-400">
                          Cột mốc {milestoneIndex + 1} chưa được nộp
                        </span>
                        <Button
                          size="sm"
                          className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                          onClick={() => handleSubmitMilestone(job.id, milestoneIndex)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Nộp cột mốc
                        </Button>
                      </div>
                    );
                  }
             
                  return (
                    <div key={index} className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm text-gray-400">
                        Cột mốc {milestoneIndex + 1}: {getMilestoneStatus(job, milestoneIndex)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {Array.isArray(job.milestones) && job.milestones.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-medium text-gray-300 mb-1">Milestones:</h4>
                <ul className="space-y-1">
                  {job.milestones.map((m, idx) => {
                    const milestoneData = job.milestone_states && job.milestone_states[idx];
                    let milestoneStatus = '-';
                    if (milestoneData) {
                      if (milestoneData.accepted) milestoneStatus = 'Đã chấp nhận';
                      else if (milestoneData.submitted) milestoneStatus = 'Đã nộp';
                      else if (milestoneData.reject_count > 0) milestoneStatus = `Từ chối (${milestoneData.reject_count})`;
                      else milestoneStatus = 'Chưa nộp';
                    }
                    let deadline = '';
                    if (job.approved && job.milestone_deadlines && job.milestone_deadlines[idx]) {
                      deadline = new Date(job.milestone_deadlines[idx] * 1000).toLocaleDateString();
                    }
                    let completedAt = '';
                    if (milestoneData && milestoneData.accepted && milestoneData.submit_time) {
                      completedAt = new Date(milestoneData.submit_time * 1000).toLocaleDateString();
                    }
                    let durationDays = '';
                    if (Array.isArray(job.duration_per_milestone) && job.duration_per_milestone[idx]) {
                      durationDays = `${Math.round(job.duration_per_milestone[idx] / (24 * 60 * 60))} ngày`;
                    }
                    
                    const canSubmit = isWorker && job.active && !job.completed && job.current_milestone === idx && !milestoneData?.submitted && !job.locked;
                    return (
                      <li key={idx} className="flex flex-col gap-1 mb-2">
                        <div className="flex justify-between items-center text-xs text-gray-300">
                          <span>
                            Cột mốc {idx + 1}: {typeof m === 'number' ? m / 100_000_000 : 0} APT
                            {durationDays && <span className="ml-2 text-yellow-400">({durationDays})</span>}
                            {deadline && <span className="ml-2 text-gray-400">(Hạn: {deadline})</span>}
                            {completedAt && <span className="ml-2 text-green-400">(Hoàn thành: {completedAt})</span>}
                          </span>
                          <span className="ml-2 truncate">{milestoneStatus}</span>
                        </div>
                        {canSubmit && (
                          <div className="flex gap-2 mt-1">
                            <Button
                              size="sm"
                              className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                              onClick={() => handleSubmitMilestone(job.id, idx)}
                            >
                              Nộp cột mốc
                            </Button>
                          </div>
                        )}
                        {isPoster && milestoneData && milestoneData.submitted && !milestoneData.accepted && (
                          <div className="flex gap-2 mt-1">
                            <Button
                              size="sm"
                              className="bg-green-600/20 text-green-400 hover:bg-green-600/30"
                              onClick={() => handleAcceptMilestone(job.id, idx)}
                            >
                              Chấp nhận
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="bg-red-600/20 text-red-400 hover:bg-red-600/30"
                              onClick={() => handleRejectMilestone(job.id, idx)}
                            >
                              Từ chối
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {/* Action Buttons */}
            {(canCancel || canComplete || canExpire || canSubmitMilestone) && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-3 justify-end">
                {canCancel && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="bg-red-600/20 text-red-400 hover:bg-red-600/30"
                    onClick={() => handleCancelJob(job.id)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Hủy dự án
                  </Button>
                )}
                {canComplete && (
                  <Button 
                    size="sm" 
                    className="bg-green-600/20 text-green-400 hover:bg-green-600/30"
                    onClick={() => handleCompleteJob(job.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Hoàn thành dự án
                  </Button>
                )}
                {canExpire && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-orange-600/20 text-orange-400 hover:bg-orange-600/30"
                    onClick={() => handleExpireJob(job.id)}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Đánh dấu hết hạn
                  </Button>
                )}
                {canSubmitMilestone && (
                  <Button 
                    size="sm" 
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                    onClick={() => handleSubmitMilestone(job.id, job.current_milestone)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Nộp cột mốc
                  </Button>
                )}
              </div>
            )}
            {isPoster && job.worker && !job.approved && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  className="bg-green-600/20 text-green-400 hover:bg-green-600/30"
                  onClick={() => handleApproveWorker(job.id, job.worker)}
                >
                  Duyệt ứng viên
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-red-600/20 text-red-400 hover:bg-red-600/30"
                  onClick={() => handleRejectWorker(job.id)}
                >
                  Từ chối ứng viên
                </Button>
              </div>
            )}
            <div className="flex gap-2 mt-4 justify-end">
              <Badge className={statusObj.color}>{statusObj.label}</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
 

      <section ref={heroRef} className="relative py-20 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black">
        <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Bảng điều khiển của bạn
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Quản lý các dự án của bạn và theo dõi tiến độ.
            </p>
          </motion.div>
        </div>
      </section>

      <section ref={statsRef} className="py-16 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap justify-center gap-8 mb-12"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{inProgressJobs.length}</div>
              <div className="text-gray-400">Dự án đang tiến hành</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{completedJobs.length}</div>
              <div className="text-gray-400">Dự án đã hoàn thành</div>
            </div>
          </motion.div>

          <div className="flex border-b border-white/10 mb-8">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-lg font-semibold ${
                  activeTab === tab.key
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                } transition-colors duration-200`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-center py-20">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(() => {
                  const allJobs = [...inProgressJobs, ...completedJobs];
                  const filtered = allJobs.filter(job => getJobStatus(job).key === activeTab);
                  if (filtered.length === 0) {
                    return (
                      <div className="lg:col-span-2 text-center py-10 bg-gray-900/50 rounded-lg border border-white/10 text-gray-400">
                        Không có dự án nào ở trạng thái này.
                      </div>
                    );
                  }
                  return filtered.map(job => renderJobCard(job, activeTab));
                })()}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;