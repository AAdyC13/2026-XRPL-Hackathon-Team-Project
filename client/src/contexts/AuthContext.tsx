import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../lib/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'node_owner' | 'provider' | 'admin';
  xrpAddress: string | null;
  gkcBalance: number;
  xrpBalance: number;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
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
  refreshUser: () => Promise<void>;
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
    if (storedToken) {
      // Re-validate token with backend on mount
      authApi.me(storedToken)
        .then(u => {
          setToken(storedToken);
          setUser({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role as AuthUser['role'],
            xrpAddress: u.xrpAddress ?? null,
            gkcBalance: u.gkcBalance ?? 0,
            xrpBalance: u.xrpBalance ?? 0,
          });
        })
        .catch(() => {
          localStorage.removeItem('gkc_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    if (!email || !password) throw new Error('請填寫所有欄位');
    const res = await authApi.login(email, password);
    const authUser: AuthUser = {
      id: res.user.id,
      username: res.user.username,
      email: res.user.email,
      role: res.user.role as AuthUser['role'],
      xrpAddress: res.user.xrpAddress ?? null,
      gkcBalance: res.user.gkcBalance ?? 0,
      xrpBalance: res.user.xrpBalance ?? 0,
    };
    setToken(res.token);
    setUser(authUser);
    localStorage.setItem('gkc_token', res.token);
  };

  const register = async (username: string, email: string, password: string) => {
    if (!username || !email || !password) throw new Error('請填寫所有欄位');
    if (password.length < 8) throw new Error('密碼至少需要 8 個字元');
    const res = await authApi.register(username, email, password);
    const authUser: AuthUser = {
      id: res.user.id,
      username: res.user.username,
      email: res.user.email,
      role: res.user.role as AuthUser['role'],
      xrpAddress: res.user.xrpAddress ?? null,
      gkcBalance: 0,
      xrpBalance: 0,
    };
    setToken(res.token);
    setUser(authUser);
    localStorage.setItem('gkc_token', res.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('gkc_token');
  };

  const updateBalance = (gkc: number, xrp: number) => {
    if (!user) return;
    setUser({ ...user, gkcBalance: gkc, xrpBalance: xrp });
  };

  const refreshUser = async () => {
    const t = token ?? localStorage.getItem('gkc_token');
    if (!t) return;
    const u = await authApi.me(t);
    setUser({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role as AuthUser['role'],
      xrpAddress: u.xrpAddress ?? null,
      gkcBalance: u.gkcBalance ?? 0,
      xrpBalance: u.xrpBalance ?? 0,
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout, updateBalance, refreshUser }}
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
