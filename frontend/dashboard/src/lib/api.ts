/**
 * client/src/lib/api.ts
 * ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
 * Typed fetch wrapper for the GKC backend API.
 * Base URL: VITE_API_BASE_URL or relative paths via Vite proxy (PORT in root .env).
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ?�?� Auth ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    verificationStatus?: 'pending' | 'verified' | 'rejected';
    xrpAddress: string | null;
    theme?: 'light' | 'dark';
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (username: string, email: string, password: string) =>
    request<LoginResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  me: (token: string) =>
    request<LoginResponse['user']>('/api/v1/auth/me', {}, token),

  updatePreferences: (token: string, theme: 'light' | 'dark') =>
    request<{ ok: boolean; theme: string }>('/api/v1/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ theme }),
    }, token),

  updateProfile: (token: string, username: string) =>
    request<{ ok: boolean; user: { id: string; username: string; email: string; role: string } }>('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    }, token),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/api/v1/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, token),
};

// ?�?� Wallet ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�

export interface WalletBalance {
  gkcBalance: number | null;
  xrpBalance: number | null;
  hasTrustLine: boolean;
  xrpAddress: string | null;
  gkcIssuerAddress: string | null;
  errorCode: 'no_wallet' | 'xrpl_error' | null;
  errorMessage: string | null;
}

export interface Transaction {
  id: string;
  type: string;
  amount_gkc: number;
  balance_after: number;
  reference_id: string | null;
  tx_hash: string | null;
  description: string | null;
  created_at: string;
}

export interface XummPayload {
  uuid: string;
  qrPng: string;
  deeplink: string;
  expiresInSec: number;
}

export interface XummStatus {
  signed: boolean;
  cancelled: boolean;
  expired: boolean;
  resolved: boolean;
  txid: string | null;
  account: string | null;
}

export interface DepositPayload extends XummPayload {
  xrpAmount: number;
  gkcAmount: number;
  rate: number;
}

export interface DepositStatus {
  status: 'pending' | 'completed' | 'cancelled' | 'expired';
  gkcCredited?: number;
  txHash?: string;
}

export const walletApi = {
  balance: (token: string) =>
    request<WalletBalance>('/api/v1/wallet/balance', {}, token),

  transactions: (token: string, limit = 20, offset = 0) =>
    request<{ transactions: Transaction[]; total: number }>(
      `/api/v1/wallet/transactions?limit=${limit}&offset=${offset}`,
      {},
      token,
    ),

  trustlineTx: (token: string) =>
    request<{ tx: object; instructions: string[] }>('/api/v1/wallet/trustline-tx', {}, token),

  linkAddress: (token: string, xrpAddress: string) =>
    request<{ ok: boolean; xrpAddress: string }>('/api/v1/wallet/link-address', {
      method: 'POST',
      body: JSON.stringify({ xrpAddress }),
    }, token),

  bindInitiate: (token: string) =>
    request<XummPayload>('/api/v1/wallet/bind/initiate', { method: 'POST', body: '{}' }, token),

  rebindWallet: (token: string) =>
    request<XummPayload>('/api/v1/wallet/rebind', { method: 'POST', body: '{}' }, token),

  unbindWallet: (token: string) =>
    request<{ unbound?: boolean; ok?: boolean; message?: string }>(
      '/api/v1/wallet/bind',
      { method: 'DELETE' },
      token,
    ),

  bindStatus: (token: string, uuid: string) =>
    request<{ bound: boolean; resolved: boolean; cancelled: boolean; expired: boolean; address?: string }>(
      `/api/v1/wallet/bind/poll/${uuid}`,
      {},
      token,
    ),

  xummCreateTrustLine: (token: string) =>
    request<XummPayload>('/api/v1/wallet/xumm/trustline', { method: 'POST', body: '{}' }, token),

  xummStatus: (token: string, uuid: string) =>
    request<XummStatus>(`/api/v1/wallet/xumm/status/${uuid}`, {}, token),

  depositXumm: (token: string, gkcAmount: number) =>
    request<DepositPayload>('/api/v1/wallet/deposit/xumm', {
      method: 'POST',
      body: JSON.stringify({ gkcAmount }),
    }, token),

  depositStatus: (token: string, uuid: string) =>
    request<DepositStatus>(`/api/v1/wallet/deposit/status/${uuid}`, {}, token),
};

// ?�?� Providers ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�

export interface Provider {
  id: string;
  display_name: string;
  gpu_type: string;
  vram_gb: number;
  models: string[];
  price_input_per_1k: number;
  price_output_per_1k: number;
  tokens_per_sec: number | null;
  first_token_ms: number | null;
  uptime_30d: number;
  avg_rating: number;
  total_requests: number;
  current_load: number;
  max_concurrent: number;
  loadPercent: number;
  status: string;
}

export const providersApi = {
  marketplace: (params?: { model?: string; sort?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ providers: Provider[]; count: number }>(
      `/api/v1/providers/marketplace${qs ? `?${qs}` : ''}`,
    );
  },
};

// ?�?� API Keys ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�

export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string | null;
  daily_limit_gkc: number | null;
  spent_today_gkc: number;
  total_spent_gkc: number;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export const apiKeysApi = {
  list: (token: string) =>
    request<{ keys: ApiKey[] }>('/api/v1/api-keys', {}, token),

  create: (token: string, name?: string, dailyLimitGkc?: number) =>
    request<{ id: string; key: string; keyPrefix: string; message: string }>(
      '/api/v1/api-keys',
      { method: 'POST', body: JSON.stringify({ name, dailyLimitGkc }) },
      token,
    ),

  revoke: (token: string, id: string) =>
    request<{ success: boolean }>(`/api/v1/api-keys/${id}`, { method: 'DELETE' }, token),
};
