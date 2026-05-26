/**
 * client/src/pages/Demo.tsx
 * ─────────────────────────────────────────────────────
 * Guided demo page: Trust Line → Check → AI Inference → On-chain Settlement
 *
 * Each stage shows a status dot (idle / loading / done / error),
 * relevant TX hashes with testnet.xrpl.org links, and a Merkle tree
 * visualisation after settlement.
 */

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Wallet,
  Link2,
  Zap,
  GitMerge,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/lib/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPLORER = (hash: string, type: 'transactions' | 'objects' = 'transactions') =>
  `https://testnet.xrpl.org/${type}/${hash}`;

const DEMO_PROVIDER_ID = 'prov-001';   // seeded provider, owner = demo user
const DEMO_MODEL      = 'cheapest/llama3:8b'; // routing strategy / model in DB
const DEMO_PROMPTS = [
  '用一句話解釋區塊鏈',
  '什麼是智能合約？',
  '為什麼比特幣有價值？',
];

// ── Types ─────────────────────────────────────────────────────────────────────

type StageStatus = 'idle' | 'loading' | 'done' | 'error';

interface WalletInfo {
  address: string;
  gkcBalance: number;
  onChainBalance: number | null;
  trustLineExists: boolean;
}

interface CheckInfo {
  checkId: string;
  xrplCheckId: string;
  sendMaxGkc: number;
  createTxHash?: string;
}

interface LeafRecord {
  seq: number;
  leaf_hash: string;
  cost_gkc: number;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

interface SessionInfo {
  id: string;
  records: LeafRecord[];
  totalCostGkc: number;
}

interface SettleResult {
  txHash: string;
  merkleRoot: string;
  totalCostGkc: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(s: string, n = 12) {
  return s.length <= n * 2 + 3 ? s : `${s.slice(0, n)}…${s.slice(-n)}`;
}

function apiFetch(token: string, path: string, opts?: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts?.headers as Record<string, string>),
    },
  });
}

// ── Stage dot ─────────────────────────────────────────────────────────────────

function StageDot({ status }: { status: StageStatus }) {
  if (status === 'done')
    return <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />;
  if (status === 'loading')
    return <Loader2 className="w-6 h-6 text-primary animate-spin shrink-0" />;
  if (status === 'error')
    return <XCircle className="w-6 h-6 text-destructive shrink-0" />;
  return <Circle className="w-6 h-6 text-muted-foreground shrink-0" />;
}

// ── Explorer link ─────────────────────────────────────────────────────────────

function TxLink({ hash, type = 'transactions', label }: { hash: string; type?: 'transactions' | 'objects'; label?: string }) {
  return (
    <a
      href={EXPLORER(hash, type)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
    >
      {label ?? truncate(hash)}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

// ── Merkle Tree ───────────────────────────────────────────────────────────────

function MerkleTree({ root, leaves }: { root: string; leaves: LeafRecord[] }) {
  const [expanded, setExpanded] = useState(true);

  // Compute internal nodes for a simple visual (just show pairwise grouping)
  const pairs: Array<{ left: string; right?: string; parent: string }> = [];
  for (let i = 0; i < leaves.length; i += 2) {
    const l = leaves[i].leaf_hash;
    const r = leaves[i + 1]?.leaf_hash;
    // We don't recompute hashes client-side; just show the pairing
    pairs.push({ left: l, right: r });
  }

  return (
    <div className="mt-4 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-primary" />
          Merkle Tree 可視化
          <Badge variant="secondary" className="text-xs">{leaves.length} 葉節點</Badge>
        </span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Root */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Merkle Root</div>
            <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 font-mono text-xs text-primary text-center break-all max-w-lg">
              {root}
            </div>
          </div>

          {/* Connector line */}
          {leaves.length > 1 && (
            <div className="flex justify-center">
              <div className="w-px h-6 bg-border" />
            </div>
          )}

          {/* Intermediate level (pairs) */}
          {leaves.length > 1 && (
            <>
              <div className="flex items-start justify-center gap-3 flex-wrap">
                {pairs.map((p, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="px-3 py-1.5 rounded-md bg-secondary/20 border border-secondary/40 font-mono text-[10px] text-muted-foreground text-center">
                      {p.right ? `H(${i * 2 + 1},${i * 2 + 2})` : `H(${i * 2 + 1})`}
                    </div>
                    <div className="flex gap-3 mt-1">
                      <div className="w-px h-4 bg-border mx-auto" />
                      {p.right && <div className="w-px h-4 bg-border mx-auto" />}
                    </div>
                    <div className="flex gap-2">
                      {/* Left leaf */}
                      <LeafNode leaf={leaves[i * 2]} />
                      {/* Right leaf (if exists) */}
                      {p.right && leaves[i * 2 + 1] && <LeafNode leaf={leaves[i * 2 + 1]} />}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Single leaf: show it directly */}
          {leaves.length === 1 && (
            <div className="flex justify-center">
              <LeafNode leaf={leaves[0]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LeafNode({ leaf }: { leaf: LeafRecord }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-center space-y-0.5">
        <div className="font-mono text-muted-foreground">seq={leaf.seq}</div>
        <div className="font-mono text-emerald-600 dark:text-emerald-400">{truncate(leaf.leaf_hash, 8)}</div>
        <div className="text-muted-foreground">{Number(leaf.cost_gkc).toFixed(7)} GKC</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Demo() {
  const { token } = useAuth();

  // Stage statuses
  const [s1, setS1] = useState<StageStatus>('idle');
  const [s2, setS2] = useState<StageStatus>('idle');
  const [s3, setS3] = useState<StageStatus>('idle');
  const [s4, setS4] = useState<StageStatus>('idle');

  // Stage data
  const [wallet, setWallet]     = useState<WalletInfo | null>(null);
  const [check, setCheck]       = useState<CheckInfo | null>(null);
  const [session, setSession]   = useState<SessionInfo | null>(null);
  const [settle, setSettle]     = useState<SettleResult | null>(null);
  const [inferLog, setInferLog] = useState<string[]>([]);

  // ── Stage 1: Load wallet ────────────────────────────────────────────────────

  const runStage1 = useCallback(async () => {
    setS1('loading');
    try {
      const res = await apiFetch(token!, '/api/v1/wallet/balance');
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? res.statusText);
      const data = await res.json() as {
        xrpAddress?: string;
        dbBalance?: number;
        onChainBalance?: number | null;
        hasTrustLine?: boolean;
      };

      setWallet({
        address: data.xrpAddress ?? '—',
        gkcBalance: data.dbBalance ?? 0,
        onChainBalance: data.onChainBalance ?? null,
        trustLineExists: data.hasTrustLine ?? false,
      });
      setS1('done');
      toast.success('錢包資訊已載入');
    } catch (err) {
      setS1('error');
      toast.error(`Stage 1 失敗: ${(err as Error).message}`);
    }
  }, [token]);

  // ── Stage 2: Create real Check ──────────────────────────────────────────────

  const runStage2 = useCallback(async () => {
    setS2('loading');
    try {
      const res = await apiFetch(token!, '/api/v1/wallet/check/dev-real-create', {
        method: 'POST',
        body: JSON.stringify({ send_max_gkc: 50 }),
      });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? res.statusText);
      const data = await res.json() as {
        check_id: string;
        xrpl_check_id: string;
        send_max_gkc: number;
        create_tx_hash: string;
      };

      setCheck({
        checkId: data.check_id,
        xrplCheckId: data.xrpl_check_id,
        sendMaxGkc: data.send_max_gkc,
        createTxHash: data.create_tx_hash,
      });
      setS2('done');
      toast.success(`Check 已建立：${data.send_max_gkc} GKC`);
    } catch (err) {
      setS2('error');
      toast.error(`Stage 2 失敗: ${(err as Error).message}`);
    }
  }, [token]);

  // ── Stage 3: Session + inferences ──────────────────────────────────────────

  const runStage3 = useCallback(async () => {
    setS3('loading');
    setInferLog([]);
    try {
      // Always resolve the active check from the server (survives page refresh)
      const ckRes = await apiFetch(token!, '/api/v1/wallet/check/active');
      const ckData = await ckRes.json() as { active: boolean; check?: { id: string } };
      const activeCheckId = ckData.active ? ckData.check?.id : undefined;

      if (!activeCheckId) {
        throw new Error('尚無有效 Check — 請先完成 Stage 2');
      }

      // Open session — link the active check so settle can do CheckCash
      const sRes = await apiFetch(token!, '/api/v1/sessions/open', {
        method: 'POST',
        body: JSON.stringify({
          provider_id: DEMO_PROVIDER_ID,
          model: DEMO_MODEL,
          check_id: activeCheckId,
        }),
      });
      if (!sRes.ok) throw new Error((await sRes.json() as { error?: string }).error ?? sRes.statusText);
      const sData = await sRes.json() as { session_id: string };
      const sessionId = sData.session_id;

      // Run 3 inferences sequentially
      for (let i = 0; i < DEMO_PROMPTS.length; i++) {
        setInferLog(prev => [...prev, `[${i + 1}/3] 傳送：「${DEMO_PROMPTS[i]}」…`]);

        const iRes = await apiFetch(token!, '/v1/chat/completions', {
          method: 'POST',
          headers: { 'X-Session-ID': sessionId },
          body: JSON.stringify({
            model: DEMO_MODEL,
            messages: [{ role: 'user', content: DEMO_PROMPTS[i] }],
            stream: false,
          }),
        });
        if (!iRes.ok) {
          const e = await iRes.json() as { error?: string };
          throw new Error(e.error ?? iRes.statusText);
        }

        setInferLog(prev => {
          const next = [...prev];
          next[next.length - 1] = `[${i + 1}/3] ✓ 「${DEMO_PROMPTS[i]}」完成`;
          return next;
        });
      }

      // Fetch session records (leaf hashes)
      const rRes = await apiFetch(token!, `/api/v1/sessions/${sessionId}/records`);
      const rData = await rRes.json() as { session: { total_cost_gkc?: number }; records: LeafRecord[] };
      const records: LeafRecord[] = rData.records ?? [];

      setSession({
        id: sessionId,
        records,
        totalCostGkc: rData.session?.total_cost_gkc ?? 0,
      });
      setS3('done');
      toast.success(`${records.length} 筆請求完成，Merkle 葉節點已記錄`);
    } catch (err) {
      setS3('error');
      toast.error(`Stage 3 失敗: ${(err as Error).message}`);
    }
  }, [token]);

  // ── Stage 4: Settle ─────────────────────────────────────────────────────────

  const runStage4 = useCallback(async () => {
    if (!session) return;
    setS4('loading');
    try {
      const res = await apiFetch(token!, `/api/v1/sessions/${session.id}/settle`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? res.statusText);
      const data = await res.json() as {
        tx_hash?: string;
        merkle_root?: string;
        total_cost?: number;
      };

      setSettle({
        txHash: data.tx_hash ?? '',
        merkleRoot: data.merkle_root ?? '',
        totalCostGkc: data.total_cost ?? 0,
      });
      setS4('done');
      toast.success('結算成功！TX 已上鏈');
    } catch (err) {
      setS4('error');
      toast.error(`Stage 4 失敗: ${(err as Error).message}`);
    }
  }, [token, session]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const stages = [
    {
      num: 1,
      status: s1,
      icon: <Wallet className="w-5 h-5" />,
      title: 'Stage 1 — 信任線設置',
      subtitle: '確認 GKC 信任線已建立，載入錢包資訊',
    },
    {
      num: 2,
      status: s2,
      icon: <Link2 className="w-5 h-5" />,
      title: 'Stage 2 — Check 授信',
      subtitle: '在 XRPL 建立真實 CheckCreate TX，授權 50 GKC 給平台',
    },
    {
      num: 3,
      status: s3,
      icon: <Zap className="w-5 h-5" />,
      title: 'Stage 3 — AI 計量使用',
      subtitle: '開啟 Session，發送 3 筆 AI 推論，記錄 Merkle 葉節點',
    },
    {
      num: 4,
      status: s4,
      icon: <GitMerge className="w-5 h-5" />,
      title: 'Stage 4 — 鏈上結算',
      subtitle: '執行 CheckCash + Merkle Root 上鏈，取得結算 TX Hash',
    },
  ];

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold">GKC 完整鏈上流程</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            四個階段展示 Trust Line → Check 授信 → AI 計量 → 鏈上結算
          </p>
        </div>

        {/* Stage 1 */}
        <StageCard
          {...stages[0]}
          active={s1 !== 'done'}
          action={
            <Button onClick={runStage1} disabled={s1 === 'loading' || s1 === 'done'} size="sm">
              {s1 === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {s1 === 'done' ? '已完成' : '載入錢包'}
            </Button>
          }
        >
          {wallet && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
              <DataRow label="XRP 地址">
                <TxLink hash={wallet.address} type="objects" label={truncate(wallet.address)} />
              </DataRow>
              <DataRow label="平台 GKC 餘額">
                <span className="font-mono">{wallet.gkcBalance.toLocaleString()} GKC</span>
              </DataRow>
              <DataRow label="鏈上 GKC 餘額">
                <span className="font-mono">
                  {wallet.onChainBalance != null ? `${wallet.onChainBalance} GKC` : '—'}
                </span>
              </DataRow>
              <DataRow label="Trust Line">
                {wallet.trustLineExists
                  ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">已設定</Badge>
                  : <Badge variant="secondary">未設定</Badge>}
              </DataRow>
            </dl>
          )}
        </StageCard>

        {/* Stage 2 */}
        <StageCard
          {...stages[1]}
          active={s1 === 'done' && s2 !== 'done'}
          action={
            <Button
              onClick={runStage2}
              disabled={s1 !== 'done' || s2 === 'loading' || s2 === 'done'}
              size="sm"
            >
              {s2 === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {s2 === 'loading' ? '建立中…（約 4s）' : s2 === 'done' ? '已完成' : '建立真實 Check (50 GKC)'}
            </Button>
          }
        >
          {check && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
              <DataRow label="Check ID (DB)">
                <span className="font-mono text-xs">{truncate(check.checkId, 10)}</span>
              </DataRow>
              <DataRow label="SendMax">
                <span className="font-mono">{check.sendMaxGkc} GKC</span>
              </DataRow>
              <DataRow label="XRPL Check ID">
                <TxLink hash={check.xrplCheckId} type="objects" />
              </DataRow>
              {check.createTxHash && (
                <DataRow label="CheckCreate TX">
                  <TxLink hash={check.createTxHash} />
                </DataRow>
              )}
            </dl>
          )}
        </StageCard>

        {/* Stage 3 */}
        <StageCard
          {...stages[2]}
          active={s2 === 'done' && s3 !== 'done'}
          action={
            <Button
              onClick={runStage3}
              disabled={s2 !== 'done' || s3 === 'loading' || s3 === 'done'}
              size="sm"
            >
              {s3 === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {s3 === 'loading' ? '推論中…' : s3 === 'done' ? '已完成' : '發送 3 筆 AI 推論'}
            </Button>
          }
        >
          {inferLog.length > 0 && (
            <div className="mt-3 rounded-md bg-muted/40 border border-border px-3 py-2 space-y-1">
              {inferLog.map((line, i) => (
                <p key={i} className="text-xs font-mono text-muted-foreground">{line}</p>
              ))}
            </div>
          )}
          {session && session.records.length > 0 && (
            <div className="mt-3 space-y-2">
              <Separator />
              <p className="text-xs text-muted-foreground font-medium mt-2">Merkle 葉節點</p>
              {session.records.map(r => (
                <div
                  key={r.seq}
                  className="flex items-center gap-3 text-xs bg-muted/30 rounded px-3 py-1.5 font-mono"
                >
                  <Badge variant="outline" className="text-[10px] shrink-0">seq={r.seq}</Badge>
                  <span className="text-muted-foreground truncate">{r.leaf_hash}</span>
                  <span className="shrink-0 text-emerald-600 dark:text-emerald-400">
                    {r.cost_gkc.toFixed(7)} GKC
                  </span>
                </div>
              ))}
              <div className="text-xs text-right text-muted-foreground pt-1">
                Total: <span className="font-mono text-foreground">{session.totalCostGkc.toFixed(6)} GKC</span>
              </div>
            </div>
          )}
        </StageCard>

        {/* Stage 4 */}
        <StageCard
          {...stages[3]}
          active={s3 === 'done' && s4 !== 'done'}
          action={
            <Button
              onClick={runStage4}
              disabled={s3 !== 'done' || s4 === 'loading' || s4 === 'done'}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {s4 === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {s4 === 'loading' ? '上鏈中…（約 4s）' : s4 === 'done' ? '已結算' : '執行鏈上結算'}
            </Button>
          }
        >
          {settle && (
            <div className="mt-3 space-y-4">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <DataRow label="CheckCash TX">
                  {/^[0-9A-Fa-f]{64}$/.test(settle.txHash)
                    ? <TxLink hash={settle.txHash} />
                    : <span className="text-muted-foreground text-xs italic">{settle.txHash || '— (custodial / no XRPL TX)'}</span>}
                </DataRow>
                <DataRow label="總費用">
                  <span className="font-mono">{settle.totalCostGkc.toFixed(6)} GKC</span>
                </DataRow>
                <DataRow label="Merkle Root">
                  <span className="font-mono text-xs break-all">{truncate(settle.merkleRoot)}</span>
                </DataRow>
              </dl>

              {/^[0-9A-Fa-f]{64}$/.test(settle.txHash) && (
                <a
                  href={EXPLORER(settle.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  在 XRPL Testnet Explorer 查看 TX
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {session && settle.merkleRoot && (
                <MerkleTree root={settle.merkleRoot} leaves={session.records} />
              )}
            </div>
          )}
        </StageCard>
      </div>
    </Layout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StageCardProps {
  num: number;
  status: StageStatus;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  action: React.ReactNode;
  children?: React.ReactNode;
}

function StageCard({ num, status, icon, title, subtitle, active, action, children }: StageCardProps) {
  const ringClass =
    status === 'done'
      ? 'ring-emerald-500/30 bg-emerald-500/5'
      : active
        ? 'ring-primary/40 bg-primary/5'
        : 'ring-border bg-card';

  return (
    <Card className={`ring-1 transition-all duration-300 ${ringClass}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {/* Stage number + dot */}
            <div className="relative shrink-0 mt-0.5">
              <StageDot status={status} />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-background border border-border flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                {num}
              </span>
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={active ? 'text-primary' : status === 'done' ? 'text-foreground' : 'text-muted-foreground'}>
                  {icon}
                </span>
                {title}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>
            </div>
          </div>
          <div className="shrink-0">{action}</div>
        </div>
      </CardHeader>
      {children && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right">{children}</dd>
    </>
  );
}
