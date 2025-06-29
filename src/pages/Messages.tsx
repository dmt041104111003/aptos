import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/ui2/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Search, Send, Copy, RefreshCw, MoreVertical, RotateCcw, ArrowLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { useWallet } from '../context/WalletContext';
import { useProfile } from '../contexts/ProfileContext';
import { useLocation } from 'react-router-dom';
import { fetchProfileDetails, aptos } from '@/utils/aptosUtils';
import { toast } from '@/components/ui/sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// --- Interfaces for Firestore data ---
interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: any;
}

interface Conversation {
  id: string;
  participants: string[];
  createdAt?: any;
  lastMessage?: {
    text: string;
    timestamp: any;
    senderId: string;
    status?: 'sent' | 'delivered' | 'read';
  };
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  status?: 'sent' | 'delivered' | 'read';
  recalled?: boolean;
  recallTime?: any;
  recalledBy?: string;
}

const MODULE_ADDRESS = "0x496087ca0e9e97ac4edb6e554ab6eca842cdaebd6648cb2ac8f057b3411e8d39";
const PROFILE_MODULE_NAME = "web3_profiles_v29";

const Messages = () => {
  const { account: currentUserId } = useWallet();
  const { profile: currentUserProfile } = useProfile();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [participants, setParticipants] = useState<{ [key: string]: UserProfile }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [newChatAddress, setNewChatAddress] = useState('');
  const [isFindingUser, setIsFindingUser] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isChatViewActive, setIsChatViewActive] = useState(false);

  // Recall dialog states
  const [recallDialogOpen, setRecallDialogOpen] = useState(false);
  const [messageToRecall, setMessageToRecall] = useState<Message | null>(null);
  const [isRecalling, setIsRecalling] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const handleConversationClick = (conversationId: string) => {
    setActiveConversationId(conversationId);
    // Use a simple check for mobile screen size
    if (window.innerWidth < 768) { // Tailwind's `md` breakpoint
      setIsChatViewActive(true);
    }
  };

  const handleCopy = (text: string, label: string = 'Địa chỉ') => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} đã được sao chép vào clipboard!`);
    }).catch(err => {
      toast.error('Không thể sao chép.');
      console.error('Could not copy text: ', err);
    });
  };

  const refreshConversations = () => {
    // This will trigger the useEffect that fetches conversations
    setIsLoading(true);
    // The existing useEffect will handle the refresh
  };

  const handleRecallMessage = (message: Message) => {
    setMessageToRecall(message);
    setRecallDialogOpen(true);
  };

  const confirmRecallMessage = async () => {
    if (!messageToRecall || !currentUserId || !activeConversationId) return;

    setIsRecalling(true);
    try {
      const messageRef = doc(db, 'conversations', activeConversationId, 'messages', messageToRecall.id);
      await updateDoc(messageRef, {
        recalled: true,
        recallTime: serverTimestamp(),
        recalledBy: currentUserId
      });

      toast.success('Đã thu hồi tin nhắn');
      setRecallDialogOpen(false);
      setMessageToRecall(null);
    } catch (error) {
      console.error('Error recalling message:', error);
      toast.error('Không thể thu hồi tin nhắn');
    } finally {
      setIsRecalling(false);
    }
  };

  // Update user's online status
  useEffect(() => {
    if (!currentUserId) return;

    const userRef = doc(db, 'users', currentUserId);
    
    // Set user as online
    const setOnline = () => {
      setDoc(userRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
      }, { merge: true });
    };

    // Set user as offline
    const setOffline = () => {
      setDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
      }, { merge: true });
    };

    // Set online when component mounts
    setOnline();

    // Set offline when user leaves
    const handleBeforeUnload = () => {
      setOffline();
    };

    // Set offline when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      setOffline();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUserId]);

  // Listen for online users
  useEffect(() => {
    if (!currentUserId) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('isOnline', '==', true));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const online = new Set<string>();
      querySnapshot.forEach((doc) => {
        if (doc.id !== currentUserId) {
          online.add(doc.id);
        }
      });
      setOnlineUsers(online);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ensure current user's profile is in Firestore
  useEffect(() => {
    if (currentUserId && currentUserProfile.name) {
      const userRef = doc(db, 'users', currentUserId);
      getDoc(userRef).then(docSnap => {
        if (!docSnap.exists()) {
          setDoc(userRef, {
            name: currentUserProfile.name,
            avatar: currentUserProfile.profilePic || '',
            isOnline: true,
            lastSeen: serverTimestamp(),
          });
        } else {
          // Update online status
          setDoc(userRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
          }, { merge: true });
        }
      });
    }
  }, [currentUserId, currentUserProfile]);

  // Fetch conversations for the current user
  useEffect(() => {
    if (!currentUserId) return;
    
    setIsLoading(true);
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const convos: Conversation[] = [];
      querySnapshot.forEach((doc) => {
        convos.push({ id: doc.id, ...doc.data() } as Conversation);
      });
      

      convos.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp?.toDate() || new Date(0);
        const timeB = b.lastMessage?.timestamp?.toDate() || new Date(0);
        return timeB.getTime() - timeA.getTime();
      });

      setConversations(convos);
      
      const conversationIdFromState = location.state?.conversationId;
      if (conversationIdFromState) {
        setActiveConversationId(conversationIdFromState);
      } else if (convos.length > 0 && !activeConversationId) {
        setActiveConversationId(convos[0].id);
      }

      setIsLoading(false);
      
      // Mark messages as read when user visits Messages page
      if (currentUserId) {
        localStorage.setItem(`messages_viewed_${currentUserId}`, new Date().toISOString());
      }
    });

    return () => unsubscribe();
  }, [currentUserId, location.state]);

  // Mark messages as read when user opens a conversation
  useEffect(() => {
    if (activeConversationId && currentUserId) {
      localStorage.setItem(`messages_viewed_${currentUserId}`, new Date().toISOString());
      
      // Mark all messages in this conversation as read
      const messagesRef = collection(db, 'conversations', activeConversationId, 'messages');
      const q = query(messagesRef, where('senderId', '!=', currentUserId));
      
      getDocs(q).then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          const messageData = doc.data();
          if (messageData.status !== 'read') {
            setDoc(doc.ref, { status: 'read' }, { merge: true });
          }
        });
      });
    }
  }, [activeConversationId, currentUserId]);

  // Fetch participants' profiles for all conversations
  useEffect(() => {
    const allParticipantIds = new Set(
      conversations.flatMap((c) => c.participants)
    );

    allParticipantIds.forEach(async (id) => {
      if (id !== currentUserId && !participants[id]) {
        const userRef = doc(db, 'users', id);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setParticipants(prev => ({ 
            ...prev, 
            [id]: { 
              id, 
              ...docSnap.data(),
              isOnline: onlineUsers.has(id)
            } as UserProfile 
          }));
        }
      }
    });
  }, [conversations, currentUserId, onlineUsers]);


  // Fetch messages for the active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    };

    const messagesQuery = query(
      collection(db, 'conversations', activeConversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeConversationId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversationId || !currentUserId) return;

    const messagesColRef = collection(db, 'conversations', activeConversationId, 'messages');
    const messageData = {
      senderId: currentUserId,
      text: messageInput,
      timestamp: serverTimestamp(),
      status: 'sent' as const,
    };

    const messageRef = await addDoc(messagesColRef, messageData);

    // Update the last message in the conversation document
    const conversationRef = doc(db, 'conversations', activeConversationId);
    await setDoc(conversationRef, {
      lastMessage: {
        text: messageInput,
        timestamp: serverTimestamp(),
        senderId: currentUserId,
        status: 'sent'
      }
    }, { merge: true });

    // Update message status to delivered after a short delay
    setTimeout(async () => {
      await setDoc(messageRef, { status: 'delivered' }, { merge: true });
    }, 1000);

    setMessageInput('');
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const formatRecallTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Thu hồi lúc ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `Thu hồi lúc ${date.toLocaleString('vi-VN')}`;
    }
  };

  const getMessageStatusText = (isOwnMessage: boolean, status?: 'sent' | 'delivered' | 'read') => {
    if (!isOwnMessage) return null;
    
    let statusText: string;
    switch (status) {
      case 'read':
        statusText = 'Đã xem';
        break;
      case 'delivered':
        statusText = 'Đã nhận';
        break;
      case 'sent':
        statusText = 'Đã gửi';
        break;
      default:
        return null; // Don't show anything if status is not one of the above
    }
    
    return (
      <span className="text-xs italic text-gray-500">
        {statusText}
      </span>
    );
  };

  const getOnlineStatus = (userId: string) => {
    return onlineUsers.has(userId);
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return '';
    const date = lastSeen.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };
  
  const getParticipantInfo = (conversation: Conversation): UserProfile | null => {
    if (!currentUserId) return null;
    const participantId = conversation.participants.find(p => p !== currentUserId);
    return participantId ? participants[participantId] : null;
  }
  
  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)
    : null;
    
  const activeParticipant = activeConversation
    ? getParticipantInfo(activeConversation)
    : null;

  const handleCreateChat = async () => {
    if (!newChatAddress.trim() || !currentUserId) {
      toast.error("Vui lòng nhập địa chỉ ví hợp lệ.");
      return;
    }

    const targetUserId = newChatAddress.trim();

    if (targetUserId.toLowerCase() === currentUserId.toLowerCase()) {
      toast.error("Bạn không thể tự trò chuyện với chính mình.");
      return;
    }

    setIsFindingUser(true);
    try {
      const creationEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${MODULE_ADDRESS}::${PROFILE_MODULE_NAME}::ProfileCreatedV29`,
        options: { limit: 10000 } 
      });

      const userHasRegistered = creationEvents.some(
        (event) => (event.data as any).user?.toLowerCase() === targetUserId.toLowerCase()
      );
      
      if (!userHasRegistered) {
        toast.error("Người dùng này chưa đăng ký hồ sơ (DID) và không thể nhận tin nhắn.");
        setIsFindingUser(false);
        return;
      }
      
      toast.success("Đã xác minh DID của người dùng! Đang lấy thông tin chi tiết...");

      const targetProfileOnChain = await fetchProfileDetails(targetUserId);

      if (!targetProfileOnChain) {
        toast.error("Không thể lấy chi tiết hồ sơ dù người dùng đã đăng ký.");
        setIsFindingUser(false);
        return;
      }
      
      const userRef = doc(db, 'users', targetUserId);
      await setDoc(userRef, {
          name: targetProfileOnChain.name,
          avatar: targetProfileOnChain.profilePic || '',
          isOnline: false,
          lastSeen: serverTimestamp(),
      }, { merge: true });
      
      const conversationsRef = collection(db, 'conversations');
      const q = query(conversationsRef, where('participants', 'array-contains', currentUserId));
      
      const querySnapshot = await getDocs(q);
      let existingConversationId: string | null = null;

      if (!querySnapshot.empty) {
        querySnapshot.forEach(doc => {
            const conversation = doc.data();
            if (conversation.participants.includes(targetUserId)) {
                existingConversationId = doc.id;
            }
        });
      }
      
      if (existingConversationId) {
        setActiveConversationId(existingConversationId);
      } else {
        const newConversationData: Omit<Conversation, 'id'> = {
          participants: [currentUserId, targetUserId],
          createdAt: serverTimestamp(), 
        };

        const newConversationRef = await addDoc(conversationsRef, newConversationData);
        
        const tempNewConvo: Conversation = {
          id: newConversationRef.id,
          participants: newConversationData.participants,
        };
        setConversations(prev => [tempNewConvo, ...prev]);
        setParticipants(prev => ({
          ...prev,
          [targetUserId]: {
            id: targetUserId,
            name: targetProfileOnChain.name,
            avatar: targetProfileOnChain.profilePic || '',
            isOnline: false,
          }
        }))
        
        setActiveConversationId(newConversationRef.id);
      }
      setNewChatAddress('');

    } catch (error: any) {
      console.error("Error creating chat:", error);
      toast.error(`Đã xảy ra lỗi khi xác minh DID: ${error.message}`);
    } finally {
      setIsFindingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="py-10 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black min-h-[80vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-white/10 shadow-xl overflow-hidden">
            <div className="flex flex-col md:flex-row h-[calc(100vh-200px)]">
              {/* Sidebar - Conversations List */}
              <div className={`
                ${isChatViewActive && activeConversationId ? 'hidden md:flex' : 'flex'}
                w-full md:w-1/3 border-r border-white/10 bg-black/40 flex-col transition-all duration-300
              `}>
                {/* Search / New Chat */}
                <div className="p-4 border-b border-white/10">
                   <div className="flex items-center gap-2">
                     <Input
                        type="text"
                        placeholder="Nhập địa chỉ ví để chat..."
                        value={newChatAddress}
                        onChange={(e) => setNewChatAddress(e.target.value)}
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50"
                        disabled={isFindingUser}
                     />
                     <Button 
                        size="icon"
                        onClick={handleCreateChat}
                        disabled={isFindingUser || !newChatAddress}
                        className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                      >
                       {isFindingUser ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Search size={18} />}
                     </Button>
                     <Button
                        size="icon"
                        variant="outline"
                        onClick={refreshConversations}
                        disabled={isLoading}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        aria-label="Tải lại danh sách cuộc trò chuyện"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </Button>
                   </div>
                </div>
                {/* Conversation List */}
                <div className="overflow-y-auto h-full">
                  {isLoading ? <div className="p-4 text-center text-gray-400">Đang tải cuộc trò chuyện...</div> : 
                  conversations.map(conversation => {
                    const participant = getParticipantInfo(conversation);
                    if (!participant) return null; // Or a placeholder
                    const isActive = activeConversationId === conversation.id;
                    const lastMessageText = conversation.lastMessage?.senderId === currentUserId ? `Bạn: ${conversation.lastMessage.text}` : conversation.lastMessage?.text;
                    const isOnline = getOnlineStatus(participant.id);

                    return (
                      <div 
                        key={conversation.id}
                        className={`flex p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-all duration-200 group ${
                          isActive ? 'bg-white/10 border-l-4 border-l-blue-500 shadow-sm' : 'hover:border-l-2 hover:border-l-blue-400/30'
                        }`}
                        onClick={() => handleConversationClick(conversation.id)}
                      >
                        <div className="relative">
                          <Avatar className={`h-12 w-12 mr-4 group-hover:ring-2 group-hover:ring-blue-400/20 transition-all duration-200 ${
                            isOnline ? 'ring-2 ring-green-500' : 'ring-2 ring-gray-500'
                          }`}>
                            <AvatarImage src={participant?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-700 text-white font-semibold">
                              {participant?.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold truncate text-white group-hover:text-blue-400 transition-colors font-heading">
                              {participant?.name}
                            </h3>
                            <span className="text-xs text-gray-400 font-medium">
                              {formatMessageTime(conversation.lastMessage?.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 truncate leading-relaxed font-primary">
                            {lastMessageText || "Chưa có tin nhắn"}
                          </p>
                          {/* Online status text */}
                          <p className="text-xs text-gray-500">
                            {isOnline ? 'Đang hoạt động' : participant?.lastSeen ? `Hoạt động ${formatLastSeen(participant.lastSeen)}` : 'Không hoạt động'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Main Chat Area */}
              <div className={`
                ${!isChatViewActive || !activeConversationId ? 'hidden md:flex' : 'flex'}
                flex-1 flex-col bg-black/30 transition-all duration-300
              `}>
                {activeConversationId && activeParticipant ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-white/10 flex items-center bg-gradient-to-r from-black/40 to-gray-900/30">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden mr-2"
                        onClick={() => setIsChatViewActive(false)}
                      >
                        <ArrowLeft size={20} />
                      </Button>
                      <div className="relative">
                        <Avatar className={`h-10 w-10 mr-3 ring-2 ring-blue-500/20 ${
                          getOnlineStatus(activeParticipant.id) ? 'ring-2 ring-green-500' : 'ring-2 ring-gray-500'
                        }`}>
                          <AvatarImage src={activeParticipant?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-700 text-white font-semibold">
                            {activeParticipant?.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading font-semibold text-white">{activeParticipant?.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-blue-400 font-medium font-primary">{activeParticipant?.id}</p>
                          <Copy size={12} className="cursor-pointer hover:text-white" onClick={() => handleCopy(activeParticipant?.id, 'Địa chỉ ví')} />
                        </div>
                        {/* Online status */}
                        <p className="text-xs text-gray-400">
                          {getOnlineStatus(activeParticipant.id) ? 'Đang hoạt động' : activeParticipant?.lastSeen ? `Hoạt động ${formatLastSeen(activeParticipant.lastSeen)}` : 'Không hoạt động'}
                        </p>
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900/30 to-black/10">
                      {messages.map(message => {
                        const isOwnMessage = message.senderId === currentUserId;
                        const canRecall = isOwnMessage && !message.recalled;
                        
                        return (
                        <div 
                          key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-sm font-primary transition-all duration-200 relative group ${
                                isOwnMessage 
                                  ? 'bg-blue-600/20 text-blue-400 border border-blue-400/30 rounded-br-none shadow-blue-500/20' 
                                : 'bg-white/10 border border-white/10 rounded-bl-none text-white/90'
                            }`}
                          >
                              {message.recalled ? (
                                <div className="text-gray-500 italic">
                                  <div className="flex items-center gap-2 mb-1">
                                    <RotateCcw size={14} />
                                    <span className="text-xs">Tin nhắn đã được thu hồi</span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {formatRecallTime(message.recallTime)}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="leading-relaxed">{message.text}</p>
                                  <div className={`flex items-center justify-end gap-2 mt-1 ${
                                    isOwnMessage ? 'text-blue-400/70' : 'text-gray-400'
                                  }`}>
                                    <span className="text-xs font-medium">
                                  {formatMessageTime(message.timestamp)}
                                    </span>
                                    {getMessageStatusText(isOwnMessage, message.status as any)}
                                  </div>
                                </>
                              )}
                              
                              {/* Recall button for own messages */}
                              {canRecall && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-full w-6 h-6"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical size={12} />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-gray-800 border border-white/10">
                                    <DropdownMenuItem
                                      onClick={() => handleRecallMessage(message)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 cursor-pointer"
                                    >
                                      <RotateCcw size={14} className="mr-2" />
                                      Thu hồi tin nhắn
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
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
                          className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-400/30"
                        >
                          <Send size={18} />
                        </Button>
                    </div>
                  </>
                ) : (
                  <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-400">
                    <MessageCircle size={64} className="mb-4" />
                    <p className="text-lg font-medium">Chọn một cuộc trò chuyện hoặc tạo một cuộc trò chuyện mới.</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Recall Confirmation Dialog */}
      <Dialog open={recallDialogOpen} onOpenChange={setRecallDialogOpen}>
        <DialogContent className="bg-gray-900 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Thu hồi tin nhắn
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Bạn có chắc chắn muốn thu hồi tin nhắn này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {messageToRecall && (
              <div className="p-4 bg-gray-800/50 rounded-lg border border-white/10">
                <h4 className="font-medium text-white mb-2">Tin nhắn sẽ bị thu hồi:</h4>
                <p className="text-gray-300 text-sm">{messageToRecall.text}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Gửi lúc: {formatMessageTime(messageToRecall.timestamp)}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={confirmRecallMessage}
                disabled={isRecalling}
                className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-400/30"
              >
                {isRecalling ? 'Đang thu hồi...' : 'Thu hồi tin nhắn'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setRecallDialogOpen(false)}
                disabled={isRecalling}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Hủy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;
