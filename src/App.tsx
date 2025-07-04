import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/context/WalletContext";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import PostJob from "./pages/PostJob";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import { ProfileProvider } from './contexts/ProfileContext';
import ScrollToTop from "./components/ScrollToTop";
import Chatbox from './components/Chatbox';
import Profile from "./pages/Profile";
import DaoPage from "./pages/DAO";
import DaoDetailPage from "./pages/DaoDetail";
const queryClient = new QueryClient();

const App = () => (
  <ProfileProvider>
  <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/post-job" element={<PostJob />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile/:address" element={<Profile />} />
            <Route path="/daos" element={<DaoPage />} />
            <Route path="/dao/:id" element={<DaoDetailPage />} />


          </Routes>
          <Chatbox />
        </BrowserRouter>
      </TooltipProvider>
    </WalletProvider>
  </QueryClientProvider>
  </ProfileProvider>
);

export default App;
