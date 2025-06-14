import { useState, useEffect } from 'react';
import Navbar from '@/components/ui2/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { useWallet } from '../context/WalletContext'; // Import useWallet
import { aptos } from '../utils/aptosUtils'; // Import aptos client
import { toast } from '@/components/ui/sonner'; // Import toast for notifications

// Hardcode the message contract address and module name
const MESSAGE_CONTRACT_ADDRESS = "0x3afc92d246a6d03ac951dc01dbe9257a150d09804b6ebc20a7bf2aaedb4d36eb";
const MESSAGE_MODULE_NAME = "web3_messaging_v1";

interface Message {
  id: string;
  senderId: string; // Aptos address
  receiverId: string; // Aptos address
  content: string;
  timestamp: string; // ISO string
}

interface Conversation {
  id: string; // Formed by sorting and concatenating two participant addresses
  participantId: string; // The other participant's address
  lastMessagePreview: string;
  unread: number;
  lastMessageTime: string; // Relative time or formatted date
}

// Mock client data (we'll enhance this later with profile fetching)
const mockClients = [
    { id: '0x1', name: 'Công ty A', avatar: '/img/client-a.png', lensHandle: '@congtyA' }, // Placeholder client IDs
    { id: '0x2', name: 'Dự án Blockchain XYZ', avatar: '/img/client-b.png', lensHandle: '@duanXYZ' },
    { id: '0x3', name: 'Tổ chức Web3 Talent', avatar: '/img/client-c.png', lensHandle: '@web3talent' },
];

const Messages = () => {
  const { account, accountType } = useWallet(); // Get current user's account
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newChatAddress, setNewChatAddress] = useState(''); // New state for new chat input

  // Function to generate a consistent conversation ID
  const getConversationId = (addr1: string, addr2: string): string => {
    const addresses = [addr1.toLowerCase(), addr2.toLowerCase()].sort();
    return `conv_${addresses[0]}_${addresses[1]}`;
  };

  // Function to fetch and process all message events
  const fetchMessagesAndConversations = async () => {
    if (!account) return;
    setLoadingConversations(true);
    setError(null);

    try {
      const allMessageEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${MESSAGE_CONTRACT_ADDRESS}::${MESSAGE_MODULE_NAME}::MessageSentEvent`,
        options: {
          limit: 1000, // Fetch a large number of events to cover history
        }
      });

      const newConversationsMap = new Map<string, Conversation>();
      const newMessagesMap: { [key: string]: Message[] } = {};
      const currentAddress = account.toLowerCase();

      for (const event of allMessageEvents.reverse()) { // Process from newest to oldest
        const { sender, receiver, content, timestamp } = event.data;
        const senderId = sender.toLowerCase();
        const receiverId = receiver.toLowerCase();
        const msgTimestamp = new Date(Number(timestamp) * 1000).toISOString();

        let participantId = '';
        if (senderId === currentAddress) {
          participantId = receiverId;
        } else if (receiverId === currentAddress) {
          participantId = senderId;
        } else {
          continue; // Skip messages not involving current user
        }

        const conversationId = getConversationId(currentAddress, participantId);

        const message: Message = {
          id: event.sequence_number.toString(), // Use sequence number as unique ID for simplicity
          senderId,
          receiverId,
          content,
          timestamp: msgTimestamp,
        };

        if (!newMessagesMap[conversationId]) {
          newMessagesMap[conversationId] = [];
        }
        newMessagesMap[conversationId].unshift(message); // Add to the beginning to maintain chronological order after reverse

        // Update conversation preview and time (only if it's the latest message in this conversation)
        if (!newConversationsMap.has(conversationId)) {
            newConversationsMap.set(conversationId, {
                id: conversationId,
                participantId,
                lastMessagePreview: content,
                unread: 0, // We don't have unread status from chain, assume 0 initially
                lastMessageTime: formatMessageTime(msgTimestamp),
            });
        } else {
            const existingConv = newConversationsMap.get(conversationId)!;
            // Only update if the current event is newer than the one already stored as lastMessage
            if (new Date(msgTimestamp) > new Date(existingConv.lastMessageTime)) {
                newConversationsMap.set(conversationId, {
                    ...existingConv,
                    lastMessagePreview: content,
                    lastMessageTime: formatMessageTime(msgTimestamp),
                });
            }
        }
      }

      setConversations(Array.from(newConversationsMap.values()));
      setMessages(newMessagesMap);

      // Set active conversation if not already set
      if (!activeConversation && newConversationsMap.size > 0) {
        setActiveConversation(Array.from(newConversationsMap.keys())[0]);
      }

    } catch (err: any) {
      console.error("Error fetching messages:", err);
      setError(`Không thể tải tin nhắn: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchMessagesAndConversations();
  }, [account]); // Refetch when account changes

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation || !account || !accountType || !window.aptos) {
      toast.error('Vui lòng kết nối ví và chọn cuộc trò chuyện để gửi tin nhắn.');
      return;
    }

    setLoadingMessages(true);

    const currentParticipantId = conversations.find(c => c.id === activeConversation)?.participantId;
    if (!currentParticipantId) {
        toast.error('Không tìm thấy người nhận cho cuộc trò chuyện này.');
        setLoadingMessages(false);
        return;
    }

    try {
      const transaction = await window.aptos.signAndSubmitTransaction({
        type: "entry_function_payload",
        function: `${MESSAGE_CONTRACT_ADDRESS}::${MESSAGE_MODULE_NAME}::send_message`,
        type_arguments: [],
        arguments: [
          currentParticipantId, // receiver_address
          messageInput, // content
          activeConversation, // conversation_id
        ]
      });

      await aptos.waitForTransaction({ transactionHash: transaction.hash });
      toast.success('Tin nhắn đã được gửi thành công!');
      setMessageInput('');
      fetchMessagesAndConversations(); // Re-fetch all messages to update the view
    } catch (error: any) {
      console.error('Gửi tin nhắn thất bại:', error);
      toast.error(`Gửi tin nhắn thất bại: ${error.message || 'Đã xảy ra lỗi không xác định.'}`);
    } finally {
      setLoadingMessages(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const getParticipant = (participantId: string) => {
    // In a real app, this would fetch profile data for the participantId
    // For now, use mockClients and extend if needed for new participant IDs
    const found = mockClients.find(client => client.id === participantId);
    if (found) return found;

    // If participant is not in mockClients, create a placeholder
    return { id: participantId, name: `Người dùng ${participantId.slice(0, 6)}...`, avatar: '', lensHandle: '' };
  };

  const handleNewChat = () => {
    if (!newChatAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ ví để bắt đầu cuộc trò chuyện mới.');
      return;
    }
    if (!account) {
      toast.error('Vui lòng kết nối ví của bạn.');
      return;
    }

    const targetAddress = newChatAddress.trim().toLowerCase();
    const currentAddress = account.toLowerCase();

    // Prevent chatting with self (optional, but good practice)
    if (targetAddress === currentAddress) {
        toast.error('Bạn không thể tự chat với chính mình.');
        return;
    }

    const conversationId = getConversationId(currentAddress, targetAddress);

    // Check if conversation already exists
    const existingConversation = conversations.find(conv => conv.id === conversationId);

    if (existingConversation) {
      setActiveConversation(conversationId);
      toast.info(`Đã mở cuộc trò chuyện với ${targetAddress.slice(0, 6)}...`);
    } else {
      // Create a new placeholder conversation
      const newConv: Conversation = {
        id: conversationId,
        participantId: targetAddress,
        lastMessagePreview: 'Bắt đầu cuộc trò chuyện mới...',
        unread: 0,
        lastMessageTime: formatMessageTime(new Date().toISOString()), // Current time
      };

      setConversations(prev => [newConv, ...prev]); // Add to the top
      setActiveConversation(conversationId);
      toast.success(`Đã tạo cuộc trò chuyện mới với ${targetAddress.slice(0, 6)}...`);
    }
    setNewChatAddress(''); // Clear the input
  };

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversation(conversationId);
    // We don't track unread on-chain, so reset locally
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

  if (loadingConversations) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        <p className="ml-4">Đang tải tin nhắn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <Navbar />
        <div className="text-red-400 text-center mt-20 p-4">
          <p>{error}</p>
          <Button onClick={fetchMessagesAndConversations} className="mt-4">Thử lại</Button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <Navbar />
        <div className="text-gray-400 text-center mt-20 p-4">
          <p>Vui lòng kết nối ví Aptos để xem tin nhắn của bạn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="py-10 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black min-h-[80vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 shadow-xl overflow-hidden">
            <div className="flex h-[600px]">
              {/* Sidebar - Conversations List */}
              <div className="w-1/3 border-r border-white/10 bg-black/40">
                <div className="p-4 border-b border-white/10 flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Nhập địa chỉ ví Aptos..."
                    value={newChatAddress}
                    onChange={(e) => setNewChatAddress(e.target.value)}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20"
                  />
                  <Button
                    onClick={handleNewChat}
                    className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                  >
                    Mở Chat
                  </Button>
                  <Button
                    onClick={fetchMessagesAndConversations}
                    className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white p-2 w-10 h-10 flex items-center justify-center"
                    title="Làm mới tin nhắn"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-refresh-ccw"><path d="M21 12a9 9 0 0 0-9-9V3a10 10 0 0 1 10 10Z"/><path d="M3 12a9 9 0 0 0 9 9V21a10 10 0 0 1-10-10Z"/><path d="M8 17.924L5.1 14.85a2 2 0 0 1-.3-2.004L6.083 10"/><path d="M16 6.076L18.9 9.15a2 2 0 0 1 .3 2.004L17.917 14"/></svg>
                  </Button>
                </div>
                <div className="overflow-y-auto h-full">
                  {conversations.length === 0 ? (
                    <div className="p-4 text-gray-400 text-center">Chưa có cuộc trò chuyện nào.</div>
                  ) : (
                    <>
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
                          </div>
                        );
                      })}
                    </>
                  )}
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
                      {messages[activeConversation]?.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">Chưa có tin nhắn nào trong cuộc trò chuyện này.</div>
                      ) : (
                        messages[activeConversation]?.map(message => (
                          <div 
                            key={message.id}
                            className={`flex ${message.senderId === account?.toLowerCase() ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-sm font-primary transition-all duration-200 ${
                                message.senderId === account?.toLowerCase() 
                                  ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-none shadow-blue-500/20' 
                                  : 'bg-white/10 border border-white/10 rounded-bl-none text-white/90'
                              }`}
                            >
                              <p className="leading-relaxed break-words">{message.content}</p>
                              <div className={`text-xs mt-1 font-medium ${message.senderId === account?.toLowerCase() ? 'text-white/70' : 'text-gray-400'}`}>
                                {formatMessageTime(message.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
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
                        disabled={loadingMessages}
                        >
                          {loadingMessages ? 'Đang gửi...' : 'Gửi'}
                        </Button>
                    </div>
                  </>
                ) : ( // No active conversation selected
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <MessageCircle size={64} className="mb-4" />
                    <p className="text-lg font-medium">Chọn một cuộc trò chuyện để bắt đầu hoặc chờ tin nhắn mới.</p>
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