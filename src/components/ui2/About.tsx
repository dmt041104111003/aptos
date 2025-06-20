import { motion } from "framer-motion";
import { CheckCircle, Zap, Users } from "lucide-react";
import { useInView } from "react-intersection-observer";

const About = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const textVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  const videoVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
  };
  
  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };

  const listItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div ref={ref} className="py-20 sm:py-32 bg-black text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            variants={textVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            <h2 className="text-4xl md:text-5xl font-bold font-sans mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Về chúng tôi
              </span>
            </h2>
            <p className="text-lg text-gray-300 mb-8 font-sans leading-relaxed">
              Chúng tôi là cầu nối giữa các freelancer tài năng và các dự án Web3 tiên phong. Sứ mệnh của chúng tôi là xây dựng một nền kinh tế tự do, minh bạch và hiệu quả trên nền tảng blockchain.
            </p>
            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="space-y-6"
            >
              <motion.li variants={listItemVariants} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/10 border border-blue-400/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-white">Minh bạch & An toàn</h4>
                  <p className="text-gray-400">Mọi giao dịch và đánh giá đều được ghi lại trên blockchain, không thể thay đổi.</p>
                </div>
              </motion.li>
              <motion.li variants={listItemVariants} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/10 border border-blue-400/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-white">Nhanh chóng & Hiệu quả</h4>
                  <p className="text-gray-400">Hợp đồng thông minh tự động hóa thanh toán, giúp bạn tiết kiệm thời gian và chi phí.</p>
                </div>
              </motion.li>
              <motion.li variants={listItemVariants} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/10 border border-blue-400/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-white">Cộng đồng Toàn cầu</h4>
                  <p className="text-gray-400">Kết nối với mạng lưới các chuyên gia và công ty hàng đầu trong lĩnh vực Web3.</p>
                </div>
              </motion.li>
            </motion.ul>
          </motion.div>

          <motion.div
            variants={videoVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="relative w-full h-96 lg:h-[500px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-3xl blur-2xl animate-pulse" />
            <div className="absolute inset-0 p-2">
              <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
                <video
                  className="w-full h-full object-cover"
                  src="/videos/hero-2.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-black/30" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default About;
