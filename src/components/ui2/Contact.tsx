import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, MessageSquare, Send } from 'lucide-react';
import emailjs from 'emailjs-com';

const Contact = () => {
  const form = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current) return;

    setIsSubmitting(true);
    setStatusMessage('');

    const serviceID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const userID = import.meta.env.VITE_EMAILJS_USER_ID;

    if (!serviceID || !templateID || !userID) {
      setStatusMessage('Lỗi: Cấu hình EmailJS bị thiếu. Vui lòng kiểm tra lại biến môi trường.');
      setIsSubmitting(false);
      return;
    }

    emailjs.sendForm(serviceID, templateID, form.current, userID)
      .then((result) => {
          console.log('SUCCESS!', result.status, result.text);
          setStatusMessage('Cảm ơn bạn đã liên hệ! Bạn vui lòng check mail xác nhận nhé! Đã gửi!');
          setIsSubmitting(false);
          if (form.current) form.current.reset();
      }, (error) => {
          console.error('FAILED...', error);
          setStatusMessage('Gửi tin nhắn thất bại. Vui lòng thử lại sau.');
          setIsSubmitting(false);
      });
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: "easeOut" } 
    },
  };

  return (
    <div className="relative py-20 sm:py-32 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a0b4d]/10 to-[#1a052e]/10" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-sans">
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Kết nối với chúng tôi
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto font-sans">
            Chúng tôi luôn sẵn sàng lắng nghe. Hãy để lại lời nhắn và chúng tôi sẽ liên hệ lại với bạn sớm nhất có thể.
          </p>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl shadow-purple-900/10 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Form Section */}
            <div className="p-8 md:p-12">
              <form ref={form} onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="name"
                    placeholder="Tên của bạn"
                    required
                    className="w-full bg-white/5 border-2 border-transparent focus:border-blue-500/50 rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email của bạn"
                    required
                    className="w-full bg-white/5 border-2 border-transparent focus:border-blue-500/50 rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-5 text-gray-400 w-5 h-5" />
                  <textarea
                    name="message"
                    placeholder="Nội dung tin nhắn..."
                    required
                    rows={5}
                    className="w-full bg-white/5 border-2 border-transparent focus:border-blue-500/50 rounded-lg py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none transition-all resize-none"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base hover:from-blue-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <span>{isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}</span>
                  </button>
                </div>
                {statusMessage && <p className="text-center mt-4 text-sm text-white">{statusMessage}</p>}
              </form>
            </div>
            {/* Image Section */}
            <div className="hidden lg:block relative">
                <video 
                    src="/videos/feature-3.mp4"
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/10 to-transparent"></div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
