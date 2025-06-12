import { useState, useRef } from "react";
import { TiLocationArrow } from "react-icons/ti";
import AnimatedTitle from "./AnimatedTitle";
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

const Features = () => (
  <section className="bg-black pb-52">
    <div className="container mx-auto px-3 md:px-10">
      <div className="px-5 py-32 flex flex-col items-center justify-center relative">

        <div className="relative z-10 flex flex-col items-center justify-center">

          <AnimatedTitle
          title="Dành cho <br /> freelancer Việt <br /> trên Web3"
          containerClass="mt-5 pointer-events-none mix-blend-difference relative z-10 font-primary font-black text-center !leading-[1.1] md:px-10 gap-y-2"
        />
     
          <p className="mt-3 max-w-sm text-center font-primary text-violet-50">
              Nơi các freelancer Việt Nam hội tụ, kết nối và phát triển sự nghiệp trên nền tảng Web3 toàn cầu. Khám phá cơ hội, xây dựng thương hiệu cá nhân và chinh phục những dự án mới mỗi ngày.
          </p>
        </div>
      </div>

      <BentoTilt className="border-hsla relative mb-7 h-96 w-full overflow-hidden rounded-md md:h-[65vh]">
        <BentoCard
          src="videos/feature-1.mp4"
          title={
            <>Nền tảng Metagame</>
          }
          description="Ứng dụng metagame đa nền tảng giúp freelancer ghi nhận thành tích, xây dựng uy tín và nhận thưởng khi hoàn thành dự án Web3."
          isComingSoon
        />
      </BentoTilt>

      <div className="grid h-[135vh] w-full grid-cols-2 grid-rows-3 gap-7">
        <BentoTilt className="bento-tilt_1 row-span-1 md:col-span-1 md:row-span-2">
          <BentoCard
            src="videos/feature-2.mp4"
            title={
              <>NFT Freelancer</>
            }
            description="Bộ sưu tập NFT độc quyền cho freelancer – khẳng định thương hiệu cá nhân, mở rộng mạng lưới và nhận ưu đãi từ cộng đồng."
            isComingSoon
          />
        </BentoTilt>

        <BentoTilt className="bento-tilt_1 row-span-1 ms-32 md:col-span-1 md:ms-0">
          <BentoCard
            src="videos/feature-3.mp4"
            title={
              <>Mạng xã hội Web3</>
            }
            description="Mạng xã hội chuyên biệt cho freelancer Web3 – kết nối, chia sẻ kinh nghiệm, tìm kiếm đối tác và dự án chất lượng."
            isComingSoon
          />
        </BentoTilt>

        <BentoTilt className="bento-tilt_1 me-14 md:col-span-1 md:me-0">
          <BentoCard
            src="videos/feature-4.mp4"
            title={
              <>Trợ lý AI Freelancer</>
            }
            description="Trợ lý AI hỗ trợ freelancer quản lý công việc, tối ưu hóa thời gian và nâng cao hiệu suất khi làm việc từ xa."
            isComingSoon
          />
        </BentoTilt>

        <BentoTilt className="bento-tilt_2">
          <div className="flex size-full flex-col justify-between bg-violet-300 p-5">
            <h1 className="bento-title font-primary font-black uppercase text-5xl md:text-6xl max-w-64 ">
              N<b>h</b>ững t<b>í</b>nh n<b>ă</b>ng m<b>ớ</b>i.
            </h1>

            <TiLocationArrow className="m-5 scale-[5] self-end" />
          </div>
        </BentoTilt>

        <BentoTilt className="bento-tilt_2">
          <video
            src="videos/feature-5.mp4"
            loop
            muted
            autoPlay
            className="size-full object-cover object-center"
          />
        </BentoTilt>
      </div>
    </div>
  </section>
);

export default Features;
