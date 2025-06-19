import { useState, useEffect } from 'react';
import Navbar from '@/components/ui2/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  participantId: string;
  lastMessagePreview: string;
  unread: number;
  lastMessageTime: string;
}

const Messages = () => {
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      participantId: 'client1',
      lastMessagePreview: 'Công ty chúng tôi đang tìm kiếm nhà phát triển hợp đồng thông minh.',
      unread: 2,
      lastMessageTime: '2 giờ trước',
    },
    {
      id: '2',
      participantId: 'client2',
      lastMessagePreview: 'Cảm ơn đã chấp nhận đề xuất! Khi nào chúng ta có thể gọi điện?',
      unread: 0,
      lastMessageTime: '1 ngày trước',
    },
    {
      id: '3',
      participantId: 'client3',
      lastMessagePreview: 'Đã nhận đề xuất. Chúng ta có thể thương lượng thêm về thời gian không?',
      unread: 1,
      lastMessageTime: '3 ngày trước',
    }
  ]);

  const [messages, setMessages] = useState<{ [key: string]: Message[] }>(
    {
    '1': [
      {
        id: '1-1',
          senderId: 'client1',
        receiverId: 'me',
          content: 'Chào bạn! Công ty chúng tôi đang tìm kiếm một nhà phát triển hợp đồng thông minh cho dự án DeFi mới. Hồ sơ của bạn trông rất ấn tượng.',
          timestamp: '2023-05-24T10:30:00Z',
      },
      {
        id: '1-2',
          senderId: 'me',
          receiverId: 'client1',
          content: 'Cảm ơn! Tôi rất quan tâm đến các dự án DeFi. Yêu cầu cụ thể của dự án là gì?',
          timestamp: '2023-05-24T10:32:00Z',
        },
        {
          id: '1-3',
          senderId: 'client1',
        receiverId: 'me',
          content: 'Chúng tôi cần xây dựng một giao thức cho vay phi tập trung trên Aptos. Bạn có kinh nghiệm với các tiêu chuẩn Move và các giao thức như Lending/Borrowing không?',
          timestamp: '2023-05-24T10:35:00Z',
      }
    ],
    '2': [
      {
        id: '2-1',
          senderId: 'client2',
        receiverId: 'me',
          content: 'Chào bạn, chúng tôi đã xem xét ứng tuyển của bạn cho vị trí phát triển frontend.',
          timestamp: '2023-05-23T09:15:00Z',
      },
      {
        id: '2-2',
        senderId: 'me',
          receiverId: 'client2',
          content: "Chào bạn! Tôi có 3 năm kinh nghiệm với React và đã làm việc với Aptos SDK trong nhiều dự án. Tôi có thể chia sẻ các demo nếu cần.",
          timestamp: '2023-05-23T09:20:00Z',
      },
      {
        id: '2-3',
          senderId: 'client2',
        receiverId: 'me',
          content: 'Tuyệt vời! Chúng ta có thể sắp xếp một cuộc gọi trong tuần này để thảo luận sâu hơn không?',
          timestamp: '2023-05-23T09:25:00Z',
      }
    ],
    '3': [
      {
        id: '3-1',
          senderId: 'me',
          receiverId: 'client3',
          content: 'Tôi đã gửi đề xuất dự án cho vị trí quản lý cộng đồng. Bạn có thể xem xét và cho tôi phản hồi không?',
          timestamp: '2023-05-21T14:10:00Z',
        },
        {
          id: '3-2',
          senderId: 'client3',
        receiverId: 'me',
          content: 'Đã nhận được đề xuất của bạn. Về ngân sách, chúng tôi có thể thảo luận thêm không?',
          timestamp: '2023-05-21T14:15:00Z',
      }
    ]
    }
  );

  useEffect(() => {
    if (conversations.length > 0 && !activeConversation) {
      setActiveConversation(conversations[0].id);
    }
  }, [conversations, activeConversation]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeConversation) return;

    const newMessage: Message = {
      id: `${activeConversation}-${Date.now()}`,
      senderId: 'me',
      receiverId: conversations.find(c => c.id === activeConversation)?.participantId || '',
      content: messageInput,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => ({
      ...prev,
      [activeConversation]: [...(prev[activeConversation] || []), newMessage]
    }));

    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeConversation 
          ? { ...conv, lastMessagePreview: messageInput, lastMessageTime: 'Vừa xong', unread: 0 } 
          : conv
      )
    );

    setMessageInput('');
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    // Custom format to show just time if today, otherwise date
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('vi-VN'); // Vietnamese date format
    }
  };

  const getParticipant = (participantId: string) => {
    // Assuming mockClients needs to be updated to match client1, client2, client3
    const updatedMockClients = [
        { id: 'client1', name: 'Công ty A', avatar: '/img/client-a.png', lensHandle: '@congtyA' },
        { id: 'client2', name: 'Dự án Blockchain XYZ', avatar: '/img/client-b.png', lensHandle: '@duanXYZ' },
        { id: 'client3', name: 'Tổ chức Web3 Talent', avatar: '/img/client-c.png', lensHandle: '@web3talent' },
    ];
    return updatedMockClients.find(client => client.id === participantId) || null;
  };

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversation(conversationId);
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unread: 0 } 
          : conv
      )
    );
  };

  const activeParticipant = activeConversation 
    ? getParticipant(conversations.find(c => c.id === activeConversation)?.participantId || '')
    : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="py-10 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black min-h-[80vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 shadow-xl overflow-hidden">
            <div className="flex h-[600px]">
              {/* Sidebar - Conversations List */}
              <div className="w-1/3 border-r border-white/10 bg-black/40">
                <div className="overflow-y-auto h-full">
                  {conversations.map(conversation => {
                    const participant = getParticipant(conversation.participantId);
                    return (
                      <div 
                        key={conversation.id}
                        className={`flex p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-all duration-200 group ${
                          activeConversation === conversation.id ? 'bg-white/10 border-l-4 border-l-blue-500 shadow-sm' : 'hover:border-l-2 hover:border-l-blue-400/30'
                        }`}
                        onClick={() => handleConversationSelect(conversation.id)}
                      >
                        <Avatar className="h-12 w-12 mr-4 group-hover:ring-2 group-hover:ring-blue-400/20 transition-all duration-200">
                          <AvatarImage src={participant?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-700 text-white font-semibold">
                            {participant?.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold truncate text-white group-hover:text-blue-400 transition-colors font-heading">
                              {participant?.name}
                            </h3>
                            <span className="text-xs text-gray-400 font-medium">
                              {conversation.lastMessageTime}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 truncate leading-relaxed font-primary">
                            {conversation.lastMessagePreview}
                          </p>
                        </div>
                        {conversation.unread > 0 && (
                          <Badge className="ml-2 bg-blue-500 text-white border-none h-5 min-w-5 flex items-center justify-center text-xs px-2 animate-pulse-glow">
                            {conversation.unread}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col bg-black/30">
                {activeConversation && activeParticipant ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-white/10 flex items-center bg-gradient-to-r from-black/40 to-gray-900/30">
                      <Avatar className="h-10 w-10 mr-3 ring-2 ring-blue-500/20">
                        <AvatarImage src={activeParticipant?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-700 text-white font-semibold">
                          {activeParticipant?.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-heading font-semibold text-white">{activeParticipant?.name}</h3>
                        {activeParticipant?.lensHandle && (
                          <p className="text-xs text-blue-400 font-medium font-primary">{activeParticipant.lensHandle}</p>
                        )}
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900/30 to-black/10">
                      {messages[activeConversation]?.map(message => (
                        <div 
                          key={message.id}
                          className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-sm font-primary transition-all duration-200 ${
                              message.senderId === 'me' 
                                ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-none shadow-blue-500/20' 
                                : 'bg-white/10 border border-white/10 rounded-bl-none text-white/90'
                            }`}
                          >
                            <p className="leading-relaxed">{message.content}</p>
                            <div className={`text-xs mt-1 font-medium ${
                              message.senderId === 'me' ? 'text-white/70' : 'text-gray-400'
                            }`}>
                              {formatMessageTime(message.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Message Input */}
                    <div className="p-4 border-t border-white/10 bg-gray-900/50 flex items-center gap-3">
                        <Input
                        type="text"
                          placeholder="Nhập tin nhắn..."
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSendMessage();
                            }
                          }}
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20"
                        />
                        <Button 
                          onClick={handleSendMessage}
                        className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                        >
                          Gửi
                        </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <MessageCircle size={64} className="mb-4" />
                    <p className="text-lg font-medium">Chọn một cuộc trò chuyện để bắt đầu.</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Messages;
