import { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DollarSign,
  Clock,
  CheckCircle,
  X,
  Upload,
  Link,
  FileText,
  Send,
  Eye,
  Download,
  XCircle,
  Copy,
  RefreshCw
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';
import { useWallet } from '../context/WalletContext';
import { useProfile } from '../contexts/ProfileContext';
import { convertIPFSURL } from '@/utils/ipfs';
import { toast } from '@/components/ui/sonner';
import { aptos, fetchProfileDetails, decodeCID, fetchMilestoneDetails, getMilestoneCIDs } from '@/utils/aptosUtils';
import { Label } from '@/components/ui/label';
import { uploadJSONToIPFS, uploadFileToIPFS } from '@/utils/pinata';

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
  withdraw_request?: string | null;
  cancel_request?: boolean;
  unlock_confirm_poster?: boolean;
  unlock_confirm_worker?: boolean;
}


type MilestoneData = {
  submitted: boolean;
  accepted: boolean;
  submit_time: number | string;
  reject_count: number;
  submission_cid?: any;
  acceptance_cid?: any;
  rejection_cid?: any;
};

const JOBS_CONTRACT_ADDRESS = "0x89adff5f04a2fb054a9d4765f54bb87465c9b0212e8f19326e6df4c5150bbcaf";
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v29";

const TABS = [
  { key: 'in-progress', label: 'Đang thực hiện' },
  { key: 'completed', label: 'Đã hoàn thành' },
  { key: 'canceled', label: 'Đã hủy' },
  { key: 'locked', label: 'Đã khóa' },
  { key: 'closed', label: 'Đã đóng' },
];

const getJobStatus = (job: JobPost) => {
  console.log('DEBUG getJobStatus:', {
    jobId: job.id,
    completed: job.completed,
    job_expired: job.job_expired,
    locked: job.locked,
    active: job.active,
    worker: job.worker
  });
  
  if (job.completed) return { label: 'Đã hoàn thành', color: 'bg-blue-700/30 text-blue-300', key: 'completed' };
  if (job.job_expired) return { label: 'Đã đóng', color: 'bg-gray-400/20 text-gray-400', key: 'closed' };
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

  // Milestone dialog states
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [milestoneAction, setMilestoneAction] = useState<'submit' | 'accept' | 'reject'>('submit');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View milestone details dialog states
  const [viewMilestoneDialogOpen, setViewMilestoneDialogOpen] = useState(false);
  const [milestoneDetails, setMilestoneDetails] = useState<any>(null);
  const [loadingMilestoneDetails, setLoadingMilestoneDetails] = useState(false);
  const [selectedMilestoneCid, setSelectedMilestoneCid] = useState<string>('');
  const [selectedMilestoneType, setSelectedMilestoneType] = useState<'submission' | 'acceptance' | 'rejection'>('submission');

  // Reopen dialog states
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [reopenJobId, setReopenJobId] = useState<string>('');
  const [reopenDeadlineDays, setReopenDeadlineDays] = useState<number>(7);

  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });

  const handleCopy = (text: string, label: string = 'Địa chỉ') => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} đã được sao chép vào clipboard!`);
    }).catch(err => {
      toast.error('Không thể sao chép.');
      console.error('Could not copy text: ', err);
    });
  };

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
        let jobCid = decodeCID(event.data.cid);
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
                submission_cid: milestoneData.submission_cid,
                acceptance_cid: milestoneData.acceptance_cid,
                rejection_cid: milestoneData.rejection_cid,
              };
            } catch (e) {
              // Handle error silently
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
          withdraw_request: jobOnChain.withdraw_request,
          cancel_request: jobOnChain.cancel_request,
          unlock_confirm_poster: jobOnChain.unlock_confirm_poster,
          unlock_confirm_worker: jobOnChain.unlock_confirm_worker,
        };
        const userAddress = account.toLowerCase();
        const isPoster = jobPost.poster.toLowerCase() === userAddress;
        const isWorker = jobPost.worker && jobPost.worker.toLowerCase() === userAddress;
        if (isPoster || isWorker) {
          // Job đã mở khóa và có worker nên đưa vào in-progress
          if (jobPost.completed || jobPost.job_expired || (!jobPost.active && jobPost.locked)) {
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

  const getMilestoneStatus = (job: JobPost, index: number) => {
    const milestoneData = job.milestone_states[index];
    if (!milestoneData) return 'Chưa khởi tạo';
    if (milestoneData.accepted) return 'Đã chấp nhận';
    if (milestoneData.submitted) return 'Đã nộp, đang chờ';
    if (milestoneData.reject_count > 0) return `Đã từ chối (${milestoneData.reject_count})`;
    return 'Chưa nộp';
  };

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

  const handleOpenMilestoneDialog = (action: 'submit' | 'accept' | 'reject', jobId: string, milestoneIndex: number) => {
    setMilestoneAction(action);
    setSelectedJobId(jobId);
    setSelectedMilestoneIndex(milestoneIndex);
    setMessage('');
    setLink('');
    setSelectedFile(null);
    setMilestoneDialogOpen(true);
  };

  const handleOpenSubmitDialog = (jobId: string, milestoneIndex: number) => {
    setMilestoneAction('submit');
    setSelectedJobId(jobId);
    setSelectedMilestoneIndex(milestoneIndex);
    setMessage('');
    setLink('');
    setSelectedFile(null);
    setMilestoneDialogOpen(true);
  };

  const handleOpenAcceptDialog = (jobId: string, milestoneIndex: number) => {
    setMilestoneAction('accept');
    setSelectedJobId(jobId);
    setSelectedMilestoneIndex(milestoneIndex);
    setMessage('');
    setLink('');
    setSelectedFile(null);
    setMilestoneDialogOpen(true);
  };

  const handleOpenRejectDialog = (jobId: string, milestoneIndex: number) => {
    setMilestoneAction('reject');
    setSelectedJobId(jobId);
    setSelectedMilestoneIndex(milestoneIndex);
    setMessage('');
    setLink('');
    setSelectedFile(null);
    setMilestoneDialogOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmitMilestoneAction = async () => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create JSON data with all information
      const milestoneData = {
        action: milestoneAction,
        jobId: selectedJobId,
        milestoneIndex: selectedMilestoneIndex,
        timestamp: Date.now(),
        userAddress: account,
        message: message,
        link: link,
        fileInfo: selectedFile ? {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type
        } : null,
        metadata: {
          actionType: milestoneAction,
          description: milestoneAction === 'submit' ? 'Milestone submission' : 
                      milestoneAction === 'accept' ? 'Milestone acceptance' : 
                      'Milestone rejection'
        }
      };

      // Upload JSON data to IPFS
      const finalCid = await uploadJSONToIPFS(milestoneData);
      toast.success(`Dữ liệu đã được upload lên IPFS với CID: ${finalCid}`);

      // Convert CID to bytes for blockchain
      const cidBytes = Array.from(new TextEncoder().encode(finalCid));

      // Call smart contract with CID bytes
      let functionName = '';
      let arguments_array: any[] = [];

      switch (milestoneAction) {
        case 'submit':
          functionName = 'submit_milestone';
          arguments_array = [Number(selectedJobId), Number(selectedMilestoneIndex), cidBytes];
          break;
        case 'accept':
          functionName = 'accept_milestone';
          arguments_array = [Number(selectedJobId), Number(selectedMilestoneIndex), cidBytes];
          break;
        case 'reject':
          functionName = 'reject_milestone';
          arguments_array = [Number(selectedJobId), Number(selectedMilestoneIndex), cidBytes];
          break;
      }

      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::${functionName}`,
        type_arguments: [],
        arguments: arguments_array
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      
      const actionText = milestoneAction === 'submit' ? 'nộp' : milestoneAction === 'accept' ? 'chấp nhận' : 'từ chối';
      toast.success(`Cột mốc ${selectedMilestoneIndex + 1} đã được ${actionText} thành công! CID: ${finalCid}`);
      
      setMilestoneDialogOpen(false);
      await loadUserJobs();
      refetchProfile();
    } catch (error: any) {
      console.error(`${milestoneAction} milestone thất bại:`, error);
      const actionText = milestoneAction === 'submit' ? 'Nộp' : milestoneAction === 'accept' ? 'Chấp nhận' : 'Từ chối';
      toast.error(`${actionText} cột mốc thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDialogTitle = () => {
    switch (milestoneAction) {
      case 'submit': return 'Nộp cột mốc';
      case 'accept': return 'Chấp nhận cột mốc';
      case 'reject': return 'Từ chối cột mốc';
      default: return 'Thao tác cột mốc';
    }
  };

  const getDialogDescription = () => {
    switch (milestoneAction) {
      case 'submit': return `Nộp cột mốc ${selectedMilestoneIndex + 1} - Vui lòng cung cấp thông tin và bằng chứng`;
      case 'accept': return `Chấp nhận cột mốc ${selectedMilestoneIndex + 1} - Vui lòng cung cấp bằng chứng chấp nhận`;
      case 'reject': return `Từ chối cột mốc ${selectedMilestoneIndex + 1} - Vui lòng cung cấp lý do từ chối`;
      default: return '';
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

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN');
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

  const getCIDDisplayInfo = (cid: any) => {
    if (!cid) return null;
    const decodedCID = decodeCID(cid);
    return {
      original: cid,
      decoded: decodedCID,
      ipfsUrl: convertIPFSURL(decodedCID)
    };
  };

  const debugCIDInfo = (job: JobPost, milestoneIndex: number) => {
    const milestoneData = job.milestone_states[milestoneIndex];
    if (!milestoneData) return null;

    const submissionInfo = getCIDDisplayInfo(milestoneData.submission_cid);
    const acceptanceInfo = getCIDDisplayInfo(milestoneData.acceptance_cid);
    const rejectionInfo = getCIDDisplayInfo(milestoneData.rejection_cid);

    return {
      submission: submissionInfo,
      acceptance: acceptanceInfo,
      rejection: rejectionInfo,
      milestoneData
    };
  };

  const handleRequestWithdraw = async (jobId: string) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để rút ứng tuyển.');
      return;
    }
    try {
      const tx = await window.aptos.signAndSubmitTransaction({
        type: 'entry_function_payload',
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::request_withdraw_apply`,
        type_arguments: [],
        arguments: [jobId]
      });
      await aptos.waitForTransaction({ transactionHash: tx.hash });
      toast.success('Đã gửi yêu cầu rút ứng tuyển, chờ poster duyệt!');
      loadUserJobs();
    } catch (error: any) {
      toast.error(`Gửi yêu cầu rút thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleApproveWithdraw = async (jobId: string, approve: boolean) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để duyệt yêu cầu rút.');
      return;
    }
    try {
      const tx = await window.aptos.signAndSubmitTransaction({
        type: 'entry_function_payload',
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::approve_withdraw_apply`,
        type_arguments: [],
        arguments: [jobId, approve]
      });
      await aptos.waitForTransaction({ transactionHash: tx.hash });
      toast.success(approve ? 'Đã duyệt rút ứng tuyển!' : 'Đã từ chối yêu cầu rút!');
      loadUserJobs();
    } catch (error: any) {
      toast.error(`Duyệt yêu cầu rút thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleApproveCancelJob = async (jobId: string, approve: boolean) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để duyệt yêu cầu hủy.');
      return;
    }
    try {
      const tx = await window.aptos.signAndSubmitTransaction({
        type: 'entry_function_payload',
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::approve_cancel_job`,
        type_arguments: [],
        arguments: [jobId, approve]
      });
      await aptos.waitForTransaction({ transactionHash: tx.hash });
      toast.success(approve ? 'Đã duyệt hủy dự án!' : 'Đã từ chối yêu cầu hủy!');
      loadUserJobs();
    } catch (error: any) {
      toast.error(`Duyệt yêu cầu hủy thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleRequestCancelJob = async (jobId: string) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để gửi yêu cầu hủy.');
      return;
    }
    try {
      const tx = await window.aptos.signAndSubmitTransaction({
        type: 'entry_function_payload',
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::request_cancel_job`,
        type_arguments: [],
        arguments: [jobId]
      });
      await aptos.waitForTransaction({ transactionHash: tx.hash });
      toast.success('Đã gửi yêu cầu hủy dự án, chờ worker duyệt!');
      loadUserJobs();
    } catch (error: any) {
      toast.error(`Gửi yêu cầu hủy thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  // Helper để lấy giá trị thực từ Option hoặc string/null
  function getOptionValue(val: any): string | null {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null && 'some' in val) return val.some;
    return null;
  }

  const handleOpenReopenDialog = (jobId: string) => {
    setReopenJobId(jobId);
    setReopenDeadlineDays(7);
    setReopenDialogOpen(true);
  };

  const handleConfirmReopen = async () => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để thực hiện.');
      return;
    }
    if (reopenDeadlineDays <= 0) {
      toast.error('Vui lòng nhập số ngày gia hạn hợp lệ.');
      return;
    }
    setIsSubmitting(true);
    try {
      const deadlineInSeconds = reopenDeadlineDays * 24 * 60 * 60;
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::reopen_applications`,
        type_arguments: [],
        arguments: [reopenJobId, deadlineInSeconds.toString()]
      });
      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Đã mở lại job với deadline mới!');
      setReopenDialogOpen(false);
      loadUserJobs();
    } catch (error: any) {
      toast.error(`Mở lại job thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    } finally {
      setIsSubmitting(false);
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

    // Chuyển đổi Option về boolean đúng kiểu
    const hasCancelRequest = !!getOptionValue(job.cancel_request);
    const hasWithdrawRequest = !!getOptionValue(job.withdraw_request);

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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300 font-medium truncate">
                  Người đăng: {job.poster ? `${job.poster.slice(0, 6)}...${job.poster.slice(-4)}` : ''}
                </span>
                {job.poster && <Copy size={14} className="cursor-pointer hover:text-white flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleCopy(job.poster, 'Địa chỉ người đăng'); }} />}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-green-400 font-medium truncate">
                  Người làm: {job.worker ? `${job.worker.slice(0, 6)}...${job.worker.slice(-4)}` : <span className="text-gray-500">Chưa có</span>}
                </span>
                {job.worker && <Copy size={14} className="cursor-pointer hover:text-white flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleCopy(job.worker, 'Địa chỉ người làm'); }} />}
              </div>
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
              {/* <div>
                <DollarSign className="w-5 h-5 inline mr-1 text-green-400" />
                Escrowed: {job.escrowed_amount ? job.escrowed_amount / 100_000_000 : 0} APT
              </div> */}
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
                  // Worker can submit milestone
                  if (isWorker && !milestoneData.submitted && milestoneIndex === job.current_milestone) {
                    return (
                      <div key={index} className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm text-gray-400">
                          Cột mốc {milestoneIndex + 1} chưa được nộp
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                          onClick={() => handleOpenSubmitDialog(job.id, milestoneIndex)}
                        >
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
                      {/* Hiển thị button accept/reject cho poster nếu milestone đã submit nhưng chưa accept */}
                      {isPoster && milestoneData.submitted && !milestoneData.accepted && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                            onClick={() => handleOpenAcceptDialog(job.id, milestoneIndex)}
                          >
                            Chấp nhận
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                            onClick={() => handleOpenRejectDialog(job.id, milestoneIndex)}
                          >
                            Từ chối
                          </Button>
                        </div>
                      )}
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
                    const canRemoveInactiveWorker = isPoster && job.active && job.worker && job.approved && idx === job.current_milestone && !milestoneData?.submitted && job.milestone_deadlines && job.milestone_deadlines[idx] && (Date.now() / 1000 > job.milestone_deadlines[idx]);
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
                        {/* Button xóa worker do quá hạn milestone */}
                        {canRemoveInactiveWorker && (
                          <Button
                            size="sm"
                            className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                            onClick={async () => {
                              try {
                                if (!account || accountType !== 'aptos' || !window.aptos) {
                                  toast.error('Vui lòng kết nối ví Aptos để thực hiện.');
                                  return;
                                }
                                const tx = await window.aptos.signAndSubmitTransaction({
                                  type: 'entry_function_payload',
                                  function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::poster_remove_inactive_worker`,
                                  type_arguments: [],
                                  arguments: [job.id]
                                });
                                await aptos.waitForTransaction({ transactionHash: tx.hash });
                                toast.success('Đã xóa worker do quá hạn nộp milestone!');
                                loadUserJobs();
                              } catch (error: any) {
                                toast.error(`Xóa worker thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
                              }
                            }}
                          >
                            Xóa worker do quá hạn
                          </Button>
                        )}
                        {/* Milestone Details Buttons */}
                        {milestoneData && (
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {milestoneData.submission_cid && (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                                  onClick={() => handleViewMilestoneDetails(job.id, idx, milestoneData.submission_cid, 'submission')}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Xem nộp
                                </Button>
                                <div className="text-xs text-gray-500">
                                  CID: {decodeCID(milestoneData.submission_cid).slice(0, 10)}...
                                </div>
                              </div>
                            )}
                            {milestoneData.acceptance_cid && (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                                  onClick={() => handleViewMilestoneDetails(job.id, idx, milestoneData.acceptance_cid, 'acceptance')}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Xem chấp nhận
                                </Button>
                                <div className="text-xs text-gray-500">
                                  CID: {decodeCID(milestoneData.acceptance_cid).slice(0, 10)}...
                                </div>
                              </div>
                            )}
                            {milestoneData.rejection_cid && (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-400/30"
                                  onClick={() => handleViewMilestoneDetails(job.id, idx, milestoneData.rejection_cid, 'rejection')}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Xem từ chối
                                </Button>
                                <div className="text-xs text-gray-500">
                                  CID: {decodeCID(milestoneData.rejection_cid).slice(0, 10)}...
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-3 justify-end">
              {/* Worker: Luôn hiển thị 3 button cạnh nhau */}
              {isWorker && (
                <>
                  <Button
                    size="sm"
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                    onClick={() => handleRequestWithdraw(job.id)}
                  >
                    Rút ứng tuyển
                  </Button>
                  {/* Bổ sung nút rút ứng tuyển khi hết hạn */}
                  {job.active && !job.approved && (Date.now() / 1000 > job.application_deadline) && (
                    <Button
                      size="sm"
                      className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                      onClick={async () => {
                        try {
                          if (!account || accountType !== 'aptos' || !window.aptos) {
                            toast.error('Vui lòng kết nối ví Aptos để rút ứng tuyển.');
                            return;
                          }
                          const tx = await window.aptos.signAndSubmitTransaction({
                            type: 'entry_function_payload',
                            function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::worker_withdraw_apply`,
                            type_arguments: [],
                            arguments: [job.id]
                          });
                          await aptos.waitForTransaction({ transactionHash: tx.hash });
                          toast.success('Bạn đã rút ứng tuyển do hết hạn, stake đã được hoàn lại!');
                          loadUserJobs();
                        } catch (error: any) {
                          toast.error(`Rút ứng tuyển thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
                        }
                      }}
                    >
                      Rút ứng tuyển (hết hạn)
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                    onClick={() => handleApproveCancelJob(job.id, true)}
                  >
                    Duyệt hủy dự án
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                    onClick={() => handleApproveCancelJob(job.id, false)}
                  >
                    Từ chối hủy
                  </Button>
                </>
              )}
              {/* Poster: Luôn hiển thị duyệt rút ứng tuyển và từ chối rút nếu là poster và có worker */}
              {isPoster && job.worker && (
                <>
                  <Button
                    size="sm"
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                    onClick={() => handleApproveWithdraw(job.id, true)}
                
                  >
                    Duyệt rút ứng tuyển
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                    onClick={() => handleApproveWithdraw(job.id, false)}
                    
                  >
                    Từ chối rút
                  </Button>
                </>
              )}
              {/* Button duyệt/từ chối ứng viên cho poster */}
              {isPoster && job.worker && !job.approved && (
                <>
                  <Button
                    size="sm"
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                    onClick={() => handleApproveWorker(job.id, job.worker)}
                  >
                    Duyệt ứng viên
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                    onClick={() => handleOpenReopenDialog(job.id)}
                  >
                    Từ chối ứng viên
                  </Button>
                </>
              )}
              {/* Poster: Luôn hiển thị nút gửi yêu cầu hủy dự án */}
              {isPoster && (
                <Button
                  size="sm"
                  className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                  onClick={() => handleRequestCancelJob(job.id)}
                >
                  Gửi yêu cầu hủy
                </Button>
              )}
              {/* Tab Đã khóa: Hiển thị button xác nhận mở khóa cho cả poster và worker */}
              {activeTab === 'locked' && job.locked && (
                <div className="flex gap-2 mt-2">
                  {(isPoster || isWorker) && (
                    <Button
                      size="sm"
                      className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                      disabled={
                        (isPoster && job.unlock_confirm_poster) ||
                        (isWorker && job.unlock_confirm_worker)
                      }
                      onClick={async () => {
                        try {
                          if (!account || accountType !== 'aptos' || !window.aptos) {
                            toast.error('Vui lòng kết nối ví Aptos để xác nhận mở khóa.');
                            return;
                          }
                          const tx = await window.aptos.signAndSubmitTransaction({
                            type: 'entry_function_payload',
                            function: `${JOBS_CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::confirm_unlock_job`,
                            type_arguments: [],
                            arguments: [job.id]
                          });
                          await aptos.waitForTransaction({ transactionHash: tx.hash });
                          toast.success('Đã xác nhận mở khóa dự án!');
                          console.log('DEBUG: Đã mở khóa job, đang load lại...');
                          await loadUserJobs();
                          console.log('DEBUG: Đã load lại jobs, chuyển về tab in-progress');
                          // Chuyển về tab đang thực hiện sau khi mở khóa
                          setTimeout(() => {
                            setActiveTab('in-progress');
                          }, 500);
                        } catch (error: any) {
                          toast.error(`Xác nhận mở khóa thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
                        }
                      }}
                    >
                      {((isPoster && job.unlock_confirm_poster) || (isWorker && job.unlock_confirm_worker)) ? 'Đã xác nhận' : 'Xác nhận mở khóa'}
                    </Button>
                  )}
                  {/* Hiển thị trạng thái xác nhận của cả 2 bên */}
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">Poster: {job.unlock_confirm_poster ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}</span>
                    <span className="inline-flex items-center gap-1">Worker: {job.unlock_confirm_worker ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}</span>
                  </div>
                </div>
              )}
              {/* Các action khác giữ nguyên */}
              {canCancel && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                  onClick={() => handleCancelJob(job.id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Hủy dự án
                </Button>
              )}
              {canComplete && (
                <Button 
                  size="sm" 
                  className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
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
                  className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                  onClick={() => handleExpireJob(job.id)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Đánh dấu hết hạn
                </Button>
              )}
 

            </div>
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
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Bảng điều khiển của bạn
              </h1>
              <Button
                  size="icon"
                  variant="outline"
                  onClick={loadUserJobs}
                  disabled={loading}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 w-12 rounded-xl flex-shrink-0 mb-6"
                  aria-label="Tải lại danh sách dự án"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
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

      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              {milestoneAction === 'submit' ? 'Nộp cột mốc' : 
               milestoneAction === 'accept' ? 'Chấp nhận cột mốc' : 'Từ chối cột mốc'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {milestoneAction === 'submit' ? 'Nhập thông tin và file cho cột mốc' : 
               milestoneAction === 'accept' ? 'Nhập ghi chú chấp nhận' : 'Nhập lý do từ chối'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-white">
                {milestoneAction === 'submit' ? 'Mô tả công việc' : 
                 milestoneAction === 'accept' ? 'Ghi chú chấp nhận' : 'Lý do từ chối'}
              </Label>
              <Textarea
                id="message"
                placeholder={milestoneAction === 'submit' ? 'Mô tả chi tiết công việc đã hoàn thành...' : 
                            milestoneAction === 'accept' ? 'Ghi chú khi chấp nhận cột mốc...' : 
                            'Lý do từ chối cột mốc...'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                rows={4}
              />
            </div>

            {/* Link */}
            <div className="space-y-2">
              <Label htmlFor="link" className="text-white">Link tham khảo (tùy chọn)</Label>
              <Input
                id="link"
                type="url"
                placeholder="https://example.com"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-white">File đính kèm (tùy chọn)</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                className="bg-gray-800 border-gray-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 file:border file:border-blue-400/30"
              />
              {selectedFile && (
                <div className="text-sm text-gray-400">
                  Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setMilestoneDialogOpen(false)}
                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmitMilestoneAction}
                disabled={isSubmitting}
                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang xử lý...
                  </div>
                ) : (
                  milestoneAction === 'submit' ? 'Nộp cột mốc' : 
                  milestoneAction === 'accept' ? 'Chấp nhận' : 'Từ chối'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Reopen Dialog */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Mở lại job
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Nhập số ngày gia hạn cho job
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-white">Số ngày gia hạn</Label>
              <Input
                id="deadline"
                type="number"
                min="1"
                max="365"
                placeholder="7"
                value={reopenDeadlineDays}
                onChange={(e) => setReopenDeadlineDays(Number(e.target.value))}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setReopenDialogOpen(false)}
                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
              >
                Hủy
              </Button>
              <Button
                onClick={handleConfirmReopen}
                disabled={isSubmitting}
                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang xử lý...
                  </div>
                ) : (
                  'Xác nhận'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;