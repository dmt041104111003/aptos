import { FaDiscord, FaTwitter, FaLinkedin, FaGithub } from "react-icons/fa";

const socialLinks = [
  { href: "https://discord.com", icon: <FaDiscord /> },
  { href: "https://twitter.com", icon: <FaTwitter /> },
  { href: "https://linkedin.com", icon: <FaLinkedin /> },
  { href: "https://github.com", icon: <FaGithub /> },
];

const Footer = () => {
  return (
    <footer className="relative w-full bg-transparent py-32 overflow-hidden">
      {/* Đường cong nghệ thuật phủ lên nội dung */}
      <div className="absolute inset-0 left-0 right-0 w-full h-40 z-0 pointer-events-none select-none">
        <svg className="absolute left-0 top-0 w-full h-40" viewBox="0 0 1440 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradient-purple" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="gradient-pink" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <linearGradient id="fade-purple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fade-pink" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fade-blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.13" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
            <filter id="blur" x="-50" y="0" width="1540" height="160" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
          {/* Fill nhòe cho từng đường cong */}
          <path
            d="M-100,80 Q360,0 720,80 T1540,80 V160 H-100 Z"
            fill="url(#fade-purple)"
            filter="url(#blur)"
          />
          <path
            d="M-100,120 Q480,40 960,120 T1540,120 V160 H-100 Z"
            fill="url(#fade-pink)"
            filter="url(#blur)"
          />
          <path
            d="M-100,150 Q700,100 1200,150 T1540,150 V160 H-100 Z"
            fill="url(#fade-blue)"
            filter="url(#blur)"
          />
          {/* Đường viền gradient như cũ */}
          <path
            d="M-100,80 Q360,0 720,80 T1540,80"
            stroke="url(#gradient-purple)"
            strokeWidth="4"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M-100,120 Q480,40 960,120 T1540,120"
            stroke="url(#gradient-pink)"
            strokeWidth="2.5"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M-100,150 Q700,100 1200,150 T1540,150"
            stroke="url(#gradient-blue)"
            strokeWidth="2"
            fill="none"
            opacity="0.4"
          />
        </svg>
      </div>
      {/* Nội dung footer (z-10) */}
      <div className="relative z-10 w-full flex flex-col md:flex-row md:items-end md:justify-between gap-8 px-4 max-w-none">
        {/* Logo & Slogan */}
        <div className="flex-1 flex flex-col items-center md:items-start gap-2 pl-4 md:pl-12">
          <span className="text-2xl font-black text-white tracking-tight drop-shadow-lg font-primary">
            APT - UTC
          </span>
          <span className="text-sm font-primary max-w-xs text-center md:text-left text-blue-200">
            Kết nối – Hợp tác – Thành công. Nền tảng freelancer Web3 dành cho người Việt, đề cao uy tín, cộng đồng và phát triển bền vững.
          </span>
        </div>
        {/* Social Icons */}
        <div className="flex-1 flex items-center justify-center gap-4 mt-6 md:mt-0">
          {socialLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 border border-white/10 shadow-lg transition-all duration-300 hover:from-indigo-400 hover:to-fuchsia-400 hover:scale-105 hover:shadow-xl"
            >
              <span className="text-2xl text-indigo-200 group-hover:text-white transition-colors duration-300">
                {link.icon}
              </span>
            </a>
          ))}
        </div>
        {/* Copyright & Policy */}
        <div className="flex-1 flex flex-col items-center md:items-end gap-1 mt-6 md:mt-0 pr-4 md:pr-12">
          <span className="text-xs text-blue-200 font-primary">
            © 2025 APT - UTC. Mọi quyền được bảo lưu.
          </span>
          <a
            href="#privacy-policy"
            className="text-xs text-indigo-300 hover:underline font-primary"
          >
            Chính sách bảo mật
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;