import { useState, useEffect } from 'react';
import Navbar from '@/components/ui2/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockClients } from '@/data/mockData';
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
      participantId: '1',
      lastMessagePreview: 'Hi there! I saw your profile and would like to discuss the NFT marketplace project.',
      unread: 2,
      lastMessageTime: '2h ago',
    },
    {
      id: '2',
      participantId: '2',
      lastMessagePreview: 'Thanks for accepting! When can we schedule a call to discuss the details?',
      unread: 0,
      lastMessageTime: '1d ago',
    },
    {
      id: '3',
      participantId: '3',
      lastMessagePreview: 'Contract proposal received. Would you be open to negotiating the timeline?',
      unread: 1,
      lastMessageTime: '3d ago',
    }
  ]);

  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({
    '1': [
      {
        id: '1-1',
        senderId: '1',
        receiverId: 'me',
        content: 'Hi there! I saw your profile and would like to discuss the NFT marketplace project.',
        timestamp: '2023-04-24T10:30:00Z',
      },
      {
        id: '1-2',
        senderId: '1',
        receiverId: 'me',
        content: 'Do you have experience with ERC-721 and ERC-1155 standards?',
        timestamp: '2023-04-24T10:32:00Z',
      }
    ],
    '2': [
      {
        id: '2-1',
        senderId: '2',
        receiverId: 'me',
        content: 'Hello! Thanks for accepting my job proposal.',
        timestamp: '2023-04-23T09:15:00Z',
      },
      {
        id: '2-2',
        senderId: 'me',
        receiverId: '2',
        content: "No problem! I'm excited to work on this project.",
        timestamp: '2023-04-23T09:20:00Z',
      },
      {
        id: '2-3',
        senderId: '2',
        receiverId: 'me',
        content: 'Thanks for accepting! When can we schedule a call to discuss the details?',
        timestamp: '2023-04-23T09:25:00Z',
      }
    ],
    '3': [
      {
        id: '3-1',
        senderId: '3',
        receiverId: 'me',
        content: 'Contract proposal received. Would you be open to negotiating the timeline?',
        timestamp: '2023-04-21T14:10:00Z',
      }
    ]
  });

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
          ? { ...conv, lastMessagePreview: messageInput, lastMessageTime: 'Just now', unread: 0 } 
          : conv
      )
    );

    setMessageInput('');
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getParticipant = (participantId: string) => {
    return mockClients.find(client => client.id === participantId) || null;
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
                    <div className="p-4 border-t border-white/10 bg-black/40">
                      <div className="flex space-x-3">
                        <Input
                          placeholder="Nhập tin nhắn..."
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSendMessage();
                            }
                          }}
                          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12 rounded-xl focus:border-blue-500/50 focus:ring-blue-500/20 font-primary"
                        />
                        <Button 
                          onClick={handleSendMessage}
                          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold px-6 rounded-xl transition-all duration-300 font-primary"
                        >
                          Gửi
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-gray-900/30 to-black/10">
                    <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse-glow">
                      <MessageCircle className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-xl font-heading font-bold mb-3 text-blue-400">Tin nhắn của bạn</h3>
                    <p className="text-gray-400 leading-relaxed max-w-xs font-primary">
                      Chọn một cuộc trò chuyện để bắt đầu nhắn tin với khách hàng và đối tác
                    </p>
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
