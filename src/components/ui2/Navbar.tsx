import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/context/WalletContext';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Settings,
  LogOut,
  Briefcase,
  Users,
  Menu,
  X,
  Wallet,
  Home,
  MessageSquare,
  BarChart3,Vote
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';

const navigation = [
  { name: 'Trang chủ', href: '/', icon: Home },
  { name: 'Dự án', href: '/jobs', icon: Briefcase },
  { name: 'Đăng dự án', href: '/post-job', icon: Users },
  { name: 'Bảng điều khiển', href: '/dashboard', icon: BarChart3 },
  { name: 'Tin nhắn', href: '/messages', icon: MessageSquare },
  { name: 'DAO', href: '/daos', icon: Vote },
];

const Navbar = () => {
  const { account, connectWallet, disconnectWallet, accountType, aptosNetwork } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevAptosNetwork = useRef<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (accountType === 'aptos' && aptosNetwork && prevAptosNetwork.current && aptosNetwork !== prevAptosNetwork.current) {
      navigate('/');
      window.location.reload();
    }
    prevAptosNetwork.current = aptosNetwork;
  }, [aptosNetwork]);

  // Listen for unread messages
  useEffect(() => {
    if (!account) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', account)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let count = 0;
      querySnapshot.forEach((doc) => {
        const conversation = doc.data();
        const lastMessage = conversation.lastMessage;
        
        // Check if the last message is from someone else and recent (within last 24 hours)
        // AND the user hasn't viewed the messages page since the last message
        if (lastMessage && 
            lastMessage.senderId !== account && 
            lastMessage.timestamp) {
          const messageTime = lastMessage.timestamp.toDate();
          const now = new Date();
          const hoursDiff = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);
          
          // Check if user has viewed messages since this message was sent
          const lastViewed = localStorage.getItem(`messages_viewed_${account}`);
          const lastViewedTime = lastViewed ? new Date(lastViewed).getTime() : 0;
          const messageTimeMs = messageTime.getTime();
          
          // Consider messages from last 24 hours as "new" AND not viewed since
          if (hoursDiff <= 24 && messageTimeMs > lastViewedTime) {
            count++;
          }
        }
      });
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [account]);

  // Mark messages as read when visiting Messages page
  useEffect(() => {
    if (account && location.pathname === '/messages') {
      // Store the current time as last viewed time
      localStorage.setItem(`messages_viewed_${account}`, new Date().toISOString());
    }
  }, [account, location.pathname]);

  const handleLogout = () => {
    disconnectWallet();
    navigate('/');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const renderNavItem = (item: any) => {
    const isMessages = item.href === '/messages';
    
    return (
      <motion.div 
        key={item.name} 
        whileHover={{ scale: 1.05 }} 
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <Button
          variant={location.pathname === item.href ? 'default' : 'ghost'}
          onClick={() => navigate(item.href)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 font-sans ${
            location.pathname === item.href
              ? 'bg-blue-500 text-white shadow'
              : 'text-blue-200 hover:bg-blue-500/10 hover:text-white'
          }`}
        >
          <div className="relative">
            <item.icon className="w-4 h-4" />
            {isMessages && unreadCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold p-0 flex items-center justify-center border-2 border-gray-900"
                variant="destructive"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </div>
          <span>{item.name}</span>
        </Button>
      </motion.div>
    );
  };

  return (
    <motion.header 
      className={`sticky top-0 z-50 transition-all duration-300 font-sans
        bg-gradient-to-br from-gray-950/90 to-gray-900/80 border-b border-white/10 shadow-xl backdrop-blur
        group-hover:bg-gradient-to-br group-hover:from-[#4a0e69] group-hover:to-[#2e0050]
      `}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left side */}
          <motion.div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center group-hover:shadow-lg transition-shadow duration-300">
              <span className="text-white font-bold text-lg font-sans">AU</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors duration-200 font-sans">
                APT-UTC
              </span>
              <span className="text-xs text-white/50 -mt-0.5 font-sans">Aptos - UTC</span>
          </div>
          </motion.div>

          {/* Right side content */}
          <div className="flex items-center space-x-6">
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-2">
              {navigation.map(renderNavItem)}
            </nav>

            {/* Desktop User Menu */}
            <div className="hidden lg:flex items-center">
              {!account ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={connectWallet}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-full flex items-center space-x-2 transition-colors duration-200 font-sans"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Kết nối ví</span>
                  </Button>
                </motion.div>
              ) : (
                <div className="flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="ghost" 
                          className="relative h-10 w-10 rounded-full border-2 border-blue-200 hover:border-blue-400 transition-colors duration-200"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-semibold text-sm font-sans">
                              {account ? account.slice(2, 4).toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </motion.div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-3 bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl shadow-xl border border-white/10 font-sans" align="end">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-semibold font-sans">
                              {account ? account.slice(2, 4).toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm text-blue-200 font-sans">{formatAddress(account)}</div>
                            {accountType === 'aptos' ? (
                              <div className="text-xs text-blue-400 font-sans">Mạng: {aptosNetwork}</div>
                            ) : (
                              <div className="text-xs text-blue-400 font-sans">Connected</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <DropdownMenuItem 
                        onClick={() => navigate('/settings')} 
                        className="py-2 px-3 rounded-md hover:bg-blue-500/10 text-blue-200 hover:text-white cursor-pointer font-sans"
                      >
                        <Settings className="mr-3 h-4 w-4 text-gray-500" />
                        <span>Định danh</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => navigate('/profile/' + account)} 
                        className="py-2 px-3 rounded-md hover:bg-blue-500/10 text-blue-200 hover:text-white cursor-pointer font-sans"
                      >
                        <User className="mr-3 h-4 w-4 text-gray-500" />
                        <span>Hồ sơ cá nhân</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleLogout} 
                        className="py-2 px-3 rounded-md hover:bg-red-500/10 text-red-400 hover:text-white cursor-pointer font-sans"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        <span>Đăng xuất</span>
                      </DropdownMenuItem>
                      
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <motion.div 
            className="lg:hidden bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-t border-white/10 shadow-xl font-sans"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-4 pt-4 pb-6 space-y-2">
              {navigation.map((item) => {
                const isMessages = item.href === '/messages';
                
                return (
                  <Button
                    key={item.name}
                    variant={location.pathname === item.href ? 'default' : 'ghost'}
                    onClick={() => {
                      navigate(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full justify-start flex items-center space-x-3 px-4 py-2 rounded-xl text-sm font-medium font-sans relative ${
                      location.pathname === item.href
                        ? 'bg-blue-500 text-white shadow'
                        : 'text-blue-200 hover:bg-blue-500/10'
                    }`}
                  >
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                      {isMessages && unreadCount > 0 && (
                        <Badge 
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold p-0 flex items-center justify-center border-2 border-gray-900"
                          variant="destructive"
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                    </div>
                    <span>{item.name}</span>
                  </Button>
                );
              })}
              {!account ? (
                <Button 
                  onClick={() => {
                    connectWallet();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg flex items-center justify-center space-x-2 font-sans"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Kết nối ví</span>
                </Button>
              ) : (
                <div className="border-t border-gray-100 mt-4 pt-4">
                  <div className="flex items-center space-x-3 px-4 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-semibold font-sans">
                        {account ? account.slice(2, 4).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-blue-200 font-sans">{formatAddress(account)}</div>
                      {accountType === 'aptos' ? (
                        <div className="text-xs text-blue-400 font-sans">Mạng: {aptosNetwork}</div>
                      ) : (
                        <div className="text-xs text-blue-400 font-sans">Connected</div>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={() => {
                      navigate('/settings');
                      setIsMobileMenuOpen(false);
                    }}
                    variant="ghost"
                    className="w-full justify-start flex items-center space-x-3 px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-500/10 rounded-xl font-sans"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Định danh</span>
                  </Button>
                  <Button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    variant="ghost"
                    className="w-full justify-start flex items-center space-x-3 px-4 py-2 text-red-400 hover:text-white hover:bg-red-500/10 rounded-xl font-sans"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Đăng xuất</span>
                  </Button>
                </div>
              )}
          </div>
          </motion.div>
        )}
    </div>
    </motion.header>
  );
};

export default Navbar;