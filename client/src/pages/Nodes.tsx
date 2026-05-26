import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SAMPLE_GPU_NODES } from '@/lib/constants';
import { Activity, Zap, TrendingUp, Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const GPU_PRESETS = [
  { value: 'NVIDIA A100 80GB', fp16: 312, vram: 80, bandwidth: 2000, throughput: 100 },
  { value: 'NVIDIA RTX 4090', fp16: 165, vram: 24, bandwidth: 1008, throughput: 62 },
  { value: 'NVIDIA RTX 3090', fp16: 142, vram: 24, bandwidth: 936, throughput: 48 },
  { value: 'NVIDIA A6000', fp16: 155, vram: 48, bandwidth: 768, throughput: 55 },
  { value: 'NVIDIA V100', fp16: 125, vram: 32, bandwidth: 900, throughput: 42 },
  { value: '自訂設備', fp16: 0, vram: 0, bandwidth: 0, throughput: 0 },
];

function calcCU(fp16: number, vram: number, bandwidth: number, throughput: number) {
  return Math.round((fp16 * 0.5 + vram * 0.2 + bandwidth * 0.15 + throughput * 0.15) * 0.3);
}

function calcTier(cu: number): 'S' | 'A' | 'B' | 'C' {
  if (cu >= 90) return 'S';
  if (cu >= 60) return 'A';
  if (cu >= 30) return 'B';
  return 'C';
}

export default function Nodes() {
  const [nodes, setNodes] = useState(SAMPLE_GPU_NODES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [gpuPreset, setGpuPreset] = useState(GPU_PRESETS[0].value);
  const [customFp16, setCustomFp16] = useState('');
  const [customVram, setCustomVram] = useState('');
  const [benchmarkNodeId, setBenchmarkNodeId] = useState<string | null>(null);

  const totalRevenue = nodes.reduce((sum, node) => sum + node.revenueTotal, 0);
  const totalCU = nodes.reduce((sum, node) => sum + node.computeUnit.cuScore, 0);
  const averageUtilization =
    nodes.reduce((sum, node) => sum + node.utilization, 0) / nodes.length;

  const preset = GPU_PRESETS.find((p) => p.value === gpuPreset) ?? GPU_PRESETS[0];
  const isCustom = gpuPreset === '自訂設備';

  const handleAddNode = async () => {
    if (!nodeName.trim()) {
      toast.error('請輸入節點名稱');
      return;
    }
    const fp16 = isCustom ? Number(customFp16) : preset.fp16;
    const vram = isCustom ? Number(customVram) : preset.vram;
    const cuScore = calcCU(fp16, vram, preset.bandwidth, preset.throughput);
    const tier = calcTier(cuScore);
    const newId = 'node-' + Date.now();

    const newNode = {
      id: newId,
      name: nodeName,
      gpuType: preset.value,
      computeUnit: {
        fp16Flops: fp16,
        vramGb: vram,
        memoryBandwidth: preset.bandwidth,
        throughputTokens: preset.throughput,
        cuScore,
        tier,
      },
      status: 'benchmark_pending' as const,
      utilization: 0,
      owner: '我的節點',
      revenueToday: 0,
      revenueTotal: 0,
      lastBenchmark: new Date(),
    };

    setNodes((prev) => [...prev, newNode as unknown as typeof SAMPLE_GPU_NODES[0]]);
    setIsDialogOpen(false);
    setNodeName('');
    toast.info('節點已注冊，正在執行基準測試...');

    // Mock benchmark flow
    setBenchmarkNodeId(newId);
    await new Promise((r) => setTimeout(r, 3000));
    setNodes((prev) =>
      prev.map((n) =>
        n.id === newId
          ? { ...n, status: 'active' as const, utilization: Math.floor(Math.random() * 30) }
          : n
      )
    );
    setBenchmarkNodeId(null);
    toast.success(`基準測試完成！CU 評分: ${cuScore} · Tier ${tier}`);
  };

  const handleBenchmark = async (nodeId: string) => {
    setBenchmarkNodeId(nodeId);
    // TODO: 替換為真實 API 呼叫 — POST /api/v1/nodes/:id/benchmark
    await new Promise((r) => setTimeout(r, 2500));
    setBenchmarkNodeId(null);
    toast.success('基準測試完成！CU 評分已更新');
  };

  return (
    <Layout>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">算力節點</h1>
            <p className="text-muted-foreground mt-2">管理您的 GPU 節點與收益</p>
          </div>
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            添加節點
          </Button>
        </div>

        {/* 統計概覽 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="活躍節點"
            value={nodes.length}
            unit="個"
            icon={<Activity className="w-5 h-5" />}
          />
          <StatCard
            title="總計算單位"
            value={totalCU}
            unit="CU"
            icon={<Zap className="w-5 h-5" />}
          />
          <StatCard
            title="平均利用率"
            value={averageUtilization.toFixed(1)}
            unit="%"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <StatCard
            title="累計收益"
            value={totalRevenue.toFixed(2)}
            unit="GKC"
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>

        {/* 節點列表 */}
        <div className="space-y-4">
          {nodes.map((node) => (
            <Card key={node.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* 節點頭部 */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <h3 className="text-lg font-semibold">{node.name}</h3>
                        <Badge variant="outline">{node.gpuType}</Badge>
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                          Tier {node.computeUnit.tier}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">節點 ID: {node.id}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* 節點詳細信息網格 */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <InfoItem label="計算單位" value={`${node.computeUnit.cuScore} CU`} />
                    <InfoItem label="FP16 算力" value={`${node.computeUnit.fp16Flops} TFLOPS`} />
                    <InfoItem label="VRAM" value={`${node.computeUnit.vramGb} GB`} />
                    <InfoItem label="頻寬" value={`${node.computeUnit.memoryBandwidth} GB/s`} />
                    <InfoItem label="吞吐量" value={`${node.computeUnit.throughputTokens} tok/s`} />
                  </div>

                  {/* 利用率進度條 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">使用率</span>
                      <span className="text-sm text-muted-foreground">{node.utilization}%</span>
                    </div>
                    <Progress value={node.utilization} className="h-2" />
                  </div>

                  {/* 收益信息 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">今日收益</p>
                      <p className="font-semibold text-accent">{node.revenueToday} GKC</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">累計收益</p>
                      <p className="font-semibold">{node.revenueTotal} GKC</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">所有者</p>
                      <p className="font-semibold text-sm">{node.owner}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">最後基準測試</p>
                      <p className="font-semibold text-sm">{node.lastBenchmark.toLocaleString('zh-TW')}</p>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm">
                      查看詳情
                    </Button>
                    <Button size="sm" disabled={benchmarkNodeId === node.id} onClick={() => handleBenchmark(node.id)}>
                      {benchmarkNodeId === node.id ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          基準測試中...
                        </span>
                      ) : '運行基準測試'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 節點加入指南 */}
        <Card>
          <CardHeader>
            <CardTitle>如何添加新節點</CardTitle>
            <CardDescription>將您的 GPU 設備加入高科幣平台</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 list-decimal list-inside">
              <li className="text-sm">
                <span className="font-medium">安裝節點軟件</span>
                <p className="text-xs text-muted-foreground ml-6 mt-1">
                  下載並安裝高科幣節點客戶端，支持 Linux、macOS 和 Windows
                </p>
              </li>
              <li className="text-sm">
                <span className="font-medium">配置 GPU 環境</span>
                <p className="text-xs text-muted-foreground ml-6 mt-1">
                  確保 NVIDIA CUDA 驅動程序已安裝，版本 11.8 或更高
                </p>
              </li>
              <li className="text-sm">
                <span className="font-medium">運行基準測試</span>
                <p className="text-xs text-muted-foreground ml-6 mt-1">
                  系統將自動測試您的 GPU 性能並計算計算單位 (CU)
                </p>
              </li>
              <li className="text-sm">
                <span className="font-medium">開始貢獻</span>
                <p className="text-xs text-muted-foreground ml-6 mt-1">
                  節點上線後，您將開始獲得算力貢獻收益
                </p>
              </li>
            </ol>
            <Button className="w-full mt-4">下載節點軟件</Button>
          </CardContent>
        </Card>

      {/* 添加節點 Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加 GPU 節點</DialogTitle>
            <DialogDescription>
              提交節點視視後系統將自動執行基準測試並計算 CU 評分
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nodeName">節點名稱</Label>
              <Input
                id="nodeName"
                placeholder="例： Lab A100 Server"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>GPU 型號</Label>
              <Select value={gpuPreset} onValueChange={setGpuPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GPU_PRESETS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isCustom && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fp16">FP16 算力 (TFLOPS)</Label>
                  <Input
                    id="fp16"
                    type="number"
                    placeholder="例: 165"
                    value={customFp16}
                    onChange={(e) => setCustomFp16(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vram">VRAM (GB)</Label>
                  <Input
                    id="vram"
                    type="number"
                    placeholder="例: 24"
                    value={customVram}
                    onChange={(e) => setCustomVram(e.target.value)}
                  />
                </div>
              </div>
            )}
            {!isCustom && (
              <div className="p-3 rounded-lg bg-muted/50 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">FP16: </span>{preset.fp16} TFLOPS</div>
                <div><span className="text-muted-foreground">VRAM: </span>{preset.vram} GB</div>
                <div><span className="text-muted-foreground">预估 CU: </span><span className="font-semibold text-primary">{calcCU(preset.fp16, preset.vram, preset.bandwidth, preset.throughput)}</span></div>
                <div><span className="text-muted-foreground">Tier: </span><span className="font-semibold">{calcTier(calcCU(preset.fp16, preset.vram, preset.bandwidth, preset.throughput))}</span></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
            <Button onClick={handleAddNode}>提交節點</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, unit, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">
              {value} <span className="text-lg text-muted-foreground">{unit}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

