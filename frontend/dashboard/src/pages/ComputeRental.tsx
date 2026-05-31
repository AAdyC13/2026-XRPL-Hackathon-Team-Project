import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { SAMPLE_GPU_NODES, PRICING } from '@/lib/constants';
import { Server, Clock, Zap, DollarSign, CheckCircle, AlertCircle, Lock, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ActiveRental {
  id: string;
  node: (typeof SAMPLE_GPU_NODES)[0];
  duration: number;
  totalCost: number;
  startTime: Date;
  escrowId: string;
  status: 'pending' | 'active' | 'settled';
}

const DURATIONS = [
  { value: '1', label: '1 小時' },
  { value: '4', label: '4 小時' },
  { value: '8', label: '8 小時' },
  { value: '24', label: '24 小時' },
  { value: '168', label: '7 天' },
];

const MOCK_RENTALS: ActiveRental[] = [
  {
    id: 'rent-001',
    node: SAMPLE_GPU_NODES[0],
    duration: 8,
    totalCost: 800,
    startTime: new Date(Date.now() - 3600000 * 5),
    escrowId: 'E2E519ABC8F1D4C3B7A9E6F2D5C8B1A4E7F3D9C6B2A8E5F1D4C7B3A9E6F2D8C5',
    status: 'active',
  },
];

export default function ComputeRental() {
  const [selectedNode, setSelectedNode] = useState<(typeof SAMPLE_GPU_NODES)[0] | null>(null);
  const [duration, setDuration] = useState('4');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRenting, setIsRenting] = useState(false);
  const [rentals, setRentals] = useState<ActiveRental[]>(MOCK_RENTALS);

  const pricePerHour = selectedNode ? selectedNode.computeUnit.cuScore * PRICING.computeRental.baseCostPerCUHour : 0;
  const totalCost = pricePerHour * Number(duration);

  const handleRent = async () => {
    if (!selectedNode) return;
    setIsRenting(true);
    // TODO: 替換為真實 API 呼叫 — POST /api/v1/escrow/create
    await new Promise((r) => setTimeout(r, 1500));
    const newId = 'rent-' + Date.now();
    const newRental: ActiveRental = {
      id: newId,
      node: selectedNode,
      duration: Number(duration),
      totalCost,
      startTime: new Date(),
      escrowId: Array.from({ length: 64 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join(''),
      status: 'pending',
    };
    setRentals((prev) => [newRental, ...prev]);
    setIsRenting(false);
    setIsDialogOpen(false);
    toast.success('Escrow 已建立，等待節點確認...');
    setTimeout(() => {
      setRentals((prev) =>
        prev.map((r) => (r.id === newId ? { ...r, status: 'active' } : r))
      );
      toast.success('節點已接受租用，算力已啟動！');
    }, 2500);
  };

  const handleConfirmDelivery = (rentalId: string) => {
    setRentals((prev) =>
      prev.map((r) => (r.id === rentalId ? { ...r, status: 'settled' } : r))
    );
    toast.success('已確認算力交付，Escrow 款項已結算至節點所有者');
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="hidden lg:block">
          <h1 className="text-3xl font-display font-bold">算力出租市場</h1>
          <p className="text-muted-foreground mt-2">
            租用 GPU 節點進行模型訓練或微調，費用透過 XRPL Escrow 保障雙方權益
          </p>
        </div>

        {/* XRPL Escrow 說明 */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex gap-3">
          <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground mb-1">XRPL Escrow 保障機制</p>
            <p className="text-muted-foreground">
              租用費用鎖定於 XRPL Escrow 智能合約中，僅在您確認算力交付後才釋放給節點所有者。
              租用期間若節點離線，費用將自動退回您的帳戶。所有操作均記錄於區塊鏈，公開透明可查。
            </p>
          </div>
        </div>

        {/* 可用節點 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">可用節點</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {SAMPLE_GPU_NODES.map((node) => {
              const hourlyRate = node.computeUnit.cuScore * PRICING.computeRental.baseCostPerCUHour;
              return (
                <Card key={node.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{node.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">{node.gpuType}</CardDescription>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        <Badge className="bg-primary/20 text-primary text-xs">
                          Tier {node.computeUnit.tier}
                        </Badge>
                        <Badge
                          variant={node.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {node.status === 'active' ? '可用' : '佔用'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{node.computeUnit.cuScore} CU</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Server className="w-3.5 h-3.5" />
                        <span>{node.computeUnit.vramGb} GB VRAM</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{node.computeUnit.throughputTokens} tok/s</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{hourlyRate} GKC/h</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>當前使用率</span>
                        <span>{node.utilization}%</span>
                      </div>
                      <Progress value={node.utilization} className="h-1.5" />
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      disabled={node.status !== 'active'}
                      onClick={() => {
                        setSelectedNode(node);
                        setIsDialogOpen(true);
                      }}
                    >
                      租用此節點
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 我的租用記錄 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">我的租用記錄</h2>
          {rentals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                尚無租用記錄
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rentals.map((rental) => (
                <RentalCard
                  key={rental.id}
                  rental={rental}
                  onConfirmDelivery={handleConfirmDelivery}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 租用 Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>租用算力節點</DialogTitle>
            <DialogDescription>
              費用將通過 XRPL Escrow 鎖定，確認算力交付後自動釋放
            </DialogDescription>
          </DialogHeader>
          {selectedNode && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="font-semibold">{selectedNode.name}</p>
                <p className="text-sm text-muted-foreground">{selectedNode.gpuType}</p>
                <div className="flex gap-4 text-sm pt-2">
                  <span>{selectedNode.computeUnit.cuScore} CU</span>
                  <span>{selectedNode.computeUnit.vramGb} GB VRAM</span>
                  <Badge className="bg-primary/20 text-primary text-xs">
                    Tier {selectedNode.computeUnit.tier}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">租用時長</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">單價</span>
                  <span>{pricePerHour} GKC / 小時</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">時長</span>
                  <span>{duration} 小時</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Escrow 鎖定總額</span>
                  <span className="text-primary">{totalCost.toLocaleString()} GKC</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRent} disabled={isRenting}>
              {isRenting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  建立 Escrow...
                </span>
              ) : (
                '確認租用'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

interface RentalCardProps {
  rental: ActiveRental;
  onConfirmDelivery: (id: string) => void;
}

function RentalCard({ rental, onConfirmDelivery }: RentalCardProps) {
  const statusConfig = {
    pending: {
      label: '等待節點確認',
      color: 'bg-yellow-500/20 text-yellow-500',
      icon: <AlertCircle className="w-4 h-4" />,
    },
    active: {
      label: '使用中',
      color: 'bg-accent/20 text-accent',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    settled: {
      label: '已結算',
      color: 'bg-muted text-muted-foreground',
      icon: <CheckCircle className="w-4 h-4" />,
    },
  };

  const cfg = statusConfig[rental.status];
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - rental.startTime.getTime()) / 3600000)
  );
  const remaining = Math.max(0, rental.duration - elapsed);
  const progress = Math.min(100, (elapsed / rental.duration) * 100);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold">{rental.node.name}</p>
            <p className="text-sm text-muted-foreground">{rental.node.gpuType}</p>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                Escrow: {rental.escrowId.slice(0, 16)}...
              </code>
              <a
                href={`https://testnet.xrpl.org/transactions/${rental.escrowId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                鏈上查詢
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}
          >
            {cfg.icon}
            {cfg.label}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>已使用 {elapsed}h / {rental.duration}h</span>
            <span>剩餘 {remaining}h</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            鎖定費用：
            <span className="text-foreground font-semibold ml-1">
              {rental.totalCost.toLocaleString()} GKC
            </span>
          </span>
          {rental.status === 'active' && (
            <Button size="sm" onClick={() => onConfirmDelivery(rental.id)}>
              確認算力交付
            </Button>
          )}
          {rental.status === 'settled' && (
            <span className="text-sm text-accent font-medium">✓ 已結算</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
