import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SAMPLE_GPU_NODES } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowUpRight, ArrowDownLeft, Zap, Activity, Wallet } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'wouter';

// 示例數據
const chartData = [
  { time: '00:00', usage: 120, cost: 45 },
  { time: '04:00', usage: 140, cost: 52 },
  { time: '08:00', usage: 200, cost: 75 },
  { time: '12:00', usage: 180, cost: 68 },
  { time: '16:00', usage: 220, cost: 82 },
  { time: '20:00', usage: 190, cost: 71 },
  { time: '24:00', usage: 150, cost: 56 },
];

const revenueData = [
  { date: '周一', revenue: 125.5 },
  { date: '周二', revenue: 142.3 },
  { date: '周三', revenue: 98.7 },
  { date: '周四', revenue: 167.2 },
  { date: '周五', revenue: 189.4 },
  { date: '周六', revenue: 156.8 },
  { date: '周日', revenue: 143.2 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const gkcDisplay = user?.gkcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—';
  const xrpDisplay = user?.xrpBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—';

  const showWalletBanner = user?.verificationStatus === 'verified' && !user?.xrpAddress;

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-display font-bold">儀表板</h1>
          <p className="text-muted-foreground mt-2">
            錢包餘額來自後端帳號；圖表與節點統計待 Phase 2+ API
          </p>
        </div>

        {/* 錢包綁定引導 Banner */}
        {showWalletBanner && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/15 text-primary shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">帳號已通過驗證！</p>
                    <p className="text-sm text-muted-foreground">前往錢包頁面綁定 Xaman 錢包，即可啟用 GKC 功能。</p>
                  </div>
                </div>
                <Link href="/wallet">
                  <Button size="sm" className="shrink-0">前往綁定</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 統計卡片網格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="GKC 餘額"
            value={gkcDisplay}
            unit="GKC"
            icon={<ArrowDownLeft className="w-5 h-5" />}
            trend="即時（/auth/me）"
            trendDirection="neutral"
          />
          <StatCard
            title="XRP 餘額"
            value={xrpDisplay}
            unit="XRP"
            icon={<Zap className="w-5 h-5" />}
            trend="即時（/auth/me）"
            trendDirection="neutral"
          />
          <StatCard
            title="本月收益"
            value="—"
            unit="GKC"
            icon={<ArrowUpRight className="w-5 h-5" />}
            trend="待統計 API"
            trendDirection="neutral"
          />
          <StatCard
            title="活躍節點"
            value="3"
            unit="個"
            icon={<Activity className="w-5 h-5" />}
            trend="穩定"
            trendDirection="neutral"
          />
        </div>

        {/* 圖表區域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 使用趨勢 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                今日使用趨勢
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 text-xs font-semibold">DEMO</Badge>
              </CardTitle>
              <CardDescription>示例圖表 — 待 /api/v1/stats（Phase 2+）</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="time" stroke="#a0aec0" />
                  <YAxis stroke="#a0aec0" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1f2e',
                      border: '1px solid #2d3748',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="usage"
                    stroke="#0066FF"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 收益趨勢 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                本週收益
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 text-xs font-semibold">DEMO</Badge>
              </CardTitle>
              <CardDescription>算力貢獻收益統計（示例數據）</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="date" stroke="#a0aec0" />
                  <YAxis stroke="#a0aec0" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1f2e',
                      border: '1px solid #2d3748',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 活躍節點 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              活躍算力節點
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 text-xs font-semibold">DEMO</Badge>
            </CardTitle>
            <CardDescription>您的 GPU 節點實時狀態（示例數據）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {SAMPLE_GPU_NODES.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <div>
                        <p className="font-medium">{node.name}</p>
                        <p className="text-sm text-muted-foreground">{node.gpuType}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">{node.utilization}%</p>
                      <p className="text-xs text-muted-foreground">使用率</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-accent">{node.revenueToday} GKC</p>
                      <p className="text-xs text-muted-foreground">今日收益</p>
                    </div>
                    <Badge variant="outline">CU: {node.computeUnit.cuScore}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  trend: string;
  trendDirection: 'up' | 'down' | 'neutral';
}

function StatCard({ title, value, unit, icon, trend, trendDirection }: StatCardProps) {
  const trendColor =
    trendDirection === 'up'
      ? 'text-accent'
      : trendDirection === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">
              {value} <span className="text-lg text-muted-foreground">{unit}</span>
            </p>
            <p className={`text-xs mt-2 font-medium ${trendColor}`}>{trend}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

