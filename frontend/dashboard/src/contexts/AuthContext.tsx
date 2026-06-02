import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../lib/api';
import {
  ACCOUNT_POLICY_MESSAGES_ZH,
  isValidPassword,
  isValidUsername,
  toZhAccountPolicyMessage
} from '../policies/account-policy';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'node_owner' | 'provider' | 'admin';
  xrpAddress: string | null;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  theme: 'light' | 'dark';
  isActive: boolean;
  gkcBalance?: number;
  xrpBalance?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoAccount: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => void;
}

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
            verificationStatus: u.verificationStatus,
            theme: u.theme ?? 'light',
            isActive: u.isActive ?? true,
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
    setToken(res.token);
    localStorage.setItem('gkc_token', res.token);
    try {
      const u = await authApi.me(res.token);
      setUser({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role as AuthUser['role'],
        xrpAddress: u.xrpAddress ?? null,
        verificationStatus: u.verificationStatus,
        theme: u.theme ?? 'light',
        isActive: u.isActive ?? true,
      });
    } catch {
      setUser({
        id: res.user.id,
        username: res.user.username,
        email: res.user.email,
        role: res.user.role as AuthUser['role'],
        xrpAddress: res.user.xrpAddress ?? null,
        verificationStatus: res.user.verificationStatus,
        theme: res.user.theme ?? 'light',
        isActive: res.user.isActive ?? true,
      });
    }
  };

  const register = async (username: string, email: string, password: string) => {
    if (!username || !email || !password) throw new Error('請填寫所有欄位');
    if (!isValidUsername(username)) throw new Error(ACCOUNT_POLICY_MESSAGES_ZH.usernameInvalid);
    if (!isValidPassword(password)) throw new Error(ACCOUNT_POLICY_MESSAGES_ZH.passwordInvalid);
    let res;
    try {
      res = await authApi.register(username, email, password);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(toZhAccountPolicyMessage(error.message));
      }
      throw error;
    }
    const authUser: AuthUser = {
      id: res.user.id,
      username: res.user.username,
      email: res.user.email,
      role: res.user.role as AuthUser['role'],
      xrpAddress: res.user.xrpAddress ?? null,
      theme: 'light',
      isActive: res.user.isActive ?? true,
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

  const refreshUser = useCallback(async () => {
    const t = token ?? localStorage.getItem('gkc_token');
    if (!t) return;
    const u = await authApi.me(t);
    setUser({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role as AuthUser['role'],
      xrpAddress: u.xrpAddress ?? null,
      verificationStatus: u.verificationStatus,
      theme: u.theme ?? 'light',
      isActive: u.isActive ?? true,
    });
  }, [token]);

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    if (!user) return;
    setUser({ ...user, theme });
    const t = token ?? localStorage.getItem('gkc_token');
    if (t) authApi.updatePreferences(t, theme).catch(() => {});
  }, [user, token]);

  const isDemoAccount = user !== null && !user.isActive;

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, isDemoAccount, login, register, logout, refreshUser, setTheme }}
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
