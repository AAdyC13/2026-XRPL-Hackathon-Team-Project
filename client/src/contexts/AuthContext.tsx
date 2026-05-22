import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'node_owner' | 'admin';
  xrpAddress: string;
  gkcBalance: number;
  xrpBalance: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateBalance: (gkc: number, xrp: number) => void;
}

const MOCK_USER: AuthUser = {
  id: 'usr-001',
  username: 'gkc_researcher',
  email: 'demo@gkc.edu.tw',
  role: 'node_owner',
  xrpAddress: 'rN7n7otQDd6FczFgLdlqtyMVrn3Rqq5Q1',
  gkcBalance: 2847.52,
  xrpBalance: 128.50,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('gkc_token');
    const storedUser = localStorage.getItem('gkc_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('gkc_token');
        localStorage.removeItem('gkc_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    if (!email || !password) throw new Error('請填寫所有欄位');
    // TODO: 替換為真實 API 呼叫 — POST /api/v1/auth/login
    await new Promise((r) => setTimeout(r, 800));
    const mockToken = 'gkc_jwt_' + Date.now();
    setToken(mockToken);
    setUser(MOCK_USER);
    localStorage.setItem('gkc_token', mockToken);
    localStorage.setItem('gkc_user', JSON.stringify(MOCK_USER));
  };

  const register = async (username: string, email: string, password: string) => {
    if (!username || !email || !password) throw new Error('請填寫所有欄位');
    if (password.length < 8) throw new Error('密碼至少需要 8 個字元');
    // TODO: 替換為真實 API 呼叫 — POST /api/v1/auth/register
    await new Promise((r) => setTimeout(r, 1000));
    const newUser: AuthUser = { ...MOCK_USER, username, email };
    const mockToken = 'gkc_jwt_' + Date.now();
    setToken(mockToken);
    setUser(newUser);
    localStorage.setItem('gkc_token', mockToken);
    localStorage.setItem('gkc_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('gkc_token');
    localStorage.removeItem('gkc_user');
  };

  const updateBalance = (gkc: number, xrp: number) => {
    if (!user) return;
    const updated = { ...user, gkcBalance: gkc, xrpBalance: xrp };
    setUser(updated);
    localStorage.setItem('gkc_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout, updateBalance }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
