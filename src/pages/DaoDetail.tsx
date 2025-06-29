import Navbar from "@/components/ui2/Navbar";
import Footer from "@/components/ui2/Footer";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { FileText, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {toast} from "sonner";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";


type DisputeOnchain = {
  client_address: string;
  freelancer_address: string;
  winning_address: string;
  description: string;
  document_link: string;
  voting_deadline: string;
  is_resolved: boolean;
  job_index: string;
  milestone_index: string;
  creator: string;
  client_vote_wallets: string[];
  freelancer_vote_wallets: string[];
};

export default function DaoDetailPage() {
  const { id } = useParams();
  const [dispute, setDispute] = useState<DisputeOnchain | null>(null);

  const DAO_MODULE = {
    address: "0x89adff5f04a2fb054a9d4765f54bb87465c9b0212e8f19326e6df4c5150bbcaf",
    name: "dao_vote",
  };

  const aptos = new Aptos(
    new AptosConfig({
      network: Network.TESTNET,
      clientConfig: {
        API_KEY: "AG-LA7UZDTNF2T1Y6H1DFA6CNSGVRQSRUKSA",
      },
    })
  );
  

  async function handleVote(disputeId: number, candidateAddress: string) {
    try {
      const payload = {
        function: `${DAO_MODULE.address}::${DAO_MODULE.name}::vote`,
        type_arguments: [],
        arguments: [disputeId.toString(), candidateAddress],
      };

      const tx = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: payload.function,
        type_arguments: payload.type_arguments,
        arguments: payload.arguments,
      });

      await aptos.waitForTransaction({ transactionHash: tx.hash });
      toast.success("Bỏ phiếu thành công!");
    } catch (err) {
      console.error("Lỗi khi bỏ phiếu:", err);
      toast.error("Bỏ phiếu thất bại!");
    }
  }


  useEffect(() => {
    const fetchDispute = async () => {
      try {
        const [res] = await aptos.view({
          payload: {
            function: `${DAO_MODULE.address}::${DAO_MODULE.name}::get_dispute_full`,
            functionArguments: [id],
          },
        });

      
        if (
          res &&
          typeof res === "object" &&
          "client_vote_wallets" in res &&
          "freelancer_vote_wallets" in res
        ) {
          setDispute(res as DisputeOnchain);
        } else {
          console.warn("Dữ liệu trả về không đúng định dạng");
        }
      } catch (err) {
        console.error("Lỗi khi fetch tranh chấp:", err);
      }
    };

    if (id) fetchDispute();
  }, [id]);

  if (!dispute) {
    return (
      <div className="text-white bg-black min-h-screen flex items-center justify-center">
        <p>Đang tải thông tin tranh chấp...</p>
      </div>
    );
  }

  const deadline = dispute.voting_deadline
    ? new Date(Number(dispute.voting_deadline) * 1000).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : "Không rõ";

  return (
    <div className="w-full bg-black text-white min-h-screen">
      <Navbar />

      <div className=" mx-auto px-4 pb-10  space-y-8">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-center"
          >
            Chi tiết Tranh chấp DAO #{id}
          </motion.h1>

        
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 space-y-4">
            <h2 className="text-xl font-semibold">Thông tin chung</h2>
            <p className="text-sm text-gray-300 leading-relaxed">{dispute.description}</p>
            <div className="text-sm text-gray-400 space-y-1">
              <p><span className="font-semibold text-white">Người tạo:</span> {dispute.creator}</p>
              <p><span className="font-semibold text-white">Client:</span> {dispute.client_address}</p>
              <p><span className="font-semibold text-white">Freelancer:</span> {dispute.freelancer_address}</p>
              <p><span className="font-semibold text-white">Link tài liệu:</span>{" "}
              
                <a
                  href={dispute.document_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline inline-flex items-center gap-1"
                >
                  Xem ngay
                </a>
              </p>
              <p><span className="font-semibold text-white">Hạn chót bỏ phiếu:</span> {deadline}</p>
              <p><span className="font-semibold text-white">Trạng thái:</span> {dispute.is_resolved ? "Đã giải quyết" : "Đang xử lý"}</p>
            </div>
          </div>


          <div className="grid md:grid-cols-2 gap-6">
   
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Danh sách ví đã tham gia bỏ phiếu</h2>
              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <h3 className="text-white font-semibold mb-1">Số phiếu ủng hộ Poster:</h3>
                  
                    {dispute.client_vote_wallets?.length > 0 ? (
                      <span className="font-semibold">{dispute.client_vote_wallets.length}</span>
                    ) : (
                      <li className="italic text-gray-500">Chưa có</li>
                    )}
                 
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Số phiếu ủng hộ Freelancer:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {dispute.freelancer_vote_wallets?.length > 0 ? (
                      <span className="font-semibold">{dispute.freelancer_vote_wallets.length}</span>
                    ) : (
                      <li className="italic text-gray-500">Chưa có</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

         
            {!dispute.is_resolved && (
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold">Bỏ phiếu của bạn</h2>
                <p className="text-sm text-gray-400">Bạn đồng ý với poster hay freelancer?</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    className="bg-green-600"
                    onClick={() => handleVote(Number(id), dispute.client_address)}
                  >
                    Ủng hộ poster
                  </Button>

                  <Button
                    className="bg-red-600"
                    onClick={() => handleVote(Number(id), dispute.freelancer_address)}
                  >
                    Ủng hộ freelancer
                  </Button>

                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
}
