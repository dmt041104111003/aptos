import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/ui2/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Search, Send } from 'lucide-react';
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
} from 'firebase/firestore';
import { useWallet } from '../context/WalletContext';
import { useProfile } from '../contexts/ProfileContext';
import { useLocation } from 'react-router-dom';
import { fetchProfileDetails, aptos } from '@/utils/aptosUtils';
import { toast } from '@/components/ui/sonner';

// --- Interfaces for Firestore data ---
interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

interface Conversation {
  id: string;
  participants: string[];
  createdAt?: any;
  lastMessage?: {
    text: string;
    timestamp: any;
    senderId: string;
  };
  // We will derive unread count on the client-side if needed
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
}

const MODULE_ADDRESS = "0xabec4e453af5c908c5d7f0b7b59931dd204e2bc5807de364629b4e32eb5fafea";
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

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
          });
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
      
      // Sort by last message timestamp
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
    });

    return () => unsubscribe();
  }, [currentUserId, location.state]);

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
          setParticipants(prev => ({ ...prev, [id]: { id, ...docSnap.data() } as UserProfile }));
        }
      }
    });
  }, [conversations, currentUserId]);


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
    await addDoc(messagesColRef, {
      senderId: currentUserId,
      text: messageInput,
      timestamp: serverTimestamp(),
    });

    // Update the last message in the conversation document
    const conversationRef = doc(db, 'conversations', activeConversationId);
    await setDoc(conversationRef, {
      lastMessage: {
        text: messageInput,
        timestamp: serverTimestamp(),
        senderId: currentUserId
      }
    }, { merge: true });

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
      // Step 1: Query events to verify if the user has a registered DID.
      const creationEvents = await aptos.event.getModuleEventsByEventType({
        eventType: `${MODULE_ADDRESS}::${PROFILE_MODULE_NAME}::ProfileCreatedV29`,
        options: { limit: 10000 } // Adjust limit as needed, consider pagination for large scale
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

      // Step 2: Fetch full profile details now that we know they exist.
      const targetProfileOnChain = await fetchProfileDetails(targetUserId);

      // This is a fallback, should not fail if event exists but good practice
      if (!targetProfileOnChain) {
        toast.error("Không thể lấy chi tiết hồ sơ dù người dùng đã đăng ký.");
        setIsFindingUser(false);
        return;
      }
      
      // Step 3: Add or update user info in our Firestore 'users' collection
      const userRef = doc(db, 'users', targetUserId);
      await setDoc(userRef, {
          name: targetProfileOnChain.name,
          avatar: targetProfileOnChain.profilePic || '',
      }, { merge: true });
      
      // Step 4: Check if conversation already exists
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
      
      // Step 5: Navigate to existing chat or create a new one
      if (existingConversationId) {
        setActiveConversationId(existingConversationId);
      } else {
        const newConversationData: Omit<Conversation, 'id'> = {
          participants: [currentUserId, targetUserId],
          createdAt: serverTimestamp(), // This will be converted by Firestore
        };

        const newConversationRef = await addDoc(conversationsRef, newConversationData);
        
        // Preemptively add the new conversation to the local state
        const tempNewConvo: Conversation = {
          id: newConversationRef.id,
          participants: newConversationData.participants,
          // We can leave lastMessage undefined for now
        };
        setConversations(prev => [tempNewConvo, ...prev]);
        setParticipants(prev => ({
          ...prev,
          [targetUserId]: {
            id: targetUserId,
            name: targetProfileOnChain.name,
            avatar: targetProfileOnChain.profilePic || '',
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
            <div className="flex h-[calc(100vh-200px)]">
              {/* Sidebar - Conversations List */}
              <div className="w-1/3 border-r border-white/10 bg-black/40 flex flex-col">
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

                    return (
                      <div 
                        key={conversation.id}
                        className={`flex p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-all duration-200 group ${
                          isActive ? 'bg-white/10 border-l-4 border-l-blue-500 shadow-sm' : 'hover:border-l-2 hover:border-l-blue-400/30'
                        }`}
                        onClick={() => setActiveConversationId(conversation.id)}
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
                              {formatMessageTime(conversation.lastMessage?.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 truncate leading-relaxed font-primary">
                            {lastMessageText || "Chưa có tin nhắn"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col bg-black/30">
                {activeConversationId && activeParticipant ? (
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
                        <p className="text-xs text-blue-400 font-medium font-primary">{activeParticipant?.id}</p>
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900/30 to-black/10">
                      {messages.map(message => {
                        const isOwnMessage = message.senderId === currentUserId;
                        return (
                          <div 
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-sm font-primary transition-all duration-200 ${
                                isOwnMessage 
                                  ? 'bg-blue-600/20 text-blue-400 border border-blue-400/30 rounded-br-none shadow-blue-500/20' 
                                  : 'bg-white/10 border border-white/10 rounded-bl-none text-white/90'
                              }`}
                            >
                              <p className="leading-relaxed">{message.text}</p>
                              <div className={`text-xs mt-1 text-right font-medium ${
                                isOwnMessage ? 'text-blue-400/70' : 'text-gray-400'
                              }`}>
                                {formatMessageTime(message.timestamp)}
                              </div>
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
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <MessageCircle size={64} className="mb-4" />
                    <p className="text-lg font-medium">Chọn một cuộc trò chuyện hoặc tạo một cuộc trò chuyện mới.</p>
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
