import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { walletApi } from '@/lib/api';

interface WalletContextValue {
  hasTrustLine: boolean | null; // null = unknown/loading
  setHasTrustLine: (v: boolean) => void;
  fetchTrustLine: (token: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  hasTrustLine: null,
  setHasTrustLine: () => {},
  fetchTrustLine: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [hasTrustLine, setHasTrustLine] = useState<boolean | null>(null);

  const fetchTrustLine = useCallback(async (token: string) => {
    try {
      const b = await walletApi.balance(token);
      setHasTrustLine(b.hasTrustLine);
    } catch {}
  }, []);

  return (
    <WalletContext.Provider value={{ hasTrustLine, setHasTrustLine, fetchTrustLine }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
