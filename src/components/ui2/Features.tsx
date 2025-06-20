import { useState, useRef } from "react";
import { TiLocationArrow } from "react-icons/ti";
import { motion } from "framer-motion";
import { Fingerprint, ShieldCheck, Star, Gavel, TrendingDown } from "lucide-react";

export const BentoTilt = ({ children, className = "" }) => {
  const [transformStyle, setTransformStyle] = useState("");
  const itemRef = useRef(null);

  const handleMouseMove = (event) => {
    if (!itemRef.current) return;

    const { left, top, width, height } =
      itemRef.current.getBoundingClientRect();

    const relativeX = (event.clientX - left) / width;
    const relativeY = (event.clientY - top) / height;

    const tiltX = (relativeY - 0.5) * 5;
    const tiltY = (relativeX - 0.5) * -5;

    const newTransform = `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(.95, .95, .95)`;
    setTransformStyle(newTransform);
  };

  const handleMouseLeave = () => {
    setTransformStyle("");
  };

  return (
    <div
      ref={itemRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transformStyle }}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({ src, title, description, isComingSoon }) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [hoverOpacity, setHoverOpacity] = useState(0);
  const hoverButtonRef = useRef(null);

  const handleMouseMove = (event) => {
    if (!hoverButtonRef.current) return;
    const rect = hoverButtonRef.current.getBoundingClientRect();

    setCursorPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setHoverOpacity(1);
  const handleMouseLeave = () => setHoverOpacity(0);

  return (
    <div className="relative size-full">
      <video
        src={src}
        loop
        muted
        autoPlay
        className="absolute left-0 top-0 size-full object-cover object-center"
      />
      <div className="relative z-10 flex size-full flex-col justify-between p-5 text-blue-50">
        <div>
          <h1 className="bento-title special-font">{title}</h1>
          {description && (
            <p className="mt-3 max-w-64 text-xs md:text-base">{description}</p>
          )}
        </div>

        
      </div>
    </div>
  );
};

const featuresData = [
  {
    icon: <Fingerprint className="w-8 h-8 text-blue-400" />,
    title: "Danh tính phi tập trung",
    description: "Xây dựng danh tiếng của bạn trên blockchain. Mọi thành tích và đánh giá đều được ghi lại minh bạch, không thể thay đổi.",
    video: "/videos/feature-1.mp4",
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-blue-400" />,
    title: "Hợp đồng thông minh ký quỹ",
    description: "Các khoản thanh toán được giữ an toàn trong hợp đồng thông minh và chỉ được giải ngân khi các cột mốc công việc được hoàn thành.",
    video: "/videos/feature-2.mp4",
  },
  {
    icon: <Star className="w-8 h-8 text-blue-400" />,
    title: "Hệ thống danh tiếng",
    description: "Hệ thống đánh giá và xếp hạng on-chain giúp bạn xây dựng uy tín và dễ dàng tìm kiếm các đối tác chất lượng.",
    video: "/videos/feature-3.mp4",
  },
  {
    icon: <Gavel className="w-8 h-8 text-blue-400" />,
    title: "Giải quyết tranh chấp phi tập trung",
    description: "Cơ chế giải quyết tranh chấp công bằng, minh bạch và phi tập trung, đảm bảo quyền lợi cho cả hai bên.",
    video: "/videos/feature-4.mp4",
  },
  {
    icon: <TrendingDown className="w-8 h-8 text-blue-400" />,
    title: "Phí giao dịch thấp",
    description: "Tận hưởng mức phí giao dịch cực thấp trên blockchain Aptos, tối ưu hóa lợi nhuận của bạn.",
    video: "/videos/feature-5.mp4",
  },
];

const Features = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="py-20 sm:py-32 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-transparent rounded-full blur-[100px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-sans">
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Tính năng nổi bật
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto font-sans">
            Khám phá những công nghệ đột phá giúp định hình lại tương lai của công việc tự do.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="flex flex-row flex-wrap justify-center gap-8"
        >
          {featuresData.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="basis-full md:basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-1.334rem)] group relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 overflow-hidden transition-all duration-300 hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-600/10"
            >
              <div className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute w-48 h-48 bg-blue-500 rounded-full -top-10 -left-10 blur-2xl"></div>
                <div className="absolute w-48 h-48 bg-purple-500 rounded-full -bottom-10 -right-10 blur-2xl"></div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-600/10 rounded-lg mb-6 border border-blue-400/20">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 font-sans">{feature.title}</h3>
                <p className="text-gray-400 font-sans leading-relaxed">{feature.description}</p>
              </div>
              
              <div className="mt-6 rounded-lg overflow-hidden">
                <video
                  className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500"
                  src={feature.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Features;
