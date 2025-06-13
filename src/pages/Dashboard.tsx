import { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Star, 
  DollarSign,
  Clock,
  CheckCircle,
  Sparkles,
  Award,
  Shield,
  Briefcase,
  Users,
  Hourglass,
  CalendarCheck
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet } from '../context/WalletContext';
import { convertIPFSURL } from '@/utils/ipfs';
import { JobPost } from '../pages/Jobs'; // Import JobPost interface
import { toast } from '@/components/ui/sonner';
import { fetchProfileDetails, ProfileDataFromChain } from '@/utils/aptosUtils';

const CONTRACT_ADDRESS = "0xf9c47e613fee3858fccbaa3aebba1f4dbe227db39288a12bfb1958accd068242";
const MODULE_ADDRESS = "0xf9c47e613fee3858fccbaa3aebba1f4dbe227db39288a12bfb1958accd068242"; // Same as contract address for now
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v5";
const PROFILE_MODULE_NAME = "web3_profiles_v7";
const PROFILE_RESOURCE_NAME = "ProfileRegistryV7";

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);

const Dashboard = () => {
  const { account, accountType } = useWallet();
  const [activeTab, setActiveTab] = useState<string>('in-progress');
  const [inProgressJobs, setInProgressJobs] = useState<JobPost[]>([]);
  const [completedJobs, setCompletedJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animation refs
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
    console.log("Dashboard: Loading user jobs...");
    try {
      const fetchedInProgressJobs: JobPost[] = [];
      const fetchedCompletedJobs: JobPost[] = [];

      console.log("Dashboard: Fetching Events resource...");
      const eventsResource = await aptos.getAccountResource({
        accountAddress: CONTRACT_ADDRESS,
        resourceType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Events`,
      });

      if (!eventsResource || !(eventsResource as any).post_event?.guid?.id) {
        console.warn("Dashboard: JobPostedEvent handle not found or marketplace not initialized.");
        setLoading(false);
        return;
      }
      console.log("Dashboard: Events resource found.", eventsResource);

      console.log("Dashboard: Fetching all JobPostedEvent...");
      const rawPostedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
        options: {
          limit: 100,
        }
      });
      console.log("Dashboard: Fetched raw JobPostedEvents:", rawPostedEvents);

      const allJobIds = new Set(rawPostedEvents.map((e: any) => e.data.job_id.toString()));
      const jobDetailsMap = new Map<string, any>();

      for (const event of rawPostedEvents) {
        const jobCid = event.data.cid;
        if (jobCid) {
          try {
            const jobDetailsUrl = convertIPFSURL(jobCid);
            const response = await fetch(jobDetailsUrl);
            
            const contentType = response.headers.get('content-type');
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Dashboard: IPFS fetch failed for CID ${jobCid}. Status: ${response.status}. Response text: ${errorText.slice(0, 500)}`);
              continue; // Skip this job if HTTP response is not OK
            }

            if (!contentType || !contentType.includes('application/json')) {
              const errorText = await response.text();
              console.warn(`Dashboard: IPFS response for CID ${jobCid} is not JSON. Content-Type: ${contentType}. Response text: ${errorText.slice(0, 500)}`);
              continue; // Skip if content type is not JSON
            }

            let jobDataFromIPFS: any;
            try {
              jobDataFromIPFS = await response.json();
            } catch (jsonError) {
              const errorText = await response.text();
              console.error(`Dashboard: Failed to parse JSON for CID ${jobCid}. Error: ${jsonError}. Raw response: ${errorText.slice(0, 500)}`);
              continue; // Skip if JSON parsing fails
            }
            jobDetailsMap.set(event.data.job_id.toString(), jobDataFromIPFS);
          } catch (ipfsError) {
            console.error(`Dashboard: Error fetching IPFS data for job ${event.data.job_id}:`, ipfsError);
          }
        }
      }

      console.log("Dashboard: Fetching on-chain Jobs resource...");
      const jobsResource = await aptos.getAccountResource({
        accountAddress: MODULE_ADDRESS,
        resourceType: `${MODULE_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Jobs`,
      });

      if (!jobsResource || !(jobsResource as any).jobs?.handle) {
        console.warn("Dashboard: Jobs resource not found or marketplace not initialized.");
        setLoading(false);
        return;
      }
      const jobsTableHandle = (jobsResource as any).jobs.handle;
      console.log("Dashboard: Jobs resource found. Table handle:", jobsTableHandle);

      for (const jobId of Array.from(allJobIds)) {
        try {
          console.log(`Dashboard: Fetching on-chain data for job ID: ${jobId}`);
          let jobOnChain: any = null;
          try {
            jobOnChain = await aptos.getTableItem<any>({
              handle: jobsTableHandle,
              data: {
                key_type: "u64",
                value_type: `${MODULE_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Job`,
                key: jobId,
              },
            });
            console.log(`Dashboard: On-chain job data for ${jobId}:`, jobOnChain);
          } catch (tableError) {
            console.warn(`Dashboard: Job ${jobId} not found in Jobs table, may be completed or cancelled:`, tableError);
            continue; // Skip if job is not found in the active table
          }

          if (!jobOnChain) {
            console.warn(`Dashboard: No on-chain data found for job ${jobId}.`);
            continue; // Skip if job resource is not found
          }
        
          const jobDataFromIPFS: Record<string, any> = jobDetailsMap.get(jobId) || {};
          console.log(`Dashboard: IPFS data for job ${jobId}:`, jobDataFromIPFS);

          // Fetch poster profile details using aptosUtils.ts (which has caching)
          const posterProfile = await fetchProfileDetails(jobOnChain.poster);
          console.log(`Dashboard: Poster profile for ${jobOnChain.poster}:`, posterProfile);

          // Populate applications with profile data using aptosUtils.ts (which has caching)
          const applicationsWithProfiles = await Promise.all(jobOnChain.applications.map(async (app: any) => {
            const workerProfile = await fetchProfileDetails(app.worker);
            console.log(`Dashboard: Worker profile for application ${app.worker}:`, workerProfile);
            return {
              ...app,
              workerProfileName: workerProfile.name,
              workerProfileAvatar: workerProfile.avatar,
            };
          }));

          const jobPost: JobPost = {
            id: jobId,
            title: jobDataFromIPFS.title || "Untitled Job",
            description: jobDataFromIPFS.description || "No description provided.",
            category: jobDataFromIPFS.category || "Uncategorized",
            skills: jobDataFromIPFS.skills || [],
            budget: {
              min: jobDataFromIPFS.budgetMin || 0,
              max: jobDataFromIPFS.budgetMax || 0,
              currency: jobDataFromIPFS.budgetCurrency || "USDC",
            },
            duration: jobDataFromIPFS.duration || "Flexible",
            location: jobDataFromIPFS.location || "remote",
            immediate: jobDataFromIPFS.immediate || false,
            experience: jobDataFromIPFS.experience || "Any",
            attachments: jobDataFromIPFS.attachments || [],
            poster: jobOnChain.poster,
            posterProfile: jobDataFromIPFS.posterProfile || "",
            postedAt: new Date(Number(jobOnChain.start_time) * 1000).toISOString(),
            initialFundAmount: Number(jobOnChain.escrowed_amount || 0),
            client: {
              id: jobOnChain.poster,
              name: posterProfile.name,
              avatar: posterProfile.avatar,
            },
            start_time: Number(jobOnChain.start_time),
            end_time: Number(jobOnChain.end_time || 0),
            milestones: jobOnChain.milestones ? jobOnChain.milestones.map(Number) : [],
            duration_per_milestone: jobOnChain.duration_per_milestone ? jobOnChain.duration_per_milestone.map(Number) : [],
            worker: jobOnChain.worker,
            approved: jobOnChain.approved,
            active: jobOnChain.active,
            current_milestone: Number(jobOnChain.current_milestone),
            milestone_states: Object.fromEntries(
              Object.entries(jobOnChain.milestone_states?.data || {}).map(([key, value]: [string, any]) => [
                Number(key),
                {
                  submitted: value.submitted,
                  accepted: value.accepted,
                  submit_time: Number(value.submit_time),
                  reject_count: Number(value.reject_count),
                },
              ])
            ),
            submit_time: jobOnChain.submit_time ? Number(jobOnChain.submit_time) : null,
            escrowed_amount: Number(jobOnChain.escrowed_amount),
            applications: applicationsWithProfiles,
            approve_time: jobOnChain.approve_time ? Number(jobOnChain.approve_time) : null,
            poster_did: jobOnChain.poster_did,
            poster_profile_cid: jobOnChain.poster_profile_cid,
            completed: jobOnChain.completed,
            rejected_count: Number(jobOnChain.rejected_count),
            job_expired: jobOnChain.job_expired,
            auto_confirmed: jobOnChain.auto_confirmed ? jobOnChain.auto_confirmed : [],
            milestone_deadlines: jobOnChain.milestone_deadlines ? jobOnChain.milestone_deadlines.map(Number) : [],
            application_deadline: Number(jobOnChain.application_deadline),
            selected_application_index: jobOnChain.selected_application_index ? Number(jobOnChain.selected_application_index) : null,
            last_reject_time: jobOnChain.last_reject_time ? Number(jobOnChain.last_reject_time) : null,
          };

          const userAddress = account.toLowerCase();
          const isPoster = jobPost.poster.toLowerCase() === userAddress;
          const isWorker = jobPost.worker && jobPost.worker.toLowerCase() === userAddress;
          const isApplicant = jobPost.applications.some(app => app.worker && app.worker.toLowerCase() === userAddress);
          console.log(`Dashboard: Job ${jobId} - isPoster: ${isPoster}, isWorker: ${isWorker}, isApplicant: ${isApplicant}`);

          if (isPoster || isWorker || isApplicant) {
            if (jobPost.completed || jobPost.job_expired || !jobPost.active) {
              fetchedCompletedJobs.push(jobPost);
              console.log(`Dashboard: Job ${jobId} pushed to completed jobs.`);
            } else {
              fetchedInProgressJobs.push(jobPost);
              console.log(`Dashboard: Job ${jobId} pushed to in-progress jobs.`);
            }
          }

        } catch (jobFetchError) {
          console.error(`Dashboard: Error fetching on-chain data for job ${jobId}:`, jobFetchError);
        }
      }

      console.log("Dashboard: Final inProgressJobs:", fetchedInProgressJobs);
      console.log("Dashboard: Final completedJobs:", fetchedCompletedJobs);
      setInProgressJobs(fetchedInProgressJobs);
      setCompletedJobs(fetchedCompletedJobs);
      setLoading(false);

    } catch (error: any) {
      console.error("Dashboard: Failed to load user jobs:", error);
      setError(`Failed to load jobs: ${error.message || "Unknown error"}`);
      setLoading(false);
    }
  };

  const formatPostedTime = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diffSeconds = now - timestamp;

    if (diffSeconds < 60) return `${Math.floor(diffSeconds)} giây trước`;
    const diffMinutes = diffSeconds / 60;
    if (diffMinutes < 60) return `${Math.floor(diffMinutes)} phút trước`;
    const diffHours = diffMinutes / 60;
    if (diffHours < 24) return `${Math.floor(diffHours)} giờ trước`;
    const diffDays = diffHours / 24;
    return `${Math.floor(diffDays)} ngày trước`;
  };

  const getMilestoneStatus = (job: JobPost, index: number) => {
    const milestoneData = job.milestone_states[index];
    if (!milestoneData) return 'Chưa khởi tạo';
    if (milestoneData.accepted) return 'Đã chấp nhận';
    if (milestoneData.submitted) return 'Đã nộp, đang chờ';
    if (milestoneData.reject_count > 0) return `Đã từ chối (${milestoneData.reject_count})`;
    return 'Chưa nộp';
  };

  const getMilestoneBadgeVariant = (job: JobPost, index: number) => {
    const milestoneData = job.milestone_states[index];
    if (!milestoneData) return 'default';
    if (milestoneData.accepted) return 'default';
    if (milestoneData.submitted) return 'secondary';
    if (milestoneData.reject_count > 0) return 'destructive';
    return 'outline';
  };

  const handleApproveWorker = async (jobId: string, applicationIndex: number) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để chấp nhận ứng viên.');
      return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::approve_worker`,
        type_arguments: [],
        arguments: [
          jobId, // job_id: u64
          applicationIndex // application_index: u64
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Ứng viên đã được chấp nhận thành công!');
      loadUserJobs(); // Reload jobs to reflect the approved worker
    } catch (error: any) {
      console.error('Chấp nhận ứng viên thất bại:', error);
      toast.error(`Chấp nhận ứng viên thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const renderJobCard = (job: JobPost, type: 'in-progress' | 'completed') => (
    <motion.div
      key={job.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full">
        <CardHeader className="px-0 pt-0 pb-4">
          <CardTitle className="text-xl font-bold text-white mb-2">{job.title}</CardTitle>
          <CardDescription className="text-gray-400 text-sm line-clamp-2">{job.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 px-0 py-0">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300 mb-4">
              <div className="flex items-center gap-2"><Briefcase size={16} className="text-blue-400" /><span>{job.category}</span></div>
              <div className="flex items-center gap-2"><DollarSign size={16} className="text-green-400" /><span>${job.budget.min.toLocaleString()} - ${job.budget.max.toLocaleString()} {job.budget.currency}</span></div>
              <div className="flex items-center gap-2"><Clock size={16} className="text-orange-400" /><span>{job.duration}</span></div>
              <div className="flex items-center gap-2"><CalendarCheck size={16} className="text-purple-400" /><span>Thời hạn ứng tuyển: {new Date(job.application_deadline * 1000).toLocaleDateString()}</span></div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {job.skills.map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">{skill}</Badge>
              ))}
            </div>

            {/* Hiển thị thông tin Poster/Worker/Applications */}
            <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-white/10">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Users size={18} className="text-violet-400" />Thông tin liên quan</h3>
              <div className="space-y-3">
                {/* Poster Info */}
                {job.poster.toLowerCase() === account?.toLowerCase() && (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-blue-500">
                      <AvatarImage src={job.client.avatar} alt={job.client.name} />
                      <AvatarFallback>{job.client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">Bạn là người đăng</p>
                      <p className="text-xs text-gray-400">Đăng lúc: {formatPostedTime(job.start_time)}</p>
                    </div>
                  </div>
                )}

                {/* Worker Info */}
                {job.worker && job.worker.toLowerCase() === account?.toLowerCase() && (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-green-500">
                      <AvatarImage src={job.applications.find(app => app.worker.toLowerCase() === job.worker?.toLowerCase())?.workerProfileAvatar} alt="Worker Avatar" />
                      <AvatarFallback>WK</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">Bạn là người thực hiện</p>
                      <p className="text-xs text-gray-400">Được chấp nhận lúc: {formatPostedTime(job.approve_time || 0)}</p>
                    </div>
                  </div>
                )}

                {/* Worker (if any) and Milestones */}
                {job.worker && job.poster.toLowerCase() !== account?.toLowerCase() && job.worker.toLowerCase() !== account?.toLowerCase() && (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={job.applications.find(app => app.worker.toLowerCase() === job.worker?.toLowerCase())?.workerProfileAvatar} alt="Worker Avatar" />
                      <AvatarFallback>{job.applications.find(app => app.worker.toLowerCase() === job.worker?.toLowerCase())?.workerProfileName.slice(0,2).toUpperCase() || 'WK'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">Người thực hiện: {job.applications.find(app => app.worker.toLowerCase() === job.worker?.toLowerCase())?.workerProfileName || 'Ẩn danh'}</p>
                      <p className="text-xs text-gray-400">Đã chấp nhận lúc: {formatPostedTime(job.approve_time || 0)}</p>
                    </div>
                  </div>
                )}

                {/* Milestones for active jobs */}
                {type === 'in-progress' && job.milestones.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-white mb-2 flex items-center gap-2"><Hourglass size={16} className="text-yellow-400" />Tiến độ dự án ({job.current_milestone}/{job.milestones.length})</h4>
                    <ul className="space-y-2">
                      {job.milestones.map((amount, index) => (
                        <li key={index} className="flex justify-between items-center bg-gray-700/30 px-3 py-2 rounded-md">
                          <span className="text-sm text-gray-300">Giai đoạn {index + 1}: ${amount.toLocaleString()}</span>
                          <Badge variant={getMilestoneBadgeVariant(job, index)}>{getMilestoneStatus(job, index)}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Application List (for posters) */}
                {job.poster.toLowerCase() === account?.toLowerCase() && !job.worker && job.applications.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2"><Users size={16} className="text-blue-300" />Đơn ứng tuyển ({job.applications.length})</h4>
                    <ul className="space-y-3">
                      {job.applications.map((app, index) => (
                        <li key={index} className="flex items-center justify-between bg-blue-800/30 p-3 rounded-md">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={app.workerProfileAvatar} alt={app.workerProfileName} />
                              <AvatarFallback>{app.workerProfileName.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-white">{app.workerProfileName}</p>
                              <p className="text-xs text-gray-400">Ứng tuyển lúc: {formatPostedTime(app.apply_time)}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white" 
                            onClick={() => handleApproveWorker(job.id, index)}
                          >
                            Chấp nhận
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {job.poster.toLowerCase() === account?.toLowerCase() && !job.worker && job.applications.length === 0 && (
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-white/10 text-center text-gray-400 text-sm">
                    Chưa có đơn ứng tuyển nào.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section ref={heroRef} className="relative py-20 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black">
        <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0)))" />
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
              <div className="text-3xl font-bold text-violet-400">{completedJobs.length}</div>
              <div className="text-gray-400">Dự án đã hoàn thành</div>
              </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">24/7</div>
              <div className="text-gray-400">Hỗ trợ</div>
              </div>
          </motion.div>

          <div className="flex border-b border-white/10 mb-8">
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === 'in-progress'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              } transition-colors duration-200`}
            >
              Đang tiến hành
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === 'completed'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              } transition-colors duration-200`}
            >
              Đã hoàn thành
            </button>
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
              {activeTab === 'in-progress' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {inProgressJobs.length > 0 ? (
                    inProgressJobs.map(job => renderJobCard(job, 'in-progress'))
                  ) : (
                    <div className="lg:col-span-2 text-center py-10 bg-gray-900/50 rounded-lg border border-white/10 text-gray-400">
                      Bạn chưa có dự án nào đang tiến hành.
                  </div>
                  )}
            </div>
          )}

              {activeTab === 'completed' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {completedJobs.length > 0 ? (
                    completedJobs.map(job => renderJobCard(job, 'completed'))
                  ) : (
                    <div className="lg:col-span-2 text-center py-10 bg-gray-900/50 rounded-lg border border-white/10 text-gray-400">
                      Bạn chưa có dự án nào đã hoàn thành.
                    </div>
                  )}
                        </div>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
