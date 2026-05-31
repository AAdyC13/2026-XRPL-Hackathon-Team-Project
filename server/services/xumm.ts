/**
 * server/services/xumm.ts
 * ─────────────────────────────────────────────────────
 * XUMM / Xaman payload API — no SDK needed, plain fetch.
 *
 * Get API credentials at: https://apps.xumm.dev
 * Set XUMM_API_KEY and XUMM_API_SECRET in .env
 */

const XUMM_BASE = 'https://xumm.app/api/v1/platform';

function xummHeaders() {
  const apiKey = process.env.XUMM_API_KEY;
  const apiSecret = process.env.XUMM_API_SECRET;
  console.log("[xumm] credentials", {
    hasKey: Boolean(apiKey),
    hasSecret: Boolean(apiSecret),
    keyTail: apiKey ? apiKey.slice(-4) : null,
  });
  if (!apiKey || !apiSecret) {
    throw new Error('XUMM credentials not configured. Set XUMM_API_KEY and XUMM_API_SECRET in .env');
  }
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-api-secret': apiSecret,
  };
}

async function xummFetch<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  console.log("[xumm] request", { method, path });
  const res = await fetch(`${XUMM_BASE}${path}`, {
    method,
    headers: xummHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    console.error("[xumm] error", { status: res.status, path, body: text });
    throw new Error(`XUMM API ${res.status}: ${text}`);
  }
  console.log("[xumm] response ok", { status: res.status, path });
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface XummPayloadResponse {
  uuid: string;
  next: { always: string };
  refs: { qr_png: string; qr_matrix: string; websocket_status: string };
  pushed: boolean;
  expire: number; // seconds until expiry
}

interface XummStatusResponse {
  meta: {
    exists: boolean;
    uuid: string;
    submit: boolean;
    signed: boolean;
    cancelled: boolean;
    expired: boolean;
    resolved: boolean;
    return_url_app: string | null;
    return_url_web: string | null;
  };
  response: {
    hex: string | null;
    txid: string | null;
    resolved_at: string | null;
    dispatched_result: string | null;
    account: string | null;
  } | null;
}

// ── Public API ─────────────────────────────────────────────────────────────

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

/**
 * Create a TrustSet payload for the user to sign with XUMM app.
 * Returns QR PNG URL and deeplink (for mobile).
 * Account is intentionally omitted — Xaman fills it in from whoever scans.
 */
export async function createTrustLinePayload(): Promise<XummPayload> {
  console.log("[xumm] createTrustLinePayload:start");
  const issuer = process.env.GKC_ISSUER_ADDRESS;
  if (!issuer) throw new Error('GKC_ISSUER_ADDRESS not set');

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  const data = await xummFetch<XummPayloadResponse>('POST', '/payload', {
    txjson: {
      TransactionType: 'TrustSet',
      LimitAmount: {
        currency: 'GKC',
        issuer,
        value: '10000000',
      },
    },
    options: {
      submit: true,
      return_url: {
        web: `${frontendUrl}/wallet?trustline=done`,
      },
    },
    custom_meta: {
      instruction: '設定 GKC TrustLine — 允許您的 XRP 錢包接收 GKC 代幣，完成後將獲得 100 GKC 歡迎獎勵',
      blob: { purpose: 'gkc_trustline', platform: 'gkc-platform' },
    },
  });

  return {
    uuid: data.uuid,
    qrPng: data.refs.qr_png,
    deeplink: data.next.always,
    expiresInSec: data.expire,
  };
}

/**
 * Poll status of a previously created XUMM payload.
 */
export async function getPayloadStatus(uuid: string): Promise<XummStatus> {
  console.log("[xumm] getPayloadStatus", { uuid });
  const data = await xummFetch<XummStatusResponse>('GET', `/payload/${uuid}`);
  return {
    signed: data.meta?.signed ?? false,
    cancelled: data.meta?.cancelled ?? false,
    expired: data.meta?.expired ?? false,
    resolved: data.meta?.resolved ?? false,
    txid: data.response?.txid ?? null,
    account: data.response?.account ?? null,
  };
}

/** True if XUMM credentials are configured. */
export function isXummConfigured(): boolean {
  return !!(process.env.XUMM_API_KEY && process.env.XUMM_API_SECRET);
}

/**
 * Create an XRP Payment payload for the user to send XRP to the platform.
 * xrpAmount — how much XRP to send (e.g. 10.5)
 * destTag   — numeric DestinationTag to identify the deposit
 */
export async function createDepositPayload(
  fromAddress: string,
  xrpAmount: number,
  destTag: number,
): Promise<XummPayload> {
  const platformAddress = process.env.PLATFORM_ADDRESS;
  if (!platformAddress) throw new Error('PLATFORM_ADDRESS not set');

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  // XRP amounts in XUMM are expressed as drops (1 XRP = 1,000,000 drops)
  const drops = String(Math.round(xrpAmount * 1_000_000));

  const data = await xummFetch<XummPayloadResponse>('POST', '/payload', {
    txjson: {
      TransactionType: 'Payment',
      Destination: platformAddress,
      DestinationTag: destTag,
      Amount: drops,
    },
    options: {
      submit: true,
      return_url: {
        web: `${frontendUrl}/wallet?deposit=done`,
      },
    },
    custom_meta: {
      instruction: `發送 ${xrpAmount} XRP 到 GKC 平台以充值 GKC（固定匯率 1 XRP = ${process.env.GKC_PER_XRP ?? '10'} GKC）`,
      blob: { purpose: 'gkc_deposit', destTag, platform: 'gkc-platform' },
    },
  });

  return {
    uuid: data.uuid,
    qrPng: data.refs.qr_png,
    deeplink: data.next.always,
    expiresInSec: data.expire,
  };
}

/**
 * Create a SignIn payload for wallet binding — the user scans with Xaman
 * and the signed response reveals their XRP address.
 */
export async function createWalletBindPayload(): Promise<XummPayload> {
  console.log("[xumm] createWalletBindPayload:start");
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  const data = await xummFetch<XummPayloadResponse>('POST', '/payload', {
    txjson: {
      TransactionType: 'SignIn',
    },
    options: {
      return_url: {
        web: `${frontendUrl}/wallet?bind=done`,
      },
    },
    custom_meta: {
      instruction: '請用 Xaman 掃描以綁定您的 XRP 錢包地址',
      blob: { purpose: 'gkc_wallet_bind', platform: 'gkc-platform' },
    },
  });

  return {
    uuid: data.uuid,
    qrPng: data.refs.qr_png,
    deeplink: data.next.always,
    expiresInSec: data.expire,
  };
}

/**
 * Create a CheckCreate payload for the user to authorise a spending limit.
 * The user signs this with Xaman — it creates an XRPL Check object that the
 * platform can cash (up to sendMaxGkc) over the validity period.
 *
 * sendMaxGkc  — maximum GKC the platform may ever cash from this check
 * expireDays  — how many days until the check expires (default 30)
 * fromAddress — user's XRP address (XUMM will fill it in automatically if omitted)
 */
export async function createCheckPayload(
  sendMaxGkc: number,
  expireDays = 30,
  fromAddress?: string,
): Promise<XummPayload> {
  const issuer = process.env.GKC_ISSUER_ADDRESS;
  const platformAddress = process.env.PLATFORM_ADDRESS;
  if (!issuer) throw new Error('GKC_ISSUER_ADDRESS not set');
  if (!platformAddress) throw new Error('PLATFORM_ADDRESS not set');

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  // XRPL epoch = Unix epoch − 946684800
  const xrplNow = Math.floor(Date.now() / 1000) - 946684800;
  const expiry = xrplNow + expireDays * 86400;

  const txjson: Record<string, unknown> = {
    TransactionType: 'CheckCreate',
    Destination: platformAddress,
    SendMax: {
      currency: 'GKC',
      issuer,
      value: sendMaxGkc.toFixed(6),
    },
    Expiration: expiry,
  };
  if (fromAddress) txjson.Account = fromAddress;

  const data = await xummFetch<XummPayloadResponse>('POST', '/payload', {
    txjson,
    options: {
      submit: true,
      return_url: {
        web: `${frontendUrl}/wallet?check=done`,
      },
    },
    custom_meta: {
      instruction: `授權 GKC 平台最多扣款 ${sendMaxGkc.toFixed(2)} GKC（有效期 ${expireDays} 天）`,
      blob: { purpose: 'gkc_check_create', sendMaxGkc, expireDays, platform: 'gkc-platform' },
    },
  });

  return {
    uuid: data.uuid,
    qrPng: data.refs.qr_png,
    deeplink: data.next.always,
    expiresInSec: data.expire,
  };
}
