import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from '@/components/ui/sonner';

type WalletContextType = {
  account: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  accountType: 'aptos' | null;
  aptosNetwork: string | null;
};

const WalletContext = createContext<WalletContextType>({
  account: null,
  isConnecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  accountType: null,
  aptosNetwork: null,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [accountType, setAccountType] = useState<'aptos' | null>(null);
  const [aptosNetwork, setAptosNetwork] = useState<string | null>(null);

  useEffect(() => {
    // Check if user was previously connected
    const savedAccount = localStorage.getItem('walletAccount');
    if (savedAccount) {
      setAccount(savedAccount);
    }
    // Load saved wallet type and aptos network
    const savedType = localStorage.getItem('walletType');
    if (savedType === 'aptos') {
      setAccountType('aptos');
    }
    const savedNetwork = localStorage.getItem('aptosNetwork');
    if (savedNetwork) {
      setAptosNetwork(savedNetwork);
    }
  }, []);

  useEffect(() => {
    // Lắng nghe sự kiện chuyển mạng của Petra
    if (accountType === 'aptos' && window.aptos) {
      const handleNetworkChange = (network: string) => {
        setAptosNetwork(network);
        localStorage.setItem('aptosNetwork', network);
      };
      // Đăng ký sự kiện mạng (hỗ trợ both on và addEventListener)
      if (window.aptos.on) {
        window.aptos.on('networkChange', handleNetworkChange);
        window.aptos.on('networkChanged', handleNetworkChange);
      }
      if ((window.aptos as any).addEventListener) {
        (window.aptos as any).addEventListener('networkChange', handleNetworkChange);
        (window.aptos as any).addEventListener('networkChanged', handleNetworkChange);
      }
      window.aptos.network && window.aptos.network().then((network: string) => {
        setAptosNetwork(network);
        localStorage.setItem('aptosNetwork', network);
      });
      return () => {
        // Remove listeners
        if (window.aptos.removeListener) {
          window.aptos.removeListener('networkChange', handleNetworkChange);
          window.aptos.removeListener('networkChanged', handleNetworkChange);
        }
        if ((window.aptos as any).removeEventListener) {
          (window.aptos as any).removeEventListener('networkChange', handleNetworkChange);
          (window.aptos as any).removeEventListener('networkChanged', handleNetworkChange);
        }
      };
    }
  }, [accountType]);

  const connectWallet = async () => {
    setIsConnecting(true);
    if ('aptos' in window) {
      try {
        const wallet = (window as any).aptos;
        await wallet.connect();
        const acc = await wallet.account();
        const network = await wallet.network();
        setAccount(acc.address);
        setAccountType('aptos');
        setAptosNetwork(network);
        localStorage.setItem('walletAccount', acc.address);
        localStorage.setItem('walletType', 'aptos');
        localStorage.setItem('aptosNetwork', network);
        toast.success('Kết nối ví Aptos thành công!');
      } catch (error: any) {
        toast.error('Kết nối ví Aptos thất bại. Vui lòng thử lại.');
      } finally {
        setIsConnecting(false);
      }
    } else {
      toast.error('Vui lòng cài đặt ví Petra để kết nối.');
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (accountType === 'aptos' && 'aptos' in window) {
      try {
        const wallet = (window as any).aptos;
        await wallet.disconnect();
        toast.success('Đã ngắt kết nối ví Aptos');
      } catch (error) {
        toast.error('Lỗi khi ngắt kết nối ví');
      }
    }
    setAccount(null);
    setAccountType(null);
    setAptosNetwork(null);
    localStorage.removeItem('walletAccount');
    localStorage.removeItem('walletType');
    localStorage.removeItem('aptosNetwork');
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnecting,
        connectWallet,
        disconnectWallet,
        accountType,
        aptosNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Type declaration for window.aptos
declare global {
  interface Window {
    aptos?: {
      connect: () => Promise<any>;
      disconnect: () => Promise<void>;
      account: () => Promise<{ address: string; publicKey: string }>;
      network: () => Promise<string>;
      on?: (event: string, callback: (network: string) => void) => void;
      removeListener?: (event: string, callback: (network: string) => void) => void;
      addEventListener?: (event: string, callback: (network: string) => void) => void;
      removeEventListener?: (event: string, callback: (network: string) => void) => void;
      signAndSubmitTransaction: (transaction: {
        type: string;
        function: string;
        type_arguments: any[];
        arguments: any[];
      }) => Promise<{ hash: string }>;
    };
  }
}
