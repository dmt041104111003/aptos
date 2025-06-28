
import Navbar from "@/components/ui2/Navbar";
import Footer from "@/components/ui2/Footer";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  Copy,
  Check,
  UserCircle,
  CalendarCheck,
  CalendarClock,
  ListChecks,
  CheckIcon,
  DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
import { aptos } from "@/utils/aptosUtils";
import { useWallet } from "../context/WalletContext";
import { useParams } from "react-router-dom";

const PROFILE_MODULE = {
  address: "ace43838f2177534b89771250d889882114415bbc187c3892752569a9831bba0",
  name: "web3_profiles_v29",
};

const JOB_MODULE = {
  address: "ace43838f2177534b89771250d889882114415bbc187c3892752569a9831bba0", 
  name: "job_marketplace_v29",
};

interface JobView {
  poster: string;
  cid: string;
  start_time: string;
  end_time: string;
  milestones: number;
  worker: string;
}
interface ProfileDataFromChain {
  name: string;
  cid: string;
  cccd: number;
  did: string;
  created_at: number;
  email: string;
  phone: string;
  _skills: string[];
  bio: string;
  tax_ID: string;
  introduction: string;
  trust_score: number;
  location: string;
}

export default function Profile() {
  const { account } = useWallet();
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<ProfileDataFromChain>(null);
  const [jobs, setJobs] = useState<JobView[]>([]);
  const { address } = useParams();
  const navigate = useNavigate();



  const handleCopy = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
  const fetchProfileAndJobs = async () => {
    if (!account) return;
    try {
      const profileResult = await aptos.view({
        payload: {
          function: `${PROFILE_MODULE.address}::${PROFILE_MODULE.name}::get_profile_by_address`,
          functionArguments: [address],
        },
      });
      setProfile(profileResult[0]);

      const jobResult = await aptos.view({
        payload: {
          function: `${JOB_MODULE.address}::${JOB_MODULE.name}::get_completed_job_latest`,
          functionArguments: [address],
        },
      });
      setJobs(jobResult[0] as JobView[]);
      console.log(jobResult);
    } catch (err) {
      console.error("Lỗi khi fetch profile hoặc jobs:", err);
    }
  };

  fetchProfileAndJobs();
}, [account, address]); 

  return (
    <div className="mx-auto min-h-screen bg-black text-white">
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col md:flex-row items-start gap-6 my-10 max-w-5xl mx-auto"
      >
        <motion.img
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          src="/logo/logo.png"
          alt="Avatar"
          width={200}
          height={200}
          className="rounded-full border-2 my-auto border-white"
        />

        <motion.div className="flex-1 space-y-1 my-auto">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              {profile?.name || ""}
            </h2>
            <span className="text-xs text-white bg-green-400 px-2 py-1 rounded font-semibold">
              {profile == null ? "CHƯA XÁC THỰC" : "ĐÃ XÁC THỰC"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-gray-400">
              Uy tín: <span>{profile?.trust_score || 0}/100</span>
            </p>
            <CheckIcon className="w-4 h-4 text-green-400" />
            {
              address == account && <p className="bg-yellow-400 text-red-500 font-semibold text-sm hover:bg-yellow-500 rounded px-3 cursor-pointer">
              Nâng cấp
            </p>
            }
          </div>

          <div className="text-sm text-gray-500">
            <p>Mã số thuế: <span>{profile?.tax_ID}</span></p>
            <p className="flex items-center gap-2">
              Ví: <span className="text-grey-500" title={account}>{address.toString().slice(0, 35)}...</span>
              <button onClick={handleCopy} title="Sao chép địa chỉ">
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </p>
          </div>

          <p className="mt-2 text-sm text-grey-500">{profile?.bio}</p>
        </motion.div>

        <motion.div className="bg-gray-900 p-4 rounded-lg shadow-md w-full md:w-72 my-auto space-y-4 border border-gray-800">
          <h3 className="font-semibold text-lg">Thông tin liên lạc</h3>
          <div className="text-sm space-y-1 text-gray-300">
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> {profile?.email || "(chưa có)"}
            </p>
            <p className="flex items-center gap-2 mt-1">
              <Phone className="w-4 h-4" /> {profile?.phone || "(chưa có)"}
            </p>
          </div>

          {
             address != account &&<> <a
            href={`mailto:${profile?.email}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block text-center bg-blue-500 hover:bg-blue-400 text-white font-medium py-2 rounded"
          >
            Liên hệ
          </a>
          <p className="text-xs text-gray-500">
            Nhấn Liên hệ trực tiếp để làm việc với khách hàng ngay lập tức
          </p> </> 
          }
          
          
        </motion.div>
      </motion.div>

      <motion.div className="mt-4 mb-8 max-w-5xl mx-auto">
        <h4 className="font-semibold text-white mb-1">Giới thiệu</h4>
        <p className="text-sm text-gray-400">
          {profile?.introduction || "(chưa cập nhật...)"}
        </p>
      </motion.div>

      <motion.div className="mt-4 mb-8 max-w-5xl mx-auto">
        <h4 className="font-semibold text-white mb-3">Kỹ năng</h4>
        <div className="flex flex-wrap gap-2">
          {profile?._skills?.length > 0 ? (
            profile._skills.map((skill: string, idx: number) => (
              <motion.span
                key={idx}
                whileHover={{ scale: 1.1 }}
                className="px-3 py-1 text-xs bg-gray-800 border border-gray-600 rounded-full text-white"
              >
                {skill}
              </motion.span>
            ))
          ) : (
            <span className="text-gray-500">(chưa cập nhật kỹ năng)</span>
          )}
        </div>
      </motion.div>

      <motion.div className="mt-4 max-w-5xl mx-auto pb-24">
        <h4 className="font-semibold mb-3">Công việc đã hoàn thành gần đây</h4>

        {jobs.length > 0 ? (
          jobs.map((job, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="bg-gray-900 border border-gray-700 rounded-lg p-5 space-y-3 mb-3"
            >
              {/* <p className="text-blue-400 text-sm hover:underline cursor-pointer ">
                {job.cid}
              </p> */}
              <div className="text-sm text-gray-300 space-y-1">
                <p className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4 " /> Người đăng:
                  <span className="text-blue-400 hover:underline cursor-pointer"
                  onClick={() => navigate(`/profile/${job.poster}`)}>
                    {job.poster}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4" /> Ngày đăng:{" "}
                  {new Date(Number(job.start_time) * 1000).toLocaleDateString()}
                </p>
               
                <p className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4" /> Số cột mốc: {job.milestones.length}
                </p>
                 <p className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Tổng số tiền:{" "}
                  {
                    job.milestones.reduce(
                      (sum, priceString) => sum + parseFloat(priceString)/10000000 ,
                      0
                    )
                  }{" "}
                  APT
                </p>



              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">(Chưa có công việc nào)</p>
        )}
      </motion.div>

      <Footer />
    </div>
  );
}
