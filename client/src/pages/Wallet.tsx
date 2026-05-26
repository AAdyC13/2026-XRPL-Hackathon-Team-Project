import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Send, ArrowUpRight, ArrowDownLeft, ExternalLink, ShieldCheck, Link2, Plus, X, AlertCircle, Wallet2, QrCode, Unlink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, apiPost, apiDelete } from '@/hooks/api';

// GKC Issuer 地址 (XRPL Testnet)
const GKC_ISSUER = 'rGKCPlatformIssuer7aXD9Fz3mQtY2vBnC5';
const XRPL_EXPLORER = 'https://testnet.xrpl.org';

const TRANSACTIONS = [
  {
    id: '1',
    type: 'inference',
    amount: 0.15,
    currency: 'GKC',
    description: 'AI 推論 - Llama 2 7B',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 3600000),
    txHash: 'E2E519ABC8F1D4C3B7A9E6F2D5C8B1A4E7F3D9C6B2A8E5F1D4C7B3A9E6F2D8C5',
  },
  {
    id: '2',
    type: 'reward',
    amount: 125.5,
    currency: 'GKC',
    description: '算力貢獻收益',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 7200000),
    txHash: 'A3F7B2C9E6D4B1A8F5C2E9D6B3A7F4C1E8D5B2A9F6C3E7D4B1A8F5C9E6D3B7A4',
  },
  {
    id: '3',
    type: 'transfer',
    amount: 500,
    currency: 'GKC',
    description: '轉賬至外部錢包',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 86400000),
    txHash: 'F9E2C1D8B5A4E7F3D9C6B2A1E8F5D4C7B3A9E6F2D5C8B1A7E4F3D9C6B2A8E5F1',
  },
  {
    id: '4',
    type: 'swap',
    amount: 100,
    currency: 'XRP',
    description: 'GKC 兌換 XRP',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 172800000),
    txHash: 'B5D8A4F1C7E9D3B2A6F5C1E8D4B7A3F9C6E2D5B1A8F4C7E3D9B6A2F5C8E1D4B3',
  },
];

type PaymentChannelRow = {
  id: string;
  channelId: string;
  lockedXrp: number;
  consumedXrp: number;
  status: 'open' | 'closing';
  expiration: Date;
};

export default function Wallet() {
  const { user, token, updateBalance, refreshProfile } = useAuth();
  const [xrpAddress, setXrpAddress] = useState(user?.xrpAddress ?? '');
  const [gkcBalance, setGkcBalance] = useState(user?.gkcBalance ?? 0);
  const [xrpBalance, setXrpBalance] = useState(user?.xrpBalance ?? 0);
  const [walletLoading, setWalletLoading] = useState(true);

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [trustlineSet, setTrustlineSet] = useState(false);
  const [channels, setChannels] = useState<PaymentChannelRow[]>([]);
  const [isSettingTrustline, setIsSettingTrustline] = useState(false);
  const [trustlineQrPng, setTrustlineQrPng] = useState<string | null>(null);
  const [trustlineUuid, setTrustlineUuid] = useState<string | null>(null);

  // wallet bind state
  const [isBinding, setIsBinding] = useState(false);
  const [bindQrPng, setBindQrPng] = useState<string | null>(null);
  const [bindUuid, setBindUuid] = useState<string | null>(null);
  const bindPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // unbind state
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);

  const verificationStatus = user?.verificationStatus ?? 'pending';

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(null), 2000);
    toast.success('已複製到剪貼板');
  };

  const stopBindPoll = () => {
    if (bindPollRef.current) {
      clearInterval(bindPollRef.current);
      bindPollRef.current = null;
    }
  };

  const handleInitiateBind = async () => {
    if (!token) return;
    setIsBinding(true);
    try {
      const res = await apiPost<{ uuid: string; qrPng: string }>('/api/v1/wallet/bind', {}, { token });
      setBindUuid(res.uuid);
      setBindQrPng(res.qrPng);

      bindPollRef.current = setInterval(async () => {
        try {
          const poll = await apiFetch<{ bound: boolean; address?: string; cancelled?: boolean; expired?: boolean }>(
            `/api/v1/wallet/bind/${res.uuid}`, { token }
          );
          if (poll.bound && poll.address) {
            stopBindPoll();
            setBindQrPng(null);
            setBindUuid(null);
            setIsBinding(false);
            setXrpAddress(poll.address);
            await refreshProfile();
            toast.success('Xaman 錢包綁定成功！');
          } else if (poll.cancelled || poll.expired) {
            stopBindPoll();
            setBindQrPng(null);
            setBindUuid(null);
            setIsBinding(false);
            toast.error(poll.cancelled ? '簽名已取消。' : '簽名已過期，請重試。');
          }
        } catch {}
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '建立綁定請求失敗');
      setIsBinding(false);
    }
  };

  const handleUnbind = async () => {
    if (!token) return;
    setIsUnbinding(true);
    try {
      await apiDelete('/api/v1/wallet/bind', { token });
      setXrpAddress('');
      setTrustlineSet(false);
      setShowUnbindConfirm(false);
      await refreshProfile();
      toast.success('錢包已解除綁定。');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '解除綁定失敗');
    } finally {
      setIsUnbinding(false);
    }
  };

  const handleSetupTrustline = async () => {
    if (!token) return;
    setIsSettingTrustline(true);
    try {
      const response = await apiPost<{ txjson: unknown; xaman?: { uuid: string; qrPng: string } }>(
        '/api/v1/wallet/trustline',
        { limit: '1000000', signWithXaman: true },
        { token }
      );
      if (response.xaman?.qrPng) {
        setTrustlineQrPng(response.xaman.qrPng);
        setTrustlineUuid(response.xaman.uuid);
        toast.info('請用 Xaman 掃描 QR code 簽名建立信任鍊');

        const poll = setInterval(async () => {
          try {
            const status = await apiFetch<{ signed: boolean; resolved: boolean }>(
              `/api/v1/wallet/bind/${response.xaman!.uuid}`, { token }
            );
            if (status.signed) {
              clearInterval(poll);
              setTrustlineQrPng(null);
              setTrustlineUuid(null);
              setIsSettingTrustline(false);
              await apiPost('/api/v1/wallet/trustline/approve', {}, { token });
              setTrustlineSet(true);
              toast.success('GKC TrustLine 已建立並通過 Issuer 授權！');
            }
          } catch {}
        }, 2000);
      } else {
        toast.success('TrustLine 交易已準備，請使用 XRPL 錢包簽署並提交');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '設定 TrustLine 失敗');
      setIsSettingTrustline(false);
    }
  };

  useEffect(() => {
    return () => stopBindPoll();
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchWalletData = async () => {
      setWalletLoading(true);
      try {
        const wallet = await apiFetch<{
          gkc_balance: number;
          xrp_balance: number;
          xrp_address: string | null;
          verification_status: string;
          payment_channel: unknown;
        }>('/api/v1/wallet', { token });

        setGkcBalance(wallet.gkc_balance);
        setXrpBalance(wallet.xrp_balance);
        setXrpAddress(wallet.xrp_address ?? '');
        updateBalance(wallet.gkc_balance, wallet.xrp_balance);

        if (wallet.xrp_address) {
          try {
            const balance = await apiFetch<{ lines: Array<{ currency: string }> }>(
              '/api/v1/wallet/balance', { token }
            );
            setTrustlineSet(balance.lines.some((line) => line.currency === 'GKC'));
          } catch {}
        }
        setChannels([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '讀取錢包資料失敗');
      } finally {
        setWalletLoading(false);
      }
    };

    fetchWalletData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.xrpAddress]);

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">錢包</h1>
          <p className="text-muted-foreground mt-2">管理您的 GKC 與 XRP 資產</p>
        </div>

        {/* 帳號啟用流程 */}
        {(verificationStatus === 'pending' || verificationStatus === 'rejected') && (
          <Card className={verificationStatus === 'rejected' ? 'border-destructive/50 bg-destructive/5' : 'border-yellow-500/50 bg-yellow-500/5'}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${verificationStatus === 'rejected' ? 'bg-destructive/15 text-destructive' : 'bg-yellow-500/15 text-yellow-500'}`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  {verificationStatus === 'rejected' ? (
                    <>
                      <p className="font-semibold">帳號審核未通過</p>
                      <p className="text-xs text-muted-foreground">您的帳號審核未通過，請聯繫平台管理員。</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">等待管理員審核</p>
                      <p className="text-xs text-muted-foreground">您的帳號正在等待管理員審核，審核通過後即可連接 Xaman 錢包。</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {verificationStatus === 'verified' && !xrpAddress && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-5">
              {bindQrPng ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <p className="font-semibold text-sm">請用 Xaman 掃描 QR code</p>
                  <img src={bindQrPng} alt="Xaman QR" className="w-48 h-48 rounded-lg border" />
                  <p className="text-xs text-muted-foreground">掃描後在 Xaman 中點選「Sign」</p>
                  <Button size="sm" variant="outline" onClick={() => { stopBindPoll(); setBindQrPng(null); setBindUuid(null); setIsBinding(false); }}>
                    取消
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/15 text-primary">
                      <Wallet2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">連接 Xaman 錢包</p>
                      <p className="text-xs text-muted-foreground">學校身份驗證完成，請連接 Xaman 錢包以持有 GKC</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleInitiateBind} disabled={isBinding}>
                    {isBinding ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        處理中...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5"><QrCode className="w-4 h-4" />掃 QR 綁定</span>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TrustLine 狀態 */}
        {xrpAddress && (
          <Card className={trustlineSet ? 'border-accent/30' : 'border-yellow-500/50'}>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trustlineSet ? 'bg-accent/15 text-accent' : 'bg-yellow-500/15 text-yellow-500'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {trustlineSet ? 'GKC TrustLine 已設定 ✓' : 'GKC TrustLine 尚未設定'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Issuer: <code className="font-mono">{GKC_ISSUER.slice(0, 20)}...</code>
                      {' · '}
                      <a
                        href={`${XRPL_EXPLORER}/accounts/${GKC_ISSUER}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        查看 Issuer <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!trustlineSet && (
                    trustlineQrPng ? null : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSetupTrustline}
                        disabled={isSettingTrustline || walletLoading}
                      >
                        {isSettingTrustline ? '準備中…' : '設定 TrustLine'}
                      </Button>
                    )
                  )}
                  {trustlineSet && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowUnbindConfirm(true)}>
                      <Unlink className="w-4 h-4 mr-1" />解除綁定
                    </Button>
                  )}
                </div>
              </div>
              {trustlineQrPng && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <p className="text-sm font-semibold">請用 Xaman 掃描以設定 TrustLine</p>
                  <img src={trustlineQrPng} alt="TrustLine QR" className="w-48 h-48 rounded-lg border" />
                  <p className="text-xs text-muted-foreground">掃描後在 Xaman 中點選「Sign」</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 解除綁定確認 */}
        {showUnbindConfirm && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-5">
              <div className="space-y-3">
                <p className="font-semibold text-destructive">確認解除錢包綁定？</p>
                <p className="text-sm text-muted-foreground">GKC 餘額必須為 0 才能解除綁定。舊錢包的信任鍊將被凍結，無法再接收 GKC。</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleUnbind} disabled={isUnbinding}>
                    {isUnbinding ? '處理中...' : '確認解除綁定'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowUnbindConfirm(false)}>取消</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>高科幣 (GKC)</span>
                <Badge>主錢包</Badge>
              </CardTitle>
              <CardDescription>平台內部計費單位</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">可用餘額</p>
                <p className="text-4xl font-bold">{gkcBalance.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">XRPL 地址（GKC IOU 持有地址）</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono flex-1 truncate">{xrpAddress}</code>
                  <button
                    onClick={() => copyToClipboard(xrpAddress, 'gkc')}
                    className="p-2 hover:bg-muted rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={`${XRPL_EXPLORER}/accounts/${xrpAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-muted rounded transition-colors text-primary"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="gap-2">
                  <ArrowDownLeft className="w-4 h-4" />
                  充值
                </Button>
                <Button variant="outline" className="gap-2">
                  <ArrowUpRight className="w-4 h-4" />
                  提現
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>XRP Ledger</span>
                <Badge variant="outline">結算層</Badge>
              </CardTitle>
              <CardDescription>區塊鏈結算資產</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">可用餘額</p>
                <p className="text-4xl font-bold">{xrpBalance.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">XRP 地址</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono flex-1 truncate">{xrpAddress}</code>
                  <button
                    onClick={() => copyToClipboard(xrpAddress, 'xrp')}
                    className="p-2 hover:bg-muted rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={`${XRPL_EXPLORER}/accounts/${xrpAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-muted rounded transition-colors text-primary"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="gap-2">
                  <ArrowDownLeft className="w-4 h-4" />
                  充值
                </Button>
                <Button variant="outline" className="gap-2">
                  <Send className="w-4 h-4" />
                  轉賬
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              GKC ↔ XRP 兌換
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 text-xs font-semibold">DEMO</Badge>
            </CardTitle>
            <CardDescription>通過 XRPL AMM 流動性池進行兌換（示例數據，Phase 2+）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>發送</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="0.00" className="flex-1" />
                  <select className="px-3 py-2 rounded-lg border border-border bg-background">
                    <option>GKC</option>
                    <option>XRP</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="ghost" size="icon" className="rounded-full">
                  ⇄
                </Button>
              </div>

              <div className="space-y-2">
                <Label>接收</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="0.00" disabled className="flex-1" />
                  <select className="px-3 py-2 rounded-lg border border-border bg-background">
                    <option>XRP</option>
                    <option>GKC</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">即時匯率</span>
                <span>1 GKC = 0.0082 XRP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AMM 手續費</span>
                <span>0.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">池深度 (GKC)</span>
                <span>1,250,000 GKC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">池深度 (XRP)</span>
                <span>10,250 XRP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h 交易量</span>
                <span>38,400 GKC</span>
              </div>
              <div className="flex justify-between border-t pt-1.5">
                <span className="text-muted-foreground">AMM 帳本</span>
                <a
                  href={`${XRPL_EXPLORER}/amm/GKC+${GKC_ISSUER}/XRP`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  查看 AMM 池 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <Button className="w-full mt-4">確認兌換</Button>
          </CardContent>
        </Card>

        {/* Payment Channel 管理 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Payment Channel
                </CardTitle>
                <CardDescription className="mt-1">AI 推論 per-token 微支付通道</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled
                title="Phase 2：Payment Channel API"
              >
                <Plus className="w-4 h-4" />
                開啟新通道（即將推出）
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {channels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                尚無開啟的 Payment Channel（Phase 2 API 上線後將從後端載入）
              </p>
            ) : (
              <div className="space-y-3">
                {channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-4 rounded-lg border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {ch.channelId.slice(0, 16)}...
                        </code>
                        <a
                          href={`${XRPL_EXPLORER}/transactions/${ch.channelId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          鏈上查詢 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <button
                        type="button"
                        className="text-muted-foreground opacity-50 cursor-not-allowed"
                        aria-disabled
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">鎖定</p>
                        <p className="font-semibold">{ch.lockedXrp} XRP</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">已消費</p>
                        <p className="font-semibold text-destructive">{ch.consumedXrp} XRP</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">剩餘</p>
                        <p className="font-semibold text-accent">{(ch.lockedXrp - ch.consumedXrp).toFixed(1)} XRP</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{ch.status === 'open' ? '開啟中' : '結算中'}</Badge>
                      <span>到期: {ch.expiration.toLocaleDateString('zh-TW')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              交易歷史
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 text-xs font-semibold">DEMO</Badge>
            </CardTitle>
            <CardDescription>示例 UI — 交易 API（Phase 2+）上線後改為後端資料</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="inference">推論</TabsTrigger>
                <TabsTrigger value="reward">收益</TabsTrigger>
                <TabsTrigger value="transfer">轉賬</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
                {TRANSACTIONS.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

interface TransactionRowProps {
  tx: (typeof TRANSACTIONS)[0];
}

function TransactionRow({ tx }: TransactionRowProps) {
  const isIncome = tx.type === 'reward';
  const icon =
    tx.type === 'inference' ? (
      <ArrowDownLeft className="w-5 h-5" />
    ) : tx.type === 'reward' ? (
      <ArrowUpRight className="w-5 h-5" />
    ) : (
      <Send className="w-5 h-5" />
    );

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isIncome ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
          }`}
        >
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{tx.description}</p>
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 text-xs font-semibold px-1.5 py-0">DEMO</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{tx.timestamp.toLocaleString('zh-TW')}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${isIncome ? 'text-accent' : 'text-destructive'}`}>
          {isIncome ? '+' : '-'}{tx.amount} {tx.currency}
        </p>
        <a
          href={`https://testnet.xrpl.org/transactions/${tx.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary flex items-center justify-end gap-1 transition-colors"
        >
          {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-4)}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

