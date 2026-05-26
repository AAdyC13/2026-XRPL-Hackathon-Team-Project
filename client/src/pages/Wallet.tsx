import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Copy, Send, ArrowUpRight, ArrowDownLeft, ExternalLink, ShieldCheck, Link2, Plus, X, Loader2, QrCode, Smartphone } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { walletApi, type Transaction, type XummPayload, type DepositPayload } from '@/lib/api';

// GKC Issuer 地址 (XRPL Testnet) — set by setup:xrpl
const GKC_ISSUER = 'rBeY7pzk4siwXCb6XpVGj9nZ6FcQBdyh79';
const XRPL_EXPLORER = 'https://testnet.xrpl.org';

// Mock Payment Channel data (Payment Channels = XRP only, placeholder UI)
const MOCK_CHANNELS = [
  {
    id: 'ch-001',
    channelId: '3E519ABC8F1D4C3B7A9E6F2D5C8B1A4E7F3D9C6B',
    lockedXrp: 50,
    consumedXrp: 12.3,
    status: 'open' as const,
    expiration: new Date(Date.now() + 86400000 * 7),
  },
];

export default function Wallet() {
  const { user, token, updateBalance, refreshUser } = useAuth();
  const xrpAddress = user?.xrpAddress ?? null;
  const gkcBalance = user?.gkcBalance ?? 0;
  const xrpBalance = user?.xrpBalance ?? 0;

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [hasTrustLine, setHasTrustLine] = useState(false);
  const [channels, setChannels] = useState(MOCK_CHANNELS);
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [onChainBalance, setOnChainBalance] = useState<number | null>(null);

  // XRP address linking
  const [linkAddrInput, setLinkAddrInput] = useState('');
  const [linkAddrLoading, setLinkAddrLoading] = useState(false);

  // XUMM TrustLine modal
  const [xummPayload, setXummPayload] = useState<XummPayload | null>(null);
  const [xummLoading, setXummLoading] = useState(false);
  const [xummSigned, setXummSigned] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Poll XUMM status while modal is open
  useEffect(() => {
    if (!xummPayload || xummSigned) return;
    pollRef.current = setInterval(async () => {
      try {
        const status = await walletApi.xummStatus(token!, xummPayload.uuid);
        if (status.signed) {
          stopPolling();
          setXummSigned(true);
          toast.success('TrustLine 設定成功！正在發送 100 GKC 歡迎獎勵…');
          // Wait a moment for backend to process GKC send, then refresh
          setTimeout(async () => {
            await refreshUser();
            setHasTrustLine(true);
          }, 3000);
        } else if (status.cancelled || status.expired) {
          stopPolling();
          toast.error(status.cancelled ? '您已取消簽名' : 'Xaman 請求已過期');
          setXummPayload(null);
        }
      } catch { /* silently ignore poll errors */ }
    }, 3000);
    return stopPolling;
  }, [xummPayload, xummSigned, token, stopPolling, refreshUser]);

  const fetchBalance = useCallback(() => {
    if (!token) return;
    walletApi.balance(token)
      .then(b => {
        setOnChainBalance(b.onChainBalance);
        setHasTrustLine(b.hasTrustLine);
        if (b.dbBalance !== gkcBalance) updateBalance(b.dbBalance, xrpBalance);
      })
      .catch(() => {});
    walletApi.transactions(token)
      .then(r => setTxList(r.transactions))
      .catch(() => {});
  }, [token, gkcBalance, xrpBalance, updateBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleLinkAddress = async () => {
    const addr = linkAddrInput.trim();
    if (!addr.startsWith('r') || addr.length < 25) {
      toast.error('請輸入有效的 XRP 地址 (r 開頭)');
      return;
    }
    setLinkAddrLoading(true);
    try {
      await walletApi.linkAddress(token!, addr);
      await refreshUser();
      setLinkAddrInput('');
      toast.success('XRP 地址已綁定');
      fetchBalance();
    } catch {
      toast.error('綁定失敗，請重試');
    } finally {
      setLinkAddrLoading(false);
    }
  };

  const handleOpenXumm = async () => {
    setXummLoading(true);
    setXummSigned(false);
    try {
      const payload = await walletApi.xummCreateTrustLine(token!);
      setXummPayload(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '無法連接 Xaman 服務';
      toast.error(msg);
    } finally {
      setXummLoading(false);
    }
  };

  const handleCloseXummModal = () => {
    stopPolling();
    setXummPayload(null);
    setXummSigned(false);
  };

  // ── Deposit (XRP → GKC) ──────────────────────────────────────────────────
  const [depositPayload, setDepositPayload] = useState<DepositPayload | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositDone, setDepositDone] = useState(false);
  const [depositGkcInput, setDepositGkcInput] = useState('1000');
  const depositPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const GKC_RATE = 10; // mirrors .env GKC_PER_XRP

  const stopDepositPolling = useCallback(() => {
    if (depositPollRef.current) { clearInterval(depositPollRef.current); depositPollRef.current = null; }
  }, []);

  useEffect(() => {
    if (!depositPayload || depositDone) return;
    depositPollRef.current = setInterval(async () => {
      try {
        const s = await walletApi.depositStatus(token!, depositPayload.uuid);
        if (s.status === 'completed') {
          stopDepositPolling();
          setDepositDone(true);
          toast.success(`充值成功！${s.gkcCredited} GKC 已到帳`);
          setTimeout(() => { fetchBalance(); setDepositPayload(null); setDepositDone(false); }, 3000);
        } else if (s.status === 'cancelled' || s.status === 'expired') {
          stopDepositPolling();
          toast.error(s.status === 'cancelled' ? '已取消充值' : '充值請求已過期');
          setDepositPayload(null);
        }
      } catch { /* ignore */ }
    }, 3000);
    return stopDepositPolling;
  }, [depositPayload, depositDone, token, stopDepositPolling, fetchBalance]);

  const handleOpenDeposit = async () => {
    const gkc = parseFloat(depositGkcInput);
    if (!gkc || gkc < 10) { toast.error('最少充值 10 GKC'); return; }
    setDepositLoading(true);
    setDepositDone(false);
    try {
      const payload = await walletApi.depositXumm(token!, gkc);
      setDepositPayload(payload);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '無法建立充值請求');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleCloseDepositModal = () => {
    stopDepositPolling();
    setDepositPayload(null);
    setDepositDone(false);
  };

  const [isOpeningChannel, setIsOpeningChannel] = useState(false);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(null), 2000);
    toast.success('已複製到剪貼板');
  };

  const handleOpenChannel = async () => {
    setIsOpeningChannel(true);
    // TODO: 替換為真實 API 呼叫 — POST /api/v1/payment-channel/open
    await new Promise((r) => setTimeout(r, 1200));
    const newChannel = {
      id: 'ch-' + Date.now(),
      channelId: Array.from({ length: 40 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join(''),
      lockedXrp: 20,
      consumedXrp: 0,
      status: 'open' as const,
      expiration: new Date(Date.now() + 86400000 * 7),
    };
    setChannels((prev) => [...prev, newChannel]);
    setIsOpeningChannel(false);
    toast.success('Payment Channel 已開啟，鎖定 20 XRP');
  };

  const handleCloseChannel = (id: string) => {
    // TODO: 替換為真實 API 呼叫 — POST /api/v1/payment-channel/close
    setChannels((prev) => prev.filter((c) => c.id !== id));
    toast.success('通道已關閉，未消費的 XRP 已退回');
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">錢包</h1>
          <p className="text-muted-foreground mt-2">管理您的 GKC 與 XRP 資產</p>
        </div>

        {/* ── Link XRP address (if not set) ── */}
        {!xrpAddress && (
          <Card className="border-blue-500/50">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-500 shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold">綁定您的 XRP 地址</p>
                    <p className="text-xs text-muted-foreground mt-0.5">需要 XRPL 地址才能接收 GKC 並進行鏈上結算</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      value={linkAddrInput}
                      onChange={e => setLinkAddrInput(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button onClick={handleLinkAddress} disabled={linkAddrLoading || !linkAddrInput.trim()} size="sm">
                      {linkAddrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '綁定'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── TrustLine status ── */}
        <Card className={hasTrustLine ? 'border-accent/30' : 'border-yellow-500/50'}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasTrustLine ? 'bg-accent/15 text-accent' : 'bg-yellow-500/15 text-yellow-500'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">
                    {hasTrustLine ? 'GKC TrustLine 已設定 ✓' : 'GKC TrustLine 尚未設定'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Issuer: <code className="font-mono">{GKC_ISSUER.slice(0, 20)}…</code>
                    {' · '}
                    <a href={`${XRPL_EXPLORER}/accounts/${GKC_ISSUER}`} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5">
                      查看 Issuer <ExternalLink className="w-3 h-3" />
                    </a>
                    {!hasTrustLine && <span className="text-yellow-600 ml-2">· 設定後可獲得 100 GKC 歡迎獎勵</span>}
                  </p>
                </div>
              </div>
              {!hasTrustLine && xrpAddress && (
                <Button size="sm" onClick={handleOpenXumm} disabled={xummLoading} className="gap-2 shrink-0">
                  {xummLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  用 Xaman 設定
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── XUMM QR Modal ── */}
        <Dialog open={!!xummPayload} onOpenChange={open => { if (!open) handleCloseXummModal(); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" /> 設定 GKC TrustLine
              </DialogTitle>
              <DialogDescription>
                用 Xaman App 掃描下方 QR Code 並簽名，完成後自動發送 100 GKC 歡迎獎勵。
              </DialogDescription>
            </DialogHeader>
            {xummPayload && !xummSigned && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img src={xummPayload.qrPng} alt="Xaman QR Code" className="w-52 h-52 rounded-xl border" />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  等待簽名中…
                </div>
                <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                  <a href={xummPayload.deeplink} target="_blank" rel="noopener noreferrer">
                    <Smartphone className="w-4 h-4" /> 在手機上開啟 Xaman
                  </a>
                </Button>
              </div>
            )}
            {xummSigned && (
              <div className="py-6 text-center space-y-2">
                <p className="text-3xl">✅</p>
                <p className="font-semibold">簽名成功！</p>
                <p className="text-sm text-muted-foreground">GKC 歡迎獎勵處理中，請稍候…</p>
                <Button size="sm" onClick={handleCloseXummModal}>關閉</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Deposit: XRP → GKC ── */}
        {hasTrustLine && (
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/15 text-primary shrink-0">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold">充值 GKC</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      固定匯率 <strong>1 XRP = {GKC_RATE} GKC</strong>，用 Xaman 掃描 QR 發送 XRP 即可
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="10"
                        step="10"
                        placeholder="GKC 數量（最少 10）"
                        value={depositGkcInput}
                        onChange={e => setDepositGkcInput(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      = {(parseFloat(depositGkcInput || '0') / GKC_RATE).toFixed(2)} XRP
                    </span>
                    <Button onClick={handleOpenDeposit} disabled={depositLoading || !xrpAddress} size="sm" className="gap-2 shrink-0">
                      {depositLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                      充值
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Deposit XUMM QR Modal ── */}
        <Dialog open={!!depositPayload} onOpenChange={open => { if (!open) handleCloseDepositModal(); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5" /> 充值 GKC
              </DialogTitle>
              <DialogDescription>
                {depositPayload && `發送 ${depositPayload.xrpAmount} XRP → 獲得 ${depositPayload.gkcAmount} GKC`}
              </DialogDescription>
            </DialogHeader>
            {depositPayload && !depositDone && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img src={depositPayload.qrPng} alt="充值 QR Code" className="w-52 h-52 rounded-xl border" />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  等待付款中…
                </div>
                <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                  <a href={depositPayload.deeplink} target="_blank" rel="noopener noreferrer">
                    <Smartphone className="w-4 h-4" /> 在手機上開啟 Xaman
                  </a>
                </Button>
              </div>
            )}
            {depositDone && (
              <div className="py-6 text-center space-y-2">
                <p className="text-3xl">✅</p>
                <p className="font-semibold">充值成功！</p>
                <p className="text-sm text-muted-foreground">GKC 已入帳，正在更新餘額…</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                  <code className="text-sm font-mono flex-1 truncate">{xrpAddress ?? '—'}</code>
                  <button
                    onClick={() => xrpAddress && copyToClipboard(xrpAddress, 'gkc')}
                    disabled={!xrpAddress}
                    className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-40"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {xrpAddress && (
                    <a
                      href={`${XRPL_EXPLORER}/accounts/${xrpAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-muted rounded transition-colors text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
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
                  <code className="text-sm font-mono flex-1 truncate">{xrpAddress ?? '—'}</code>
                  <button
                    onClick={() => xrpAddress && copyToClipboard(xrpAddress, 'xrp')}
                    disabled={!xrpAddress}
                    className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-40"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {xrpAddress && (
                    <a
                      href={`${XRPL_EXPLORER}/accounts/${xrpAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-muted rounded transition-colors text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
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
            <CardTitle>GKC ↔ XRP 兌換</CardTitle>
            <CardDescription>通過 XRPL AMM 流動性池進行兌換</CardDescription>
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
                onClick={handleOpenChannel}
                disabled={isOpeningChannel}
              >
                {isOpeningChannel ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                開啟新通道
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {channels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                尚無開啟的 Payment Channel
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
                        onClick={() => handleCloseChannel(ch.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
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
            <CardTitle>交易歷史</CardTitle>
            <CardDescription>所有錢包交易記錄</CardDescription>
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
                {txList.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">尚無交易記錄</p>
                )}
                {txList.map((tx) => (
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
  tx: Transaction;
}

function TransactionRow({ tx }: TransactionRowProps) {
  const isIncome = tx.type === 'topup' || tx.type === 'provider_payout';
  const icon =
    tx.type === 'inference_debit' ? (
      <ArrowDownLeft className="w-5 h-5" />
    ) : tx.type === 'topup' ? (
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
          <p className="font-medium">{tx.description ?? tx.type}</p>
          <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString('zh-TW')}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${isIncome ? 'text-accent' : 'text-destructive'}`}>
          {isIncome ? '+' : '-'}{Math.abs(tx.amount_gkc).toFixed(4)} GKC
        </p>
        {tx.tx_hash ? (
          <a
            href={`https://testnet.xrpl.org/transactions/${tx.tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center justify-end gap-1 transition-colors"
          >
            {tx.tx_hash.slice(0, 8)}...{tx.tx_hash.slice(-4)}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">鏈下結算中</span>
        )}
      </div>
    </div>
  );
}

