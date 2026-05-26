import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpRight, ArrowDownLeft, Send, Zap, Search, Download, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const ALL_TRANSACTIONS = [
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
  {
    id: '5',
    type: 'inference',
    amount: 0.28,
    currency: 'GKC',
    description: 'AI 推論 - Qwen 7B',
    status: 'pending',
    timestamp: new Date(Date.now() - 300000),
    txHash: 'C7F3E1D9B4A6F2C5E8D1B7A4F3C9E6D2B5A8F1C4E7D3B9A2F6C5E8D4B1A7F3C2',
  },
  {
    id: '6',
    type: 'reward',
    amount: 85.3,
    currency: 'GKC',
    description: '算力貢獻收益',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 259200000),
    txHash: 'D1A8C5F2E7D3B9A4F6C1E8D5B2A7F4C9E3D6B1A5F8C2E7D4B3A9F5C1E8D6B2A4',
  },
];

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = ALL_TRANSACTIONS.filter(
    (tx) =>
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inferences = filteredTransactions.filter((tx) => tx.type === 'inference');
  const rewards = filteredTransactions.filter((tx) => tx.type === 'reward');
  const transfers = filteredTransactions.filter((tx) => tx.type === 'transfer');
  const swaps = filteredTransactions.filter((tx) => tx.type === 'swap');

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">交易記錄</h1>
            <p className="text-muted-foreground mt-2">查看所有 GKC 與 XRP 交易</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            導出記錄
          </Button>
        </div>

        {/* Demo 資料提示 */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-yellow-500/40 bg-yellow-500/5 text-sm text-yellow-600 dark:text-yellow-400">
          <Badge variant="outline" className="border-yellow-500/60 text-yellow-600 dark:text-yellow-400 text-xs font-bold shrink-0">DEMO</Badge>
          <span>以下為示例資料，交易紀錄 API（Phase 2+）上線後將替換為真實交易。</span>
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
            value={ALL_TRANSACTIONS.filter((tx) => tx.status === 'pending').length}
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
  tx: (typeof ALL_TRANSACTIONS)[0];
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
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 text-xs font-semibold">
          DEMO
        </Badge>
        <div className="text-right">
          <p className={`font-semibold ${isIncome ? 'text-accent' : 'text-destructive'}`}>
            {isIncome ? '+' : '-'}{tx.amount} {tx.currency}
          </p>
          <a
            href={`https://testnet.xrpl.org/transactions/${tx.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-4)}
            <ExternalLink className="w-3 h-3" />
          </a>
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

