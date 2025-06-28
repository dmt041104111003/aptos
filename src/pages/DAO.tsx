import {
  MapPin,
  CalendarDays,
  BadgeDollarSign,
  User,
  Mail,
  Phone,
  PlusCircle,
  FileText,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Navbar from "@/components/ui2/Navbar";
import Footer from "@/components/ui2/Footer";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { useNavigate } from "react-router-dom";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";


export default function DAOPage() {
  const config = new AptosConfig({
    network: Network.TESTNET,
    clientConfig: {
      API_KEY: "AG-LA7UZDTNF2T1Y6H1DFA6CNSGVRQSRUKSA",
    },
  });
  const wallet = useWallet();
  const aptos = new Aptos(config);
  const navigate = useNavigate();

  const DAO_MODULE = {
    address: "ace43838f2177534b89771250d889882114415bbc187c3892752569a9831bba0",
    name: "dao_vote",
  };

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    freelancer: "",
    client: "",
    jobIndex: "",
    milestoneIndex: "",
    description: "",
    documentLink: "",
  });

  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
      const fetchDisputes = async () => {
        try {
          const idsRaw = await aptos.view({
            payload:{
                function: `${DAO_MODULE.address}::${DAO_MODULE.name}::get_all_dispute_ids`,
              functionArguments: [],
            },
          });

        const ids = idsRaw[0] as string[];

        const details = await Promise.all(
          ids.map(async (id) => {
            const [res] = await aptos.view({
              payload:{
                function: `${DAO_MODULE.address}::${DAO_MODULE.name}::get_dispute_full`,
                functionArguments: [id],
              }
            });

            
            return { id, ...res };
          })
        );

        console.log("Danh sách tranh chấp:", details);
        setDisputes(details);

      } catch (e) {
        console.error("Lỗi khi load DAO disputes:", e);
      }
    };

    fetchDisputes();
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target ;
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitDispute = async () => {
    if (!formData.freelancer || !formData.client || !formData.description) {
      toast.error("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${DAO_MODULE.address}::${DAO_MODULE.name}::open_dispute_vote`,
        type_arguments: [],
        arguments: [
          formData.freelancer,
          formData.client,
          Number(formData.jobIndex),
          Number(formData.milestoneIndex)-1,
          formData.description,
          formData.documentLink,
        ],
      };

      const tx = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: tx.hash });

      toast.success("Tạo DAO thành công");
    } catch (error) {
      console.error("Lỗi khi gửi DAO:", error);
      toast.error("Tạo DAO thất bại");
    }
  };
  const handleCloseAndResolution = async (id: string) => {
   
    try {
      const payload = {
        type: "entry_function_payload",
        function: `${DAO_MODULE.address}::${DAO_MODULE.name}::resolve_dispute_and_close_vote`,
        type_arguments: [],
        arguments: [id],
      };

      const tx = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: tx.hash });

      toast.success("Hệ thống giải quyết DAO");
    } catch (error) {
      console.error("Lỗi khi gửi DAO:", error);
      toast.error("Hệ thống giải quyết DAO thất bại");
    }
  };

  return (
    <div className="w-full bg-black text-white space-y-10">
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto px-4 space-y-10"
      >
        <motion.h1
          className="text-3xl font-bold text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Tổng quan hệ thống DAO Tranh chấp
        </motion.h1>

        <motion.p
          className="text-gray-300 text-sm leading-relaxed text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          DAO giúp cộng đồng giải quyết tranh chấp giữa freelancer và nhà tuyển dụng minh bạch.
        </motion.p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Quyền lợi</h2>
            <ul className="list-disc text-sm text-gray-400 space-y-1 list-inside">
              <li>Tham gia bỏ phiếu xử lý tranh chấp</li>
              <li>Tăng điểm uy tín</li>
              <li>Nhận thưởng token</li>
            </ul>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Điều kiện tham gia</h2>
            <ul className="list-disc text-sm text-gray-400 space-y-1 list-inside">
              <li>Hoàn thành ≥ 3 công việc</li>
              <li>Uy tín trên 80</li>
              <li>Không bị báo cáo trong 60 ngày</li>
              <li>Đã KYC</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            className="bg-green-600 hover:bg-green-500"
            onClick={() => setShowForm(!showForm)}
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Tạo DAO Tranh chấp mới
          </Button>
        </div>

        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mt-4 space-y-4">
            <h3 className="text-lg font-semibold">Tạo tranh chấp mới</h3>
            <input
              type="text"
              name="freelancer"
              placeholder="Địa chỉ Freelancer"
              value={formData.freelancer}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded text-sm"
            />
            <input
              type="text"
              name="client"
              placeholder="Địa chỉ Client"
              value={formData.client}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded text-sm"
            />
            <input
              type="number"
              name="jobIndex"
              placeholder="Job ID"
              value={formData.jobIndex}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded text-sm"
            />
            <input
              type="number"
              name="milestoneIndex"
              placeholder="Milestone số"
              value={formData.milestoneIndex}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded text-sm"
            />
            <textarea
              name="description"
              placeholder="Mô tả chi tiết"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded text-sm"
            />
            <input
              name="documentLink"
              type="text"
              placeholder="Link tài liệu"
              value={formData.documentLink}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded text-sm"
            />
            <div className="flex justify-end">
              <Button onClick={submitDispute} className="bg-blue-600 hover:bg-blue-500">
                Gửi yêu cầu
              </Button>
            </div>
          </div>
        )}

        <motion.div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Các cuộc bỏ phiếu tranh chấp</h2>
          <div className="space-y-4">
           {[...disputes].reverse().map((vote, idx) => (
              <div
                key={idx}
                className="bg-gray-800 border border-gray-700 rounded p-4  "
              >
   
                <div className="space-y-1 ">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">
                      Tranh chấp #{vote.id}
                    </h3>
                     <p className="text-xs text-gray-500 italic">
                        Kết thúc:{" "}
                        {new Date(Number(vote.voting_deadline) * 1000).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                          timeZone: "Asia/Ho_Chi_Minh",
                        })}
                      </p>
                  </div>
                  

                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">Người tạo:</span> {vote.creator} 
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">Client:</span> {vote.client_address} {vote.winning_address == vote.client_address ? " (Thắng)" : ""}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">Freelancer:</span> {vote.freelancer_address} {vote.winning_address == vote.freelancer_address ? " (Thắng)" : ""}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">Mô tả:</span> {vote.description.slice(0, 100)}...
                  </p>
                </div>

                <div className="flex flex-row justify-end items-end text-right min-w-[180px]">
                
                  <Button
                    size="sm"
                    variant="outline"
                    disabled = {vote.is_resolved}
                    onClick={() => navigate(`/dao/${vote.id}`)}
                    className="text-xs text-white border-gray-500 hover:bg-gray-700 mt-2"
                  >
                   {vote.is_resolved ? "Đã giải ngân" : " Bỏ phiếu ngay"}
                  </Button>
                    {
                      
                    wallet.account == vote.creator &&
                      <Button
                        size="sm"
                        variant="outline"
                        disabled = {vote.is_resolved}
                        onClick={() => handleCloseAndResolution(vote.id)}
                        className="text-xs mx-3 bg-red-500 text-white border-gray-500 hover:bg-gray-700 mt-2"
                      >
                        Giải ngân
                      </Button>
                    
                  }
                 
                </div>
              </div>
            ))}


          </div>
        </motion.div>
        <motion.div className="border-t border-gray-700 pt-6 mt-10">
          <h2 className="text-xl font-semibold mb-4">Quy trình xử lý tranh chấp</h2>
          <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1">
            <li>Freelancer hoặc client mở tranh chấp</li>
            <li>DAO tạo phiên bỏ phiếu</li>
            <li>Thành viên DAO bỏ phiếu trong 24h</li>
            <li>Hệ thống quyết định kết quả</li>
            <li>Ghi nhận kết quả on-chain</li>
          </ol>
        </motion.div>
      </motion.div>

      <Footer />
    </div>
  );
}
