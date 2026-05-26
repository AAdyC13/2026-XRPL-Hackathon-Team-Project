import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiFetch, apiPost } from '@/hooks/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'node_owner' | 'admin';
  xrpAddress: string | null;
  gkcBalance: number;
  xrpBalance: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateBalance: (gkc: number, xrp: number) => void;
  refreshProfile: () => Promise<void>;
}

type LoginResponse = {
  token: string;
  expires_in: number;
  user: AuthUser;
};

type RegisterResponse = {
  id: string;
  username: string;
  email: string;
  token: string;
  verificationStatus: string;
  message: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      const storedToken = localStorage.getItem('gkc_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await apiFetch<AuthUser>('/api/v1/auth/me', { token: storedToken });
        setToken(storedToken);
        setUser(profile);
        localStorage.setItem('gkc_user', JSON.stringify(profile));
      } catch {
        localStorage.removeItem('gkc_token');
        localStorage.removeItem('gkc_user');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapSession();
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    if (!email || !password) throw new Error('請填寫所有欄位');
    const response = await apiPost<LoginResponse>('/api/v1/auth/login', { email, password });
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('gkc_token', response.token);
    localStorage.setItem('gkc_user', JSON.stringify(response.user));
    return response.user;
  };

  const register = async (username: string, email: string, password: string) => {
    if (!username || !email || !password) throw new Error('請填寫所有欄位');
    if (password.length < 8) throw new Error('密碼至少需要 8 個字元');

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      throw new Error('密碼需包含大小寫英文字母與數字');
    }

    const response = await apiPost<RegisterResponse>('/api/v1/auth/register', {
      username,
      email,
      password,
    });
    setToken(response.token);
    localStorage.setItem('gkc_token', response.token);
    const profile = await apiFetch<AuthUser>('/api/v1/auth/me', { token: response.token });
    setUser(profile);
    localStorage.setItem('gkc_user', JSON.stringify(profile));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('gkc_token');
    localStorage.removeItem('gkc_user');
  };

  const updateBalance = useCallback((gkc: number, xrp: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, gkcBalance: gkc, xrpBalance: xrp };
      localStorage.setItem('gkc_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const storedToken = localStorage.getItem('gkc_token');
    if (!storedToken) return;
    try {
      const profile = await apiFetch<AuthUser>('/api/v1/auth/me', { token: storedToken });
      setUser(profile);
      localStorage.setItem('gkc_user', JSON.stringify(profile));
    } catch {}
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout, updateBalance, refreshProfile }}
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
