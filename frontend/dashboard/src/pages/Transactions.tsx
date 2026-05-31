import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpRight, ArrowDownLeft, Send, Zap, Search, Download, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TxRow {
  id: string;
  type: string;
  amount_gkc: number;
  balance_after: number;
  reference_id: string | null;
  tx_hash: string | null;
  description: string;
  created_at: string;
}

export default function Transactions() {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [txRows, setTxRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/v1/wallet/transactions?limit=100', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { transactions: TxRow[] }) => setTxRows(data.transactions ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  const ALL_TRANSACTIONS = txRows.map(r => ({
    id: r.id,
    type: r.type,
    amount: r.amount_gkc,
    currency: 'GKC',
    description: r.description,
    status: 'confirmed' as const,
    timestamp: new Date(r.created_at),
    txHash: r.tx_hash,
  }));

  const filteredTransactions = ALL_TRANSACTIONS.filter(
    (tx) =>
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.txHash ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inferences = filteredTransactions.filter((tx) => tx.type === 'inference_debit' || tx.type === 'inference');
  const rewards = filteredTransactions.filter((tx) => tx.type === 'topup' || tx.type === 'reward');
  const transfers = filteredTransactions.filter((tx) => tx.type === 'transfer' || tx.type === 'channel_open' || tx.type === 'channel_close');
  const swaps = filteredTransactions.filter((tx) => tx.type === 'provider_payout' || tx.type === 'swap');

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div className="hidden lg:block">
            <h1 className="text-3xl font-display font-bold">交易記錄</h1>
            <p className="text-muted-foreground mt-2">查看所有 GKC 與 XRP 交易</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => {
            if (!token) return;
            setLoading(true);
            fetch('/api/v1/wallet/transactions?limit=100', {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(r => r.json())
              .then((data: { transactions: TxRow[] }) => setTxRows(data.transactions ?? []))
              .finally(() => setLoading(false));
          }}>
            <Download className="w-4 h-4" />
            {loading ? '載入中…' : '重新整理'}
          </Button>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="總交易數"
            value={ALL_TRANSACTIONS.length}
            unit="筆"
          />
          <StatCard
            label="推論交易"
            value={inferences.length}
            unit="筆"
          />
          <StatCard
            label="收益交易"
            value={rewards.length}
            unit="筆"
          />
          <StatCard
            label="待確認"
            value={0}
            unit="筆"
          />
        </div>

        {/* 搜索與篩選 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索交易描述或 TX Hash..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 交易列表 */}
        <Card>
          <CardHeader>
            <CardTitle>交易詳情</CardTitle>
            <CardDescription>所有平台交易記錄</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">全部 ({filteredTransactions.length})</TabsTrigger>
                <TabsTrigger value="inference">推論 ({inferences.length})</TabsTrigger>
                <TabsTrigger value="reward">收益 ({rewards.length})</TabsTrigger>
                <TabsTrigger value="transfer">轉賬 ({transfers.length})</TabsTrigger>
                <TabsTrigger value="swap">兌換 ({swaps.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">沒有找到相關交易</div>
                )}
              </TabsContent>

              <TabsContent value="inference" className="space-y-3 mt-4">
                {inferences.length > 0 ? (
                  inferences.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">沒有推論交易</div>
                )}
              </TabsContent>

              <TabsContent value="reward" className="space-y-3 mt-4">
                {rewards.length > 0 ? (
                  rewards.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">沒有收益交易</div>
                )}
              </TabsContent>

              <TabsContent value="transfer" className="space-y-3 mt-4">
                {transfers.length > 0 ? (
                  transfers.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">沒有轉賬交易</div>
                )}
              </TabsContent>

              <TabsContent value="swap" className="space-y-3 mt-4">
                {swaps.length > 0 ? (
                  swaps.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">沒有兌換交易</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  unit: string;
}

function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-2">{label}</p>
        <p className="text-2xl font-bold">
          {value} <span className="text-lg text-muted-foreground">{unit}</span>
        </p>
      </CardContent>
    </Card>
  );
}

interface TransactionRowProps {
  tx: {
    id: string; type: string; amount: number; currency: string;
    description: string; status: string; timestamp: Date; txHash: string | null;
  };
}

function TransactionRow({ tx }: TransactionRowProps) {
  const isIncome = tx.type === 'reward';
  const icon =
    tx.type === 'inference' ? (
      <Zap className="w-5 h-5" />
    ) : tx.type === 'reward' ? (
      <ArrowUpRight className="w-5 h-5" />
    ) : tx.type === 'transfer' ? (
      <Send className="w-5 h-5" />
    ) : (
      <ArrowDownLeft className="w-5 h-5" />
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
        <div className="flex-1">
          <p className="font-medium">{tx.description}</p>
          <p className="text-xs text-muted-foreground">{tx.timestamp.toLocaleString('zh-TW')}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`font-semibold ${isIncome ? 'text-accent' : 'text-destructive'}`}>
            {isIncome ? '+' : '-'}{tx.amount} {tx.currency}
          </p>
          {tx.txHash && /^[0-9A-Fa-f]{64}$/.test(tx.txHash) ? (
            <a
              href={`https://testnet.xrpl.org/transactions/${tx.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-4)}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground italic">— 鏈下</span>
          )}
        </div>
        <Badge
          variant={tx.status === 'confirmed' ? 'default' : 'outline'}
          className={tx.status === 'confirmed' ? 'bg-accent/20 text-accent hover:bg-accent/30' : ''}
        >
          {tx.status === 'confirmed' ? '已確認' : '待確認'}
        </Badge>
      </div>
    </div>
  );
}

