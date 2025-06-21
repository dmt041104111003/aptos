import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  text: string;
  user: 'You' | 'AI';
}

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (
          prompt: string,
          options?: { model?: string }
        ) => Promise<string>;
      };
    };
  }
}

const Chatbox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([
          { text: 'Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp gì cho bạn?', user: 'AI' }
        ]);
        setIsTyping(false);
      }, 1000);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage: Message = { text: input, user: 'You' };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    if (window.puter) {
      try {
        const response = await window.puter.ai.chat(currentInput, { model: "gpt-4o-mini" });
        const aiMessage: Message = { text: response, user: 'AI' };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error("AI chat error:", error);
        const errorMessage: Message = { text: "Xin lỗi, đã có lỗi xảy ra khi kết nối với AI.", user: 'AI' };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    } else {
      setTimeout(() => {
        const aiMessage: Message = { text: "Đây là phản hồi mô phỏng.", user: 'AI' };
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1200);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[100]">
        <Button 
          onClick={() => setIsOpen(!isOpen)} 
          className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 text-white shadow-2xl shadow-blue-500/30 flex items-center justify-center transition-transform duration-300 hover:scale-110"
        >
          <AnimatePresence>
            <motion.div
              key={isOpen ? 'x' : 'message'}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.3 }}
            >
              {isOpen ? <X size={30} /> : <MessageSquare size={30} />}
            </motion.div>
          </AnimatePresence>
        </Button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-5 z-[99]"
          >
            <Card className="w-96 h-[500px] flex flex-col bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-lg text-white border border-white/10 shadow-2xl shadow-blue-500/20 rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-white/10 bg-black/30">
                <CardTitle className="text-lg font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Trợ lý AI</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex items-end gap-2 ${msg.user === 'You' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`py-2 px-4 rounded-2xl max-w-[80%] transition-all duration-300 ${
                      msg.user === 'You' 
                        ? 'bg-blue-600/50 text-white rounded-br-none border border-blue-400/50' 
                        : 'bg-white/10 text-gray-200 rounded-bl-none border border-white/20'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="py-2 px-4 rounded-2xl max-w-xs bg-white/10 text-gray-400 rounded-bl-none border border-white/20">
                      <motion.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                      >
                        AI đang nhập...
                      </motion.div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              <div className="p-4 border-t border-white/10 bg-black/30 flex items-center gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isTyping) {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Hỏi AI bất cứ điều gì..."
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-full px-4"
                  disabled={isTyping}
                />
                <Button 
                  onClick={handleSendMessage} 
                  className="bg-gradient-to-br from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-full w-10 h-10 p-0 flex items-center justify-center" 
                  disabled={isTyping || !input.trim()}
                >
                  <Send size={18} />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbox; 