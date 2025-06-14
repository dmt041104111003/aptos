import React from 'react';
import Navbar from '@/components/ui2/Navbar';

const ReputationCalculation = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="py-16 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black min-h-[80vh]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Cách tính điểm danh tiếng</h1>
          <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 rounded-2xl p-8 shadow-xl">
            <p className="text-gray-300 mb-6">Điểm danh tiếng của bạn được tính toán dựa trên các hoạt động của bạn trên nền tảng, phản ánh mức độ đáng tin cậy và hiệu quả của bạn. Dưới đây là các yếu tố chính và cách chúng đóng góp vào điểm số:</p>

            <h2 className="text-xl font-semibold text-white mb-4">Yếu tố ảnh hưởng đến điểm số:</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li><span className="font-semibold text-blue-400">Hoàn thành dự án:</span> Mỗi dự án hoàn thành cộng <span className="font-bold text-green-400">+200 điểm</span>.</li>
              <li><span className="font-semibold text-blue-400">Hủy dự án (nếu là người đăng):</span> Mỗi dự án bị hủy trừ <span className="font-bold text-red-400">-100 điểm</span>.</li>
              <li><span className="font-semibold text-blue-400">Hoàn thành cột mốc:</span> Mỗi cột mốc hoàn thành cộng <span className="font-bold text-green-400">+50 điểm</span>.</li>
              <li><span className="font-semibold text-blue-400">Cột mốc bị từ chối:</span> Mỗi cột mốc bị từ chối trừ <span className="font-bold text-red-400">-30 điểm</span>.</li>
              <li><span className="font-semibold text-blue-400">Hoàn thành đúng hạn:</span> Mỗi lần hoàn thành đúng hạn cột mốc cộng <span className="font-bold text-green-400">+100 điểm</span>.</li>
              <li><span className="font-semibold text-blue-400">Tổng số tiền giao dịch:</span> Cứ mỗi 1,000,000 unit APT được giao dịch cộng <span className="font-bold text-green-400">+1 điểm</span>.</li>
              <li><span className="font-semibold text-blue-400">Dự án đã đăng:</span> Mỗi dự án bạn đăng cộng <span className="font-bold text-green-400">+50 điểm</span>.</li>
              <li><span className="font-semibold text-blue-400">Cột mốc được chấp nhận:</span> Mỗi cột mốc được chấp nhận cộng <span className="font-bold text-green-400">+20 điểm</span>.</li>
              <li><span className="font-semibold text-blue-400">Cột mốc bị từ chối bởi khách hàng:</span> Mỗi cột mốc bị từ chối bởi khách hàng trừ <span className="font-bold text-red-400">-20 điểm</span>.</li>
              <li><span className="font-semibold text-blue-400">Thời gian phản hồi trung bình:</span> Nếu thời gian phản hồi trung bình dưới 24 giờ, cộng <span className="font-bold text-green-400">+100 điểm</span>.</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mb-4">Cấp độ danh tiếng:</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><span className="font-bold text-blue-400">Cấp độ 1:</span> Điểm số {`< 500`}</li>
              <li><span className="font-bold text-blue-400">Cấp độ 2:</span> Điểm số {`>= 500`}</li>
              <li><span className="font-bold text-blue-400">Cấp độ 3:</span> Điểm số {`>= 1000`}</li>
              <li><span className="font-bold text-blue-400">Cấp độ 4:</span> Điểm số {`>= 1500`}</li>
              <li><span className="font-bold text-blue-400">Cấp độ 5:</span> Điểm số {`>= 2000`}</li>
            </ul>

            <p className="text-gray-400 mt-8 text-sm">Lưu ý: Các giá trị điểm có thể được điều chỉnh trong tương lai để tối ưu hóa hệ thống danh tiếng.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReputationCalculation; 