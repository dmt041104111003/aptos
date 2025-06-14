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
  CalendarCheck,
  Copy
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';
import { useWallet } from '../context/WalletContext';
import { useProfile } from '../contexts/ProfileContext';
import { convertIPFSURL } from '@/utils/ipfs';
import { toast } from '@/components/ui/sonner';
import { aptos, fetchProfileDetails } from '@/utils/aptosUtils';

// Define JobPost interface locally to ensure consistency
interface JobPost {
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
  posterProfile: string;
  postedAt: string;
  initialFundAmount: number;
  client: {
    id: string;
    name: string;
    profilePic: string;
  };
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
  applications: { worker: string; apply_time: number; did: string; profile_cid: string; workerProfileName: string; workerProfilePic: string }[];
  approve_time: number | null;
  poster_did: string;
  poster_profile_cid: string;
  completed: boolean;
  rejected_count: number;
  job_expired: boolean;
  auto_confirmed: boolean[];
  milestone_deadlines: number[];
  application_deadline: number;
  selected_application_index: number | null;
  last_reject_time: number | null;
}

const CONTRACT_ADDRESS = "0x107b835625f8dbb3a185aabff8f754e5a98715c7dc9369544f8920c0873ccf2a";
const MODULE_ADDRESS = "0x107b835625f8dbb3a185aabff8f754e5a98715c7dc9369544f8920c0873ccf2a";
const JOBS_MARKETPLACE_MODULE_NAME = "job_marketplace_v15";
const PROFILE_MODULE_NAME = "web3_profiles_v12";
const PROFILE_RESOURCE_NAME = "ProfileRegistryV12";
const AUTO_CONFIRM_DELAY = 5 * 60; // 5 minutes in seconds

const Dashboard = () => {
  const { account, accountType } = useWallet();
  const { refetchProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<string>('in-progress');
  const [inProgressJobs, setInProgressJobs] = useState<JobPost[]>([]);
  const [completedJobs, setCompletedJobs] = useState<JobPost[]>([]);
  const [jobsWithApplications, setJobsWithApplications] = useState<JobPost[]>([]);
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
      const fetchedJobsWithApplications: JobPost[] = [];

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

      // Fetch all application and approval events directly
      console.log("Dashboard: Fetching all WorkerAppliedEvent...");
      const rawAppliedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerAppliedEvent`,
        options: {
          limit: 100,
        }
      });
      console.log("Dashboard: Fetched raw WorkerAppliedEvents:", rawAppliedEvents);

      console.log("Dashboard: Fetching all WorkerApprovedEvent...");
      const rawApprovedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::WorkerApprovedEvent`,
        options: {
          limit: 100,
        }
      });
      console.log("Dashboard: Fetched raw WorkerApprovedEvents:", rawApprovedEvents);

      // Add fetching MilestoneSubmittedEvent
      console.log("Dashboard: Fetching all MilestoneSubmittedEvent...");
      const rawSubmittedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::MilestoneSubmittedEvent`,
        options: {
          limit: 100,
        }
      });
      console.log("Dashboard: Fetched raw MilestoneSubmittedEvents:", rawSubmittedEvents);

      // Add fetching MilestoneAcceptedEvent
      console.log("Dashboard: Fetching all MilestoneAcceptedEvent...");
      const rawAcceptedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::MilestoneAcceptedEvent`,
        options: {
          limit: 100,
        }
      });
      console.log("Dashboard: Fetched raw MilestoneAcceptedEvents:", rawAcceptedEvents);

      // Add fetching MilestoneRejectedEvent
      console.log("Dashboard: Fetching all MilestoneRejectedEvent...");
      const rawRejectedEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::MilestoneRejectedEvent`,
        options: {
          limit: 100,
        }
      });
      console.log("Dashboard: Fetched raw MilestoneRejectedEvents:", rawRejectedEvents);


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
            console.log(`Dashboard: Job ${jobId} milestones:`, jobOnChain.milestones);
            console.log(`Dashboard: Job ${jobId} raw milestone_states from on-chain job:`, jobOnChain.milestone_states);
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

          // Build applications for this job from WorkerAppliedEvents
          const jobAppliedEvents = rawAppliedEvents.filter((e: any) => e.data.job_id.toString() === jobId);
          const applicationsWithProfiles = await Promise.all(jobAppliedEvents.map(async (appEvent: any) => {
            const workerProfile = await fetchProfileDetails(appEvent.data.worker);
            console.log(`Dashboard: Worker profile for application ${appEvent.data.worker}:`, workerProfile);
            return {
              worker: appEvent.data.worker,
              apply_time: Number(appEvent.data.apply_time),
              did: appEvent.data.did,
              profile_cid: appEvent.data.profile_cid,
              workerProfileName: workerProfile.name,
              workerProfilePic: workerProfile.profilePic,
            };
          }));

          // Determine approved worker from WorkerApprovedEvents
          const approvalEvent = rawApprovedEvents.find((e: any) => e.data.job_id.toString() === jobId);
          const approvedWorkerAddress = approvalEvent ? approvalEvent.data.worker : null;
          const isApproved = !!approvalEvent;
          const approveTime = approvalEvent ? Number(approvalEvent.data.approve_time) : null;

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
              profilePic: posterProfile.profilePic,
            },
            start_time: Number(jobOnChain.start_time),
            end_time: Number(jobOnChain.end_time || 0),
            milestones: jobOnChain.milestones ? jobOnChain.milestones.map(Number) : [],
            duration_per_milestone: jobOnChain.duration_per_milestone ? jobOnChain.duration_per_milestone.map(Number) : [],
            worker: approvedWorkerAddress, // Use derived approved worker
            approved: isApproved, // Use derived approved status
            active: jobOnChain.active,
            current_milestone: Number(jobOnChain.current_milestone),
            // Initialize milestone_states from on-chain data or default
            milestone_states: await (async () => {
                const fetchedMilestoneStates: JobPost['milestone_states'] = {};
                const milestoneStatesHandle = jobOnChain.milestone_states?.handle;
                console.log(`Dashboard: Job ${jobId} milestoneStatesHandle:`, milestoneStatesHandle);
                if (milestoneStatesHandle && jobOnChain.milestones) {
                    for (let i = 0; i < jobOnChain.milestones.length; i++) {
                        try {
                            const milestoneData = await aptos.getTableItem<any>({
                                handle: milestoneStatesHandle,
                                data: {
                                    key_type: "u64",
                                    value_type: `${MODULE_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::MilestoneData`,
                                    key: i,
                                },
                            });
                            console.log(`Dashboard: Job ${jobId}, Milestone ${i} fetched data from table:`, milestoneData);
                            fetchedMilestoneStates[i] = {
                                submitted: milestoneData.submitted,
                                accepted: milestoneData.accepted,
                                submit_time: Number(milestoneData.submit_time),
                                reject_count: Number(milestoneData.reject_count),
                            };
                        } catch (milestoneTableError) {
                            console.warn(`Dashboard: Could not fetch milestone data for job ${jobId}, milestone ${i} from table:`, milestoneTableError);
                            fetchedMilestoneStates[i] = {
                                submitted: false,
                                accepted: false,
                                submit_time: 0,
                                reject_count: 0,
                            }; // Default if not found
                        }
                    }
                }
                console.log(`Dashboard: Job ${jobId} Milestone states initialized from table:`, fetchedMilestoneStates);
                return fetchedMilestoneStates;
            })(),
            submit_time: jobOnChain.submit_time ? Number(jobOnChain.submit_time) : null,
            escrowed_amount: Number(jobOnChain.escrowed_amount),
            applications: applicationsWithProfiles, // Use applications built from events
            approve_time: approveTime, // Use derived approve time
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

          // --- Process events to update milestone states ---
          // Use a temporary map to store state based on events, then merge.
          // This ensures events override table data for real-time status.
          const tempMilestoneStatesFromEvents: JobPost['milestone_states'] = { ...jobPost.milestone_states }; // Start with table data

          // Process submitted events
          const jobSubmittedEvents = rawSubmittedEvents.filter((e: any) => e.data.job_id.toString() === jobId);
          if (jobSubmittedEvents.length > 0) {
            console.log(`Dashboard: Found ${jobSubmittedEvents.length} submitted events for job ${jobId}. Processing...`);
            jobSubmittedEvents.forEach((event: any) => {
              const milestoneIndex = Number(event.data.milestone); // Correct field name
              if (tempMilestoneStatesFromEvents[milestoneIndex]) {
                tempMilestoneStatesFromEvents[milestoneIndex] = {
                  ...tempMilestoneStatesFromEvents[milestoneIndex],
                  submitted: true,
                  submit_time: Number(event.data.submit_time)
                };
                console.log(`Dashboard: Updated milestone ${milestoneIndex} (submitted) for job ${jobId} based on event:`, tempMilestoneStatesFromEvents[milestoneIndex]);
              } else {
                 // Initialize if milestone data wasn't in table (shouldn't happen for existing milestones, but for robustness)
                 tempMilestoneStatesFromEvents[milestoneIndex] = {
                    submitted: true, accepted: false, submit_time: Number(event.data.submit_time), reject_count: 0
                 };
                 console.log(`Dashboard: Initialized and updated milestone ${milestoneIndex} (submitted) from event for job ${jobId}:`, tempMilestoneStatesFromEvents[milestoneIndex]);
              }
            });
          }

          // Process accepted events
          const jobAcceptedEvents = rawAcceptedEvents.filter((e: any) => e.data.job_id.toString() === jobId);
          if (jobAcceptedEvents.length > 0) {
              console.log(`Dashboard: Found ${jobAcceptedEvents.length} accepted events for job ${jobId}. Processing...`);
              jobAcceptedEvents.forEach((event: any) => {
                  const milestoneIndex = Number(event.data.milestone); // Correct field name
                  if (tempMilestoneStatesFromEvents[milestoneIndex]) {
                      tempMilestoneStatesFromEvents[milestoneIndex] = {
                          ...tempMilestoneStatesFromEvents[milestoneIndex],
                          submitted: true, // Should already be submitted if accepted
                          accepted: true
                      };
                      console.log(`Dashboard: Updated milestone ${milestoneIndex} (accepted) for job ${jobId} based on event:`, tempMilestoneStatesFromEvents[milestoneIndex]);
                  } else { // Handle case where submitted event was somehow missed or not processed first
                      tempMilestoneStatesFromEvents[milestoneIndex] = {
                         submitted: true, accepted: true, submit_time: Number(event.data.accept_time), reject_count: 0 // Using accept_time as submit_time if submitted wasn't seen
                      };
                      console.log(`Dashboard: Initialized and updated milestone ${milestoneIndex} (accepted) from event for job ${jobId}:`, tempMilestoneStatesFromEvents[milestoneIndex]);
                  }
              });
          }

          // Process rejected events
          const jobRejectedEvents = rawRejectedEvents.filter((e: any) => e.data.job_id.toString() === jobId);
          if (jobRejectedEvents.length > 0) {
              console.log(`Dashboard: Found ${jobRejectedEvents.length} rejected events for job ${jobId}. Processing...`);
              jobRejectedEvents.forEach((event: any) => {
                  const milestoneIndex = Number(event.data.milestone); // Correct field name
                  if (tempMilestoneStatesFromEvents[milestoneIndex]) {
                      tempMilestoneStatesFromEvents[milestoneIndex] = {
                          ...tempMilestoneStatesFromEvents[milestoneIndex],
                          submitted: false, // Rejected means it's no longer considered submitted for re-submission
                          accepted: false,
                          reject_count: Number(event.data.reject_count)
                      };
                      console.log(`Dashboard: Updated milestone ${milestoneIndex} (rejected) for job ${jobId} based on event:`, tempMilestoneStatesFromEvents[milestoneIndex]);
                  } else { // Handle case where milestone data wasn't in table or previous events
                       tempMilestoneStatesFromEvents[milestoneIndex] = {
                          submitted: false, accepted: false, submit_time: 0, reject_count: Number(event.data.reject_count)
                       };
                       console.log(`Dashboard: Initialized and updated milestone ${milestoneIndex} (rejected) from event for job ${jobId}:`, tempMilestoneStatesFromEvents[milestoneIndex]);
                  }
              });
          }

          // Assign the potentially updated milestone_states
          jobPost.milestone_states = tempMilestoneStatesFromEvents;
          console.log(`Dashboard: Final milestone states for job ${jobId} after event processing:`, jobPost.milestone_states);


          const userAddress = account.toLowerCase();
          const isPoster = jobPost.poster.toLowerCase() === userAddress;
          const isWorker = jobPost.worker && jobPost.worker.toLowerCase() === userAddress;
          const isApplicant = jobPost.applications.some(app => app.worker && app.worker.toLowerCase() === userAddress);

          // Detailed logging for classification
          console.log(`Dashboard: --- Processing Job ID: ${jobId} ---`);
          console.log(`Dashboard: Job Poster (on-chain): ${jobOnChain.poster}, Is Current User Poster: ${isPoster}`);
          console.log(`Dashboard: Current Account: ${userAddress}`);
          console.log(`Dashboard: Job Worker (derived): ${jobPost.worker}, Is Current User Worker: ${isWorker}`); // Using derived worker
          console.log(`Dashboard: Number of applications for Job ${jobId}: ${jobPost.applications.length}, Is Current User Applicant: ${isApplicant}`);
          console.log(`Dashboard: Job Active: ${jobOnChain.active}, Completed: ${jobOnChain.completed}, Expired: ${jobOnChain.job_expired}`);
          console.log(`Dashboard: Applications array for Job ${jobId}:`, jobPost.applications);


          if (isPoster || isWorker || isApplicant) {
            if (jobPost.completed || jobPost.job_expired || !jobPost.active) {
              fetchedCompletedJobs.push(jobPost);
              console.log(`Dashboard: Job ${jobId} pushed to completed jobs.`);
            } else {
              fetchedInProgressJobs.push(jobPost);
              console.log(`Dashboard: Job ${jobId} pushed to in-progress jobs.`);
            }
          }

          // Logic for 'jobsWithApplications' tab
          // A job is in "applications" tab if the current user is the poster, it has applications, and no worker has been approved yet.
          if (isPoster && jobPost.applications.length > 0 && !jobPost.worker) {
            fetchedJobsWithApplications.push(jobPost);
            console.log(`Dashboard: Job ${jobId} ADDED to jobs with applications. Current count: ${fetchedJobsWithApplications.length}`);
          } else {
            console.log(`Dashboard: Job ${jobId} NOT ADDED to jobs with applications. Conditions (isPoster && applications.length > 0 && !jobPost.worker): ${isPoster} && ${jobPost.applications.length > 0} && ${!jobPost.worker}`);
          }

        } catch (jobFetchError) {
          console.error(`Dashboard: Error fetching on-chain data for job ${jobId}:`, jobFetchError);
        }
      }

      console.log("Dashboard: Final job arrays: ", {
        inProgress: fetchedInProgressJobs.length,
        completed: fetchedCompletedJobs.length,
        withApplications: fetchedJobsWithApplications.length
      });

      setInProgressJobs(fetchedInProgressJobs);
      setCompletedJobs(fetchedCompletedJobs);
      setJobsWithApplications(fetchedJobsWithApplications);
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
    if (!milestoneData) return 'secondary'; // Default to secondary if no data
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
      refetchProfile(); // Refresh profile/reputation
    } catch (error: any) {
      console.error('Chấp nhận ứng viên thất bại:', error);
      toast.error(`Chấp nhận ứng viên thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleSubmitMilestone = async (jobId: string, milestoneIndex: number) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để nộp cột mốc.');
      return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::submit_milestone`,
        type_arguments: [],
        arguments: [
          jobId, // job_id: u64
          milestoneIndex // milestone_index: u64
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success(`Cột mốc ${milestoneIndex + 1} đã được nộp thành công!`);
      loadUserJobs();
      refetchProfile(); // Refresh profile/reputation
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
        function: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::accept_milestone`,
        type_arguments: [],
        arguments: [
          jobId, // job_id: u64
          milestoneIndex // milestone_index: u64
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success(`Cột mốc ${milestoneIndex + 1} đã được chấp nhận thành công!`);
      loadUserJobs();
      refetchProfile(); // Refresh profile/reputation
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
        function: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::reject_milestone`,
        type_arguments: [],
        arguments: [
          jobId, // job_id: u64
          milestoneIndex // milestone_index: u64
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success(`Cột mốc ${milestoneIndex + 1} đã được từ chối.`);
      loadUserJobs();
      refetchProfile(); // Refresh profile/reputation
    } catch (error: any) {
      console.error('Từ chối cột mốc thất bại:', error);
      toast.error(`Từ chối cột mốc thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleAutoConfirmMilestone = async (jobId: string, milestoneIndex: number) => {
    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để tự động xác nhận cột mốc.');
      return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::auto_confirm_milestone`,
        type_arguments: [],
        arguments: [
          jobId, // job_id: u64
          milestoneIndex // milestone_index: u64
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success(`Cột mốc ${milestoneIndex + 1} đã được tự động xác nhận.`);
      loadUserJobs();
      refetchProfile(); // Refresh profile/reputation
    } catch (error: any) {
      console.error('Tự động xác nhận cột mốc thất bại:', error);
      toast.error(`Tự động xác nhận cột mốc thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
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
        function: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::cancel_job`,
        type_arguments: [],
        arguments: [
          jobId // job_id: u64
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Dự án đã được hủy thành công!');
      loadUserJobs();
      refetchProfile(); // Refresh profile/reputation
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
        function: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::complete_job`,
        type_arguments: [],
        arguments: [
          jobId // job_id: u64
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Dự án đã được đánh dấu hoàn thành thành công!');
      loadUserJobs();
      refetchProfile(); // Refresh profile/reputation
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
        function: `${CONTRACT_ADDRESS}::${JOBS_MARKETPLACE_MODULE_NAME}::expire_job`,
        type_arguments: [],
        arguments: [
          jobId // job_id: u64
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Dự án đã được đánh dấu hết hạn thành công!');
      loadUserJobs();
      refetchProfile(); // Refresh profile/reputation
    } catch (error: any) {
      console.error('Đánh dấu hết hạn dự án thất bại:', error);
      toast.error(`Đánh dấu hết hạn dự án thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Đã sao chép địa chỉ ví!"))
      .catch(() => toast.error("Không thể sao chép."));
  };

  const renderJobCard = (job: JobPost, type: 'in-progress' | 'completed' | 'applications') => {
    const userAddress = account?.toLowerCase();
    const isPoster = job.poster.toLowerCase() === userAddress;
    const isWorker = job.worker && job.worker.toLowerCase() === userAddress;
    const isApplicant = job.applications.some(app => app.worker && app.worker.toLowerCase() === userAddress);

    // Check if the current job has the necessary milestone data to display the section
    const hasMilestonesToDisplay = job.milestones && job.milestones.length > 0 && type === 'in-progress';

    // Log for debugging
    console.log(`Job ID: ${job.id}`);
    console.log(`Milestones array:`, job.milestones);
    console.log(`Milestone states object:`, job.milestone_states);


    return (
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
                  {(isPoster || isWorker || isApplicant) && ( // Show poster info to all relevant parties
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-blue-500">
                      <AvatarImage src={job.client.profilePic} alt={job.client.name} />
                      <AvatarFallback>{job.client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium text-white">Người đăng: {isPoster ? 'Bạn' : job.client.name}</p>
                      <p className="text-xs text-gray-400">Đăng lúc: {formatPostedTime(job.start_time)}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
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
                )}

                {/* Worker Info */}
                  {job.worker && (
                  <div className="flex items-center gap-3">
                      <Avatar className={`w-10 h-10 border-2 ${isWorker ? 'border-green-500' : 'border-gray-500'}`}>
                      <AvatarImage src={job.applications.find(app => app.worker.toLowerCase() === job.worker?.toLowerCase())?.workerProfilePic} alt="Worker Avatar" />
                      <AvatarFallback>WK</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium text-white">Người thực hiện: {isWorker ? 'Bạn' : (job.applications.find(app => app.worker.toLowerCase() === job.worker?.toLowerCase())?.workerProfileName || 'Ẩn danh')}</p>
                      <p className="text-xs text-gray-400">Được chấp nhận lúc: {formatPostedTime(job.approve_time || 0)}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <span>Địa chỉ ví: {job.worker.slice(0, 6)}...{job.worker.slice(-4)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopy(job.worker); }}
                            className="text-gray-500 hover:text-blue-400 p-1 rounded-sm transition-colors"
                            title="Sao chép địa chỉ ví"
                          >
                            <Copy size={12} />
                          </button>
                    </div>
                    </div>
                  </div>
                )}

                {/* Milestones for active jobs */}
                  {hasMilestonesToDisplay && (
                  <div className="mt-4">
                    <h4 className="font-medium text-white mb-2 flex items-center gap-2"><Hourglass size={16} className="text-yellow-400" />Tiến độ dự án ({job.current_milestone}/{job.milestones.length})</h4>
                    <ul className="space-y-2">
                        {job.milestones.map((amount, index) => {
                          const milestoneData = job.milestone_states[index];
                          const isCurrentMilestone = job.current_milestone === index;
                          const isSubmitted = milestoneData?.submitted;
                          const isAccepted = milestoneData?.accepted;
                          const isRejected = milestoneData?.reject_count > 0 && !isSubmitted && !isAccepted;
                          
                          const showSubmitButton = isWorker && isCurrentMilestone && !isSubmitted && !isAccepted;
                          const showAcceptRejectButtons = isPoster && isCurrentMilestone && isSubmitted && !isAccepted;
                          const autoConfirmThresholdReached = milestoneData?.submit_time && (Date.now() / 1000) >= (milestoneData.submit_time + AUTO_CONFIRM_DELAY);
                          const showAutoConfirmButton = (isPoster || isWorker) && isCurrentMilestone && isSubmitted && !isAccepted && autoConfirmThresholdReached;

                          return (
                            <li key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-700/30 px-3 py-2 rounded-md">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 sm:mb-0">
                                <span className="text-sm text-gray-300">Giai đoạn {index + 1}: ${amount / 100_000_000} APT</span>
                          <Badge variant={getMilestoneBadgeVariant(job, index)}>{getMilestoneStatus(job, index)}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 justify-end">
                                {showSubmitButton && (
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSubmitMilestone(job.id, index)}>
                                    Nộp cột mốc
                                  </Button>
                                )}
                                {showAcceptRejectButtons && (
                                  <>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAcceptMilestone(job.id, index)}>
                                      Chấp nhận
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRejectMilestone(job.id, index)}>
                                      Từ chối
                                    </Button>
                                  </>
                                )}
                                {showAutoConfirmButton && (
                                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleAutoConfirmMilestone(job.id, index)}>
                                    Tự động xác nhận
                                  </Button>
                                )}
                              </div>
                        </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
                  {!hasMilestonesToDisplay && job.milestones.length === 0 && type === 'in-progress' && (
                    <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-white/10 text-center text-gray-400 text-sm">
                      Dự án này chưa có cột mốc nào được định nghĩa.
                    </div>
                  )}

                  {/* Job action buttons (Cancel, Complete, Expire) */}
                  {type === 'in-progress' && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-3 justify-end">
                      {isPoster && !job.worker && job.active && (
                        <Button size="sm" variant="destructive" onClick={() => handleCancelJob(job.id)}>
                          Hủy dự án
                        </Button>
                      )}
                      {isPoster && job.worker && job.active && job.current_milestone === job.milestones.length && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCompleteJob(job.id)}>
                          Hoàn thành dự án
                        </Button>
                      )}
                      {isPoster && !job.completed && !job.job_expired && job.active && (Date.now() / 1000) > job.application_deadline && (
                        <Button size="sm" variant="outline" className="bg-orange-600/20 text-orange-400 hover:bg-orange-600/30" onClick={() => handleExpireJob(job.id)}>
                          Đánh dấu hết hạn
                        </Button>
                      )}
                  </div>
                )}

                {/* Application List (for posters) */}
                  {(type === 'applications' || (type === 'in-progress' && isPoster && !job.worker)) && job.applications.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2"><Users size={16} className="text-blue-300" />Đơn ứng tuyển ({job.applications.length})</h4>
                    <ul className="space-y-3">
                      {job.applications.map((app, index) => (
                        <li key={index} className="flex items-center justify-between bg-blue-800/30 p-3 rounded-md">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={app.workerProfilePic} alt={app.workerProfileName} />
                              <AvatarFallback>{app.workerProfileName.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-white">{app.workerProfileName}</p>
                              <p className="text-xs text-gray-400">Ứng tuyển lúc: {formatPostedTime(app.apply_time)}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <span>Địa chỉ ví: {app.worker.slice(0, 6)}...{app.worker.slice(-4)}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCopy(app.worker); }}
                                    className="text-gray-500 hover:text-blue-400 p-1 rounded-sm transition-colors"
                                    title="Sao chép địa chỉ ví"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
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

                  {(type === 'applications' || (type === 'in-progress' && isPoster && !job.worker)) && job.applications.length === 0 && (
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
              <div className="text-3xl font-bold text-violet-400">{jobsWithApplications.length}</div>
              <div className="text-gray-400">Dự án đang ứng tuyển</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{completedJobs.length}</div>
              <div className="text-gray-400">Dự án đã hoàn thành</div>
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
              onClick={() => setActiveTab('applications')}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === 'applications'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              } transition-colors duration-200`}
            >
              Đang ứng tuyển ({jobsWithApplications.length})
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

              {activeTab === 'applications' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {jobsWithApplications.length > 0 ? (
                    jobsWithApplications.map(job => renderJobCard(job, 'applications'))
                  ) : (
                    <div className="lg:col-span-2 text-center py-10 bg-gray-900/50 rounded-lg border border-white/10 text-gray-400">
                      Chưa có đơn ứng tuyển nào.
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