import { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockJobs } from '@/data/mockData';
import { 
  TrendingUp, 
  Star, 
  DollarSign,
  Clock,
  CheckCircle,
  Sparkles,
  Award,
  Shield,
  Briefcase
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet } from '../context/WalletContext';
import { convertIPFSURL } from '@/utils/ipfs';
import { JobPost } from '../pages/Jobs'; // Import JobPost interface

const CONTRACT_ADDRESS = "0xf9c47e613fee3858fccbaa3aebba1f4dbe227db39288a12bfb1958accd068242";
const MODULE_ADDRESS = "0xf9c47e613fee3858fccbaa3aebba1f4dbe227db39288a12bfb1958accd068242"; // Same as contract address for now
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v5";
const PROFILE_MODULE_NAME = "web3_profiles_v7";
const PROFILE_RESOURCE_NAME = "ProfileRegistryV7";

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);

interface ProfileDataFromChain {
  cid: string;
  cccd: number;
  did: string;
  created_at: number;
}

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

  const fetchProfileDetails = async (address: string): Promise<{ name: string; avatar: string }> => {
    let name = "Người dùng ẩn danh";
    let avatar = "";
    try {
      const profileRegistryResource = await aptos.getAccountResource({
        accountAddress: MODULE_ADDRESS,
        resourceType: `${MODULE_ADDRESS}::${PROFILE_MODULE_NAME}::${PROFILE_RESOURCE_NAME}`,
      });

      if (profileRegistryResource && (profileRegistryResource as any).profiles?.handle) {
        const profileTableHandle = (profileRegistryResource as any).profiles.handle;

        const profileDataFromChain = await aptos.getTableItem({
          handle: profileTableHandle,
          data: {
            key_type: "address",
            value_type: `${MODULE_ADDRESS}::${PROFILE_MODULE_NAME}::ProfileData`,
            key: address,
          },
        }) as ProfileDataFromChain;

        if (profileDataFromChain.cid) {
          const profileJsonUrl = convertIPFSURL(profileDataFromChain.cid);
          const response = await fetch(profileJsonUrl);
          if (response.ok) {
            const profileJson = await response.json();
            name = profileJson.name || "Người dùng ẩn danh";
            avatar = profileJson.profilePic || "";
          }
        }
      }
    } catch (profileError) {
      console.warn(`Could not fetch profile for ${address}:`, profileError);
    }
    return { name, avatar };
  };

  const loadUserJobs = async () => {
    if (!account || accountType !== 'aptos') {
      setLoading(false);
      setError("Vui lòng kết nối ví Aptos để xem công việc của bạn.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedInProgressJobs: JobPost[] = [];
      const fetchedCompletedJobs: JobPost[] = [];

      // Lấy các JobPostedEvent
      const rawPostedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::JobPostedEvent`,
        options: {
          limit: 100, // Fetch a reasonable number of recent events
        }
      });

      // Lấy các WorkerAppliedEvent để biết người dùng có apply hay không
      const rawAppliedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerAppliedEvent`,
        options: {
          limit: 100, // Fetch a reasonable number of recent events
        }
      });

      // Lấy các WorkerApprovedEvent để biết người dùng có được chọn làm worker không
      const rawApprovedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerApprovedEvent`,
        options: {
          limit: 100, // Fetch a reasonable number of recent events
        }
      });

      const userAppliedJobIds = new Set(rawAppliedEvents
        .filter((event: any) => event.data.worker.toLowerCase() === account.toLowerCase())
        .map((event: any) => event.data.job_id.toString()));
      
      const userApprovedJobIds = new Set(rawApprovedEvents
        .filter((event: any) => event.data.worker.toLowerCase() === account.toLowerCase())
        .map((event: any) => event.data.job_id.toString()));

      for (const event of rawPostedEvents) {
        const eventData = event.data as any; // JobPostedEvent data from blockchain
        const jobCid = eventData.cid; // CID pointing to job details on IPFS

        if (jobCid) {
          try {
            const jobDetailsUrl = convertIPFSURL(jobCid);
            const response = await fetch(jobDetailsUrl);
            if (!response.ok) {
              console.error(`Failed to fetch job details from IPFS for CID ${jobCid}: ${response.statusText}`);
              continue;
            }
            const jobDataFromIPFS = await response.json(); // Job details JSON from IPFS

            // Lấy trạng thái của công việc từ smart contract (cần đọc resource Job)
            const jobResource = await aptos.getAccountResource({
              accountAddress: MODULE_ADDRESS,
              resourceType: `${MODULE_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Jobs`,
            });

            let jobOnChain: any = null;
            if (jobResource && (jobResource as any).jobs?.handle) {
              try {
                jobOnChain = await aptos.getTableItem({
                  handle: (jobResource as any).jobs.handle,
                  data: {
                    key_type: "u64",
                    value_type: `${MODULE_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::Job`,
                    key: eventData.job_id,
                  },
                });
              } catch (tableError) {
                console.warn(`Job ${eventData.job_id} not found in Jobs table, may be completed or cancelled:`, tableError);
                continue; // Skip if job is not found in the active table
              }
            }

            if (!jobOnChain) continue; // Skip if job resource is not found

            // Fetch poster profile details
            const posterProfile = await fetchProfileDetails(eventData.poster);

            // Check if current user is poster or worker or applicant
            const isPoster = eventData.poster.toLowerCase() === account.toLowerCase();
            const isWorker = jobOnChain.worker?.toLowerCase() === account.toLowerCase();
            const isApplicant = userAppliedJobIds.has(eventData.job_id.toString());
            const isApprovedWorker = userApprovedJobIds.has(eventData.job_id.toString());

            // Only show jobs relevant to the current user (as poster, worker, or applicant)
            if (!isPoster && !isWorker && !isApplicant && !isApprovedWorker) {
              continue;
            }

            const jobPost: JobPost = {
              id: eventData.job_id.toString(),
              title: jobDataFromIPFS.title || "Untitled Job",
              description: jobDataFromIPFS.description || "No description provided.",
              category: jobDataFromIPFS.category || "Uncategorized",
              skills: jobDataFromIPFS.skills || [],
              budget: { // Ensure budget is correctly parsed
                min: jobDataFromIPFS.budgetMin || 0,
                max: jobDataFromIPFS.budgetMax || 0,
                currency: jobDataFromIPFS.budgetCurrency || "USDC" // Assuming USDC
              },
              duration: jobDataFromIPFS.duration || "Flexible",
              location: jobDataFromIPFS.location || "remote",
              immediate: jobDataFromIPFS.immediate || false,
              experience: jobDataFromIPFS.experience || "Any",
              attachments: jobDataFromIPFS.attachments || [],
              poster: eventData.poster,
              posterProfile: jobDataFromIPFS.posterProfile || "",
              postedAt: new Date(Number(eventData.start_time) * 1000).toISOString(),
              applicationDeadline: new Date(Number(jobDataFromIPFS.applicationDeadlineDays) * 24 * 60 * 60 * 1000 + Number(eventData.start_time) * 1000).toISOString(),
              initialFundAmount: jobDataFromIPFS.initialFundAmount || 0,
              posterDid: jobDataFromIPFS.posterDid || "",
              client: {
                id: eventData.poster,
                name: posterProfile.name,
                avatar: posterProfile.avatar,
              },
              // Add fields from jobOnChain to display status
              start_time: Number(jobOnChain.start_time),
              end_time: Number(jobOnChain.end_time),
              milestones: jobOnChain.milestones.map(Number),
              duration_per_milestone: jobOnChain.duration_per_milestone.map(Number),
              worker: jobOnChain.worker,
              approved: jobOnChain.approved,
              active: jobOnChain.active,
              current_milestone: Number(jobOnChain.current_milestone),
              milestone_states: Object.fromEntries(
                Object.entries(jobOnChain.milestone_states.data).map(([key, value]: [string, any]) => [
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
              applications: jobOnChain.applications.map((app: any) => ({
                worker: app.worker,
                apply_time: Number(app.apply_time),
                did: app.did,
                profile_cid: app.profile_cid,
              })),
              approve_time: jobOnChain.approve_time ? Number(jobOnChain.approve_time) : null,
              poster_profile_cid: jobOnChain.poster_profile_cid,
              completed: jobOnChain.completed,
              rejected_count: Number(jobOnChain.rejected_count),
              job_expired: jobOnChain.job_expired,
              auto_confirmed: jobOnChain.auto_confirmed,
              milestone_deadlines: jobOnChain.milestone_deadlines.map(Number),
              selected_application_index: jobOnChain.selected_application_index ? Number(jobOnChain.selected_application_index) : null,
              last_reject_time: jobOnChain.last_reject_time ? Number(jobOnChain.last_reject_time) : null,
            };

            if (jobOnChain.completed) {
              fetchedCompletedJobs.push(jobPost);
            } else {
              fetchedInProgressJobs.push(jobPost);
            }

          } catch (ipfsError) {
            console.error(`Error processing job from IPFS CID ${jobCid}:`, ipfsError);
          }
        }
      }

      setInProgressJobs(fetchedInProgressJobs);
      setCompletedJobs(fetchedCompletedJobs);

    } catch (err: any) {
      console.error("Failed to load user jobs:", err);
      setError(`Không thể tải công việc của bạn: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserJobs();
  }, [account, accountType]);

  const formatPostedTime = (timestamp: string) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Vừa đăng';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  const getMilestoneStatus = (job: JobPost, index: number) => {
    if (!job.milestone_states) return "Chưa rõ";
    const milestoneData = (job.milestone_states as any).data.find((m: any) => m.key === index);
    if (milestoneData?.value.accepted) {
      return "Hoàn thành";
    } else if (milestoneData?.value.submitted) {
      return "Đã nộp";
    } else {
      return "Chưa bắt đầu";
    }
  };

  const getMilestoneBadgeVariant = (job: JobPost, index: number) => {
    const status = getMilestoneStatus(job, index);
    switch (status) {
      case "Hoàn thành": return "bg-green-500/20 text-green-300 border-green-500/30";
      case "Đã nộp": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "Chưa bắt đầu": return "bg-gray-700 text-gray-300 border-gray-500";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      {/* Stats Section */}
      <section ref={statsRef} className="py-16 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Stat 1 */}
            <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-2 hover:border-blue-500/30 transition-all">
         
              <div className="text-3xl font-black text-blue-300 font-zentry">8,245 USDC</div>
              <div className="flex items-center gap-2 text-xs text-green-400 font-general">
                <TrendingUp className="w-4 h-4" />
                +12.5% <span className="text-blue-200">từ tháng trước</span>
              </div>
            </Card>
            {/* Stat 2 */}
            <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-2 hover:border-violet-500/30 transition-all">
             
              <div className="text-3xl font-black text-violet-300 font-zentry">12</div>
              <div className="flex items-center gap-2 text-xs text-green-400 font-general">
                <Sparkles className="w-4 h-4" />
                +2 <span className="text-violet-200">tháng này</span>
              </div>
            </Card>
            {/* Stat 3 */}
            <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-2 hover:border-yellow-400/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-yellow-200 font-general">Điểm danh tiếng</span>
                <Star className="w-7 h-7 text-yellow-400" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-yellow-300 font-zentry">4.8</span>
                <span className="text-xs text-yellow-200 mb-1">/5</span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className={`w-4 h-4 ${star <= 4 ? 'text-yellow-400' : 'text-gray-700'}`} />
                ))}
              </div>
            </Card>
            {/* Stat 4 */}
            <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-2 hover:border-green-400/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-200 font-general">Tỷ lệ thành công</span>
                <Award className="w-7 h-7 text-green-400" />
              </div>
              <div className="text-3xl font-black text-green-300 font-zentry">96%</div>
              <div className="flex items-center gap-2 text-xs text-green-400 font-general">
                <Shield className="w-4 h-4" />
                Xuất sắc
              </div>
            </Card>
          </motion.div>
          {/* Main Content Tabs */}
          <div className="mb-8 flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 shadow-lg backdrop-blur">
            <button
              className={`px-6 py-3 rounded-xl font-bold transition-all text-base ${
                activeTab === 'in-progress'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-blue-200 hover:bg-blue-500/10'
              }`}
              onClick={() => setActiveTab('in-progress')}
            >
              Đang thực hiện
            </button>
            <button
              className={`px-6 py-3 rounded-xl font-bold transition-all text-base ${
                activeTab === 'completed'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-blue-200 hover:bg-blue-500/10'
              }`}
              onClick={() => setActiveTab('completed')}
            >
              Hoàn thành
            </button>
            <button
              className={`px-6 py-3 rounded-xl font-bold transition-all text-base ${
                activeTab === 'earnings'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-blue-200 hover:bg-blue-500/10'
              }`}
              onClick={() => setActiveTab('earnings')}
            >
              Thu nhập
            </button>
            <button
              className={`px-6 py-3 rounded-xl font-bold transition-all text-base ${
                activeTab === 'reputation'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-blue-200 hover:bg-blue-500/10'
              }`}
              onClick={() => setActiveTab('reputation')}
            >
              Danh tiếng
            </button>
          </div>
          
          {activeTab === 'in-progress' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Dự án đang thực hiện</h2>
                <Badge className="border-blue-700 text-blue-700 bg-white font-semibold">{inProgressJobs.length} dự án</Badge>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                  <span className="ml-4 text-blue-400">Đang tải công việc...</span>
                </div>
              ) : error ? (
                <div className="text-red-400 text-center py-20">
                  <Briefcase className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-xl font-semibold mb-2">Lỗi tải công việc</p>
                  <p>{error}</p>
                </div>
              ) : inProgressJobs.length === 0 ? (
                <div className="text-gray-400 text-center py-20">
                  <Briefcase className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Không có dự án đang thực hiện nào.</h3>
                  <p>Bạn chưa bắt đầu hoặc được chấp thuận cho bất kỳ dự án nào.</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl hover:border-blue-500/30 transition-all duration-300">
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-semibold">{inProgressJobs[0].category}</Badge>
                            <span className="text-sm text-blue-400 flex items-center gap-1 font-semibold">
                              <Clock className="w-4 h-4" />
                              Đang thực hiện
                            </span>
                          </div>
                          <CardTitle className="text-xl text-white font-bold">{inProgressJobs[0].title}</CardTitle>
                          <CardDescription className="mt-2 flex items-center gap-4 text-gray-300 font-semibold">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${inProgressJobs[0].budget.min.toLocaleString()}-{inProgressJobs[0].budget.max.toLocaleString()} {inProgressJobs[0].budget.currency}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {inProgressJobs[0].duration}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-blue-200">{inProgressJobs[0].client.name}</div>
                            <div className="text-xs text-gray-400">Khách hàng</div>
                          </div>
                          <Avatar className="h-12 w-12 border-2 border-blue-500/30">
                            <AvatarImage src={inProgressJobs[0].client.avatar} />
                            <AvatarFallback className="bg-gray-100 text-blue-700">{inProgressJobs[0].client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-semibold text-blue-200">Tiến độ dự án</span>
                          <span className="text-sm font-bold text-blue-400">
                            {inProgressJobs.length > 0 ? 
                              `${Math.floor((inProgressJobs[0].current_milestone / inProgressJobs[0].milestones.length) * 100)}%` : '0%'
                            }
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: inProgressJobs.length > 0 ? `${(inProgressJobs[0].current_milestone / inProgressJobs[0].milestones.length) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-blue-200 mb-3">Các mốc quan trọng</h4>
                        <div className="space-y-2">
                          {inProgressJobs.map((job, index) => (
                            <div key={job.id} className="flex items-center gap-3 group">
                              {getMilestoneStatus(job, index) === "Hoàn thành" ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : getMilestoneStatus(job, index) === "Đã nộp" ? (
                                <div className="w-5 h-5 rounded-full border-2 border-blue-400 bg-blue-900 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
                              )}
                              <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors duration-200 cursor-pointer">
                                Milestone {index + 1}: {getMilestoneStatus(job, index)}
                              </span>
                              <Badge className={`${getMilestoneBadgeVariant(job, index)} ml-auto font-semibold`}>
                                {getMilestoneStatus(job, index)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          {/* Render buttons based on user role and job status */}
                          {inProgressJobs[0].poster.toLowerCase() === account?.toLowerCase() && !inProgressJobs[0].completed && inProgressJobs[0].worker?.toLowerCase() === account?.toLowerCase() && (
                            <> {/* Only if a worker is approved */}
                              <Button className="group relative z-10 cursor-pointer overflow-hidden rounded-full font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10">
                                <span className="relative inline-flex overflow-hidden font-primary text-base">
                                  <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">Duyệt/Từ chối</div>
                                  <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">Duyệt/Từ chối</div>
                                </span>
                              </Button>
                              <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white group relative z-10 cursor-pointer overflow-hidden rounded-full font-semibold py-3 px-8 transition-all duration-300 shadow">
                                <span className="relative inline-flex overflow-hidden font-primary text-base">
                                  <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">Hủy công việc</div>
                                  <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">Hủy công việc</div>
                                </span>
                              </Button>
                            </>
                          )}
                          {inProgressJobs[0].worker?.toLowerCase() === account?.toLowerCase() && !inProgressJobs[0].completed && inProgressJobs[0].approved && (
                            <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white group relative z-10 cursor-pointer overflow-hidden rounded-full font-semibold py-3 px-8 transition-all duration-300 shadow">
                              <span className="relative inline-flex overflow-hidden font-primary text-base">
                                <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">Nộp Milestone</div>
                                <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">Nộp Milestone</div>
                              </span>
                            </Button>
                          )}
                          {!inProgressJobs[0].poster.toLowerCase() === account?.toLowerCase() && !inProgressJobs[0].worker?.toLowerCase() === account?.toLowerCase() && inProgressJobs[0].applications.some(app => app.worker.toLowerCase() === account?.toLowerCase()) && !inProgressJobs[0].approved && (
                            <Button className="group relative z-10 cursor-pointer overflow-hidden rounded-full font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10" disabled>
                              <span className="relative inline-flex overflow-hidden font-primary text-base">
                                <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">Đã ứng tuyển</div>
                                <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">Đã ứng tuyển</div>
                              </span>
                            </Button>
                          )}
                          {!inProgressJobs[0].poster.toLowerCase() === account?.toLowerCase() && !inProgressJobs[0].worker?.toLowerCase() === account?.toLowerCase() && (
                             <Button className="group relative z-10 cursor-pointer overflow-hidden rounded-full font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10">
                                <span className="relative inline-flex overflow-hidden font-primary text-base">
                                  <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">Xem chi tiết</div>
                                  <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">Xem chi tiết</div>
                                </span>
                              </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
          {activeTab === 'completed' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Dự án đã hoàn thành</h2>
                <Badge className="border-blue-700 text-blue-700 bg-white font-semibold">{completedJobs.length} dự án</Badge>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                  <span className="ml-4 text-blue-400">Đang tải công việc...</span>
                </div>
              ) : error ? (
                <div className="text-red-400 text-center py-20">
                  <Briefcase className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-xl font-semibold mb-2">Lỗi tải công việc</p>
                  <p>{error}</p>
                </div>
              ) : completedJobs.length === 0 ? (
                <div className="text-gray-400 text-center py-20">
                  <Briefcase className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Không có dự án đã hoàn thành nào.</h3>
                  <p>Bạn chưa hoàn thành bất kỳ dự án nào.</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl hover:border-blue-500/30 transition-all duration-300">
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-semibold">{completedJobs[0].category}</Badge>
                            <span className="text-sm text-blue-400 flex items-center gap-1 font-semibold">
                              <CheckCircle className="w-4 h-4" />
                              Đã hoàn thành
                            </span>
                          </div>
                          <CardTitle className="text-xl text-white font-bold">{completedJobs[0].title}</CardTitle>
                          <CardDescription className="mt-2 flex items-center gap-4 text-gray-300 font-semibold">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${completedJobs[0].budget.min.toLocaleString()}-{completedJobs[0].budget.max.toLocaleString()} {completedJobs[0].budget.currency}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {completedJobs[0].duration}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-blue-200">{completedJobs[0].client.name}</div>
                            <div className="text-xs text-gray-400">Khách hàng</div>
                          </div>
                          <Avatar className="h-12 w-12 border-2 border-blue-500/30">
                            <AvatarImage src={completedJobs[0].client.avatar} />
                            <AvatarFallback className="bg-gray-100 text-blue-700">{completedJobs[0].client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-blue-200 mb-3">Các mốc quan trọng</h4>
                        <div className="space-y-2">
                          {completedJobs.map((job, index) => (
                            <div key={job.id} className="flex items-center gap-3 group">
                              {getMilestoneStatus(job, index) === "Hoàn thành" ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
                              )}
                              <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors duration-200 cursor-pointer">
                                Milestone {index + 1}: {getMilestoneStatus(job, index)}
                              </span>
                              <Badge className={`${getMilestoneBadgeVariant(job, index)} ml-auto font-semibold`}>
                                {getMilestoneStatus(job, index)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <Button className="group relative z-10 cursor-pointer overflow-hidden rounded-full font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10">
                            <span className="relative inline-flex overflow-hidden font-primary text-base">
                              <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">Xem chi tiết</div>
                              <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">Xem chi tiết</div>
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Tổng quan thu nhập</h2>
              <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6">
                <CardTitle className="text-xl text-blue-400 mb-4">Biểu đồ thu nhập (Sắp ra mắt)</CardTitle>
                <CardContent className="text-gray-400 text-center py-10">
                  Tính năng này sẽ sớm có mặt!
                </CardContent>
              </Card>
            </div>
          )}
          {activeTab === 'reputation' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Tổng quan danh tiếng</h2>
              <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6">
                <CardTitle className="text-xl text-violet-400 mb-4">Điểm danh tiếng của bạn</CardTitle>
                <CardContent className="text-gray-400 text-center py-10">
                  Thông tin chi tiết về danh tiếng của bạn sẽ được hiển thị tại đây.
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
