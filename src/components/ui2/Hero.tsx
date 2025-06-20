import { motion } from "framer-motion";
import Button from "./Button";
import { MoveRight } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Video */}
      <video
        src="/videos/hero-1.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      />
      {/* Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/60 bg-gradient-to-t from-black/80 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full text-center text-white px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 font-sans leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
              Tái định nghĩa
            </span>{" "}
            công việc <br /> Freelance trên{" "}
            <span className="text-white">Web3</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 font-sans">
            Nền tảng phi tập trung đầu tiên tại Việt Nam, kết nối các freelancer tài năng với những dự án toàn cầu. An toàn, minh bạch và hiệu quả.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/jobs">
                <Button
                title="Khám phá dự án"
                containerClass="w-full sm:w-auto"
                />
            </Link>
            <Link to="/post-job">
                <button className="group relative w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <span>Đăng dự án</span>
                <MoveRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
