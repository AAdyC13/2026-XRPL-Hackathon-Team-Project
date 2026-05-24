import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Send, ArrowUpRight, ArrowDownLeft, ExternalLink, ShieldCheck, Link2, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, apiPost } from '@/hooks/api';

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
  const { user, token, updateBalance } = useAuth();
  const [xrpAddress, setXrpAddress] = useState(user?.xrpAddress ?? '');
  const [gkcBalance, setGkcBalance] = useState(user?.gkcBalance ?? 0);
  const [xrpBalance, setXrpBalance] = useState(user?.xrpBalance ?? 0);
  const [walletLoading, setWalletLoading] = useState(true);

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [trustlineSet, setTrustlineSet] = useState(false);
  const [channels, setChannels] = useState<PaymentChannelRow[]>([]);
  const [isSettingTrustline, setIsSettingTrustline] = useState(false);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(null), 2000);
    toast.success('已複製到剪貼板');
  };

  const handleSetupTrustline = async () => {
    if (!token) return;
    setIsSettingTrustline(true);
    try {
      const response = await apiPost<{ txjson: unknown }>(
        '/api/v1/wallet/trustline',
        { limit: '1000000', signWithXaman: false },
        { token }
      );
      toast.success('TrustLine 交易已準備，請使用 XRPL 錢包簽署並提交', {
        description: response.txjson ? 'txjson 已從後端取得' : undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '設定 TrustLine 失敗');
    } finally {
      setIsSettingTrustline(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    const fetchWalletData = async () => {
      setWalletLoading(true);
      try {
        const wallet = await apiFetch<{
          gkc_balance: number;
          xrp_balance: number;
          xrp_address: string | null;
          payment_channel: unknown;
        }>('/api/v1/wallet', { token });
        const balance = await apiFetch<{
          lines: Array<{ currency: string }>;
        }>('/api/v1/wallet/balance', { token });

        setGkcBalance(wallet.gkc_balance);
        setXrpBalance(wallet.xrp_balance);
        setXrpAddress(wallet.xrp_address ?? user?.xrpAddress ?? '');
        updateBalance(wallet.gkc_balance, wallet.xrp_balance);
        setTrustlineSet(balance.lines.some((line) => line.currency === 'GKC'));
        setChannels([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '讀取錢包資料失敗');
      } finally {
        setWalletLoading(false);
      }
    };

    fetchWalletData();
  }, [token, updateBalance, user?.xrpAddress]);

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">錢包</h1>
          <p className="text-muted-foreground mt-2">管理您的 GKC 與 XRP 資產</p>
        </div>

        {/* TrustLine 狀態 */}
        <Card className={trustlineSet ? 'border-accent/30' : 'border-yellow-500/50'}>
          <CardContent className="pt-5">
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
              {!trustlineSet && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSetupTrustline}
                  disabled={isSettingTrustline || walletLoading}
                >
                  {isSettingTrustline ? '準備中…' : '設定 TrustLine'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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
            <CardTitle>交易歷史</CardTitle>
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
          <p className="font-medium">{tx.description}</p>
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

