import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Copy, Check, ExternalLink, Search, Key, Zap, Wifi, WifiOff, Star, Activity, X, Loader2, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE, providersApi } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  displayName: string;
  gpuType: string;
  models: string[];
  priceInputPer1k: number;
  priceOutputPer1k: number;
  tokensPerSec: number;
  firstTokenMs: number;
  currentLoad: number;
  maxConcurrent: number;
  uptime30d: number;
  avgRating: number;
  status: 'online' | 'offline';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  settled?: boolean;
  txHash?: string;
}

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string | null;
  daily_limit_gkc: number | null;
  revoked_at: string | null;
  created_at: string;
}

interface ActiveCheck {
  id: string;
  send_max_gkc: number;
  spent_gkc: number;
  remaining_gkc: number;
  status: string;
  xrpl_check_id: string | null;
  created_at: string;
}

interface CheckPayload {
  check_id: string;
  uuid: string;
  qr_png: string;
  deeplink: string;
  expires_in_sec: number;
}

interface InferenceRecord {
  id: string;
  model: string;
  providerName: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
  settled: boolean;
  txHash?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortProviders(providers: Provider[], strategy: string): Provider[] {
  const sorted = [...providers];
  switch (strategy) {
    case 'cheapest':
      return sorted.sort((a, b) => a.priceOutputPer1k - b.priceOutputPer1k);
    case 'fastest':
      return sorted.sort((a, b) => b.tokensPerSec - a.tokensPerSec);
    case 'lowest_latency':
      return sorted.sort((a, b) => a.firstTokenMs - b.firstTokenMs);
    default: // recommended
      return sorted.sort((a, b) => {
        const score = (p: Provider) =>
          ((0.05 - p.priceOutputPer1k) / 0.048) * 40 +
          Math.min(p.tokensPerSec / 200, 1) * 30 +
          (p.avgRating / 5) * 20 +
          (p.uptime30d / 100) * 10;
        return score(b) - score(a);
      });
  }
}

function LoadDots({ current, max }: { current: number; max: number }) {
  const filled = Math.round((current / max) * 5);
  return (
    <span className="text-[10px] font-mono tracking-tight">
      <span className="text-primary">{'●'.repeat(filled)}</span>
      <span className="text-muted-foreground/30">{'●'.repeat(5 - filled)}</span>
    </span>
  );
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分鐘前`;
  return `${Math.floor(mins / 60)} 小時前`;
}

const API_ENDPOINT = `${API_BASE}/v1`;

// ── Mock fallback providers ───────────────────────────────────────────────

const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'mock-node-alpha',
    displayName: 'GKC Node Alpha',
    gpuType: 'RTX 4090 24GB',
    models: ['llama3:8b', 'llama3:70b', 'mistral:7b'],
    priceInputPer1k: 0.002,
    priceOutputPer1k: 0.004,
    tokensPerSec: 145,
    firstTokenMs: 320,
    currentLoad: 2,
    maxConcurrent: 4,
    uptime30d: 99.2,
    avgRating: 4.8,
    status: 'online',
  },
  {
    id: 'mock-node-beta',
    displayName: 'GKC Node Beta',
    gpuType: 'A100 80GB',
    models: ['llama3:8b', 'llama3:70b'],
    priceInputPer1k: 0.003,
    priceOutputPer1k: 0.006,
    tokensPerSec: 210,
    firstTokenMs: 180,
    currentLoad: 1,
    maxConcurrent: 8,
    uptime30d: 98.7,
    avgRating: 4.9,
    status: 'online',
  },
  {
    id: 'mock-node-gamma',
    displayName: 'GKC Node Gamma',
    gpuType: 'RTX 3090 24GB',
    models: ['mistral:7b', 'phi3:mini'],
    priceInputPer1k: 0.001,
    priceOutputPer1k: 0.002,
    tokensPerSec: 98,
    firstTokenMs: 450,
    currentLoad: 0,
    maxConcurrent: 2,
    uptime30d: 97.5,
    avgRating: 4.5,
    status: 'online',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function AIInference() {
  const { user, token } = useAuth();

  // ── Real providers from API ────────────────────────────────────────────
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  useEffect(() => {
    const parseModels = (raw: unknown): string[] => {
      if (Array.isArray(raw)) return raw as string[];
      if (typeof raw === 'string') {
        try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
      }
      return [];
    };

    providersApi.marketplace()
      .then(r => {
        const mapped = r.providers.map(p => ({
          id: p.id,
          displayName: p.display_name,
          gpuType: `${p.gpu_type} ${p.vram_gb}GB`,
          models: parseModels(p.models),
          priceInputPer1k: p.price_input_per_1k,
          priceOutputPer1k: p.price_output_per_1k,
          tokensPerSec: p.tokens_per_sec ?? 80,
          firstTokenMs: p.first_token_ms ?? 400,
          currentLoad: p.current_load,
          maxConcurrent: p.max_concurrent,
          uptime30d: p.uptime_30d * 100,
          avgRating: p.avg_rating,
          status: p.status === 'online' || p.status === 'verified' ? 'online' : 'offline',
        }));
        setProviders(mapped.length > 0 ? mapped : MOCK_PROVIDERS);
      })
      .catch(() => setProviders(MOCK_PROVIDERS))
      .finally(() => setProvidersLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ALL_MODELS = Array.from(
    new Set(providers.filter(p => p.status === 'online').flatMap(p => p.models))
  ).sort();

  const [activeTab, setActiveTab] = useState<'quick' | 'browse'>('quick');
  const [quickModel, setQuickModel] = useState('llama3:8b');
  const [strategy, setStrategy] = useState('recommended');
  const [searchModel, setSearchModel] = useState('');

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [currentModel, setCurrentModel] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<InferenceRecord[]>([]);

  // ── API Keys ───────────────────────────────────────────────────────────
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const apiKeySectionRef = useRef<HTMLDivElement>(null);

  // ── XRPL Check + Session ───────────────────────────────────────────────
  const [activeCheck, setActiveCheck] = useState<ActiveCheck | null>(null);
  const [checkPayload, setCheckPayload] = useState<CheckPayload | null>(null);
  const [creatingCheck, setCreatingCheck] = useState(false);
  const [checkPollTimer, setCheckPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [lastSettleTx, setLastSettleTx] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/v1/api-keys`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setApiKeys((d.keys ?? []) as ApiKey[]))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/v1/wallet/check/active`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.active) setActiveCheck(d.check as ActiveCheck); })
      .catch(() => {});
  }, [token]);

  const handleCreateKey = async () => {
    setCreatingKey(true);
    try {
      const r = await fetch(`${API_BASE}/api/v1/api-keys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token!}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Key ${new Date().toLocaleDateString('zh-TW')}` }),
      });
      const d = await r.json() as { id: string; key: string; keyPrefix: string; name: string };
      setNewKeyRaw(d.key);
      setShowNewKey(true);
      setApiKeys(prev => [{ id: d.id, key_prefix: d.keyPrefix, name: d.name, daily_limit_gkc: null, revoked_at: null, created_at: new Date().toISOString() }, ...prev]);
      toast.success('API Key 建立成功，請立即複製！');
    } catch {
      toast.error('建立 API Key 失敗');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    await fetch(`${API_BASE}/api/v1/api-keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token!}` },
    });
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k));
    toast.success('API Key 已撤銷');
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent]);

  // Derived
  const onlineProviders = providers.filter(p => p.status === 'online');
  const searchFiltered = searchModel.trim()
    ? onlineProviders.filter(
        p =>
          p.models.some(m => m.toLowerCase().includes(searchModel.toLowerCase())) ||
          p.displayName.toLowerCase().includes(searchModel.toLowerCase()),
      )
    : onlineProviders;
  const filteredProviders = sortProviders(searchFiltered, strategy);

  const monthlyExtra = history.reduce(
    (acc, r) => ({ requests: acc.requests + 1, inputTokens: acc.inputTokens + r.inputTokens, outputTokens: acc.outputTokens + r.outputTokens, cost: acc.cost + r.cost }),
    { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
  );

  // Handlers
  const handleAuthorizeCheck = async (sendMaxGkc = 100) => {
    if (!token) return;
    setCreatingCheck(true);
    try {
      const r = await fetch(`${API_BASE}/api/v1/wallet/check/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ send_max_gkc: sendMaxGkc, expire_days: 30 }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json() as CheckPayload;
      setCheckPayload(d);

      // Poll until signed
      const timer = setInterval(async () => {
        try {
          const sr = await fetch(`${API_BASE}/api/v1/wallet/check/status/${d.uuid}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const sd = await sr.json() as { status: string; check_id?: string; xrpl_check_id?: string; send_max_gkc?: number };
          if (sd.status === 'active') {
            clearInterval(timer);
            setCheckPollTimer(null);
            setCheckPayload(null);
            setActiveCheck({ id: sd.check_id!, send_max_gkc: sendMaxGkc, spent_gkc: 0, remaining_gkc: sendMaxGkc, status: 'active', xrpl_check_id: sd.xrpl_check_id ?? null, created_at: new Date().toISOString() });
            toast.success(`✅ 已授權 ${sendMaxGkc} GKC 額度`);
          } else if (sd.status === 'cancelled' || sd.status === 'expired') {
            clearInterval(timer);
            setCheckPollTimer(null);
            setCheckPayload(null);
            toast.error('授權已取消');
          }
        } catch { /* ignore poll errors */ }
      }, 3000);
      setCheckPollTimer(timer);
    } catch (err) {
      toast.error(`授權失敗：${(err as Error).message}`);
    } finally {
      setCreatingCheck(false);
    }
  };

  // Clean up poll timer on unmount
  useEffect(() => { return () => { if (checkPollTimer) clearInterval(checkPollTimer); }; }, [checkPollTimer]);

  const openProvider = async (provider: Provider, model?: string) => {
    const m = model ?? provider.models[0];
    setSelectedProvider(provider);
    setCurrentModel(m);
    setMessages([
      {
        role: 'assistant',
        content: `已連線到 **${provider.displayName}**（${provider.gpuType}）\n模型：${m} · ${provider.tokensPerSec} tok/s · 首 token ${provider.firstTokenMs}ms\n\n有什麼我可以幫助您的嗎？`,
      },
    ]);
    toast.success(`已連線：${provider.displayName}`);

    // Open an inference session if user has an active Check
    if (token && activeCheck) {
      try {
        const r = await fetch(`${API_BASE}/api/v1/sessions/open`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider_id: provider.id, model: m, check_id: activeCheck.id }),
        });
        if (r.ok) {
          const d = await r.json() as { session_id: string };
          setSessionId(d.session_id);
        }
      } catch { /* non-critical */ }
    }
  };

  const handleQuickStart = () => {
    const candidates = sortProviders(
      onlineProviders.filter(p => p.models.includes(quickModel)),
      strategy,
    );
    if (candidates.length === 0) {
      toast.error(`找不到提供 ${quickModel} 的線上節點`);
      return;
    }
    openProvider(candidates[0], quickModel);
  };

  const handleDisconnect = async () => {
    abortRef.current?.abort();

    // Settle session before disconnecting
    if (sessionId && token) {
      setSettling(true);
      try {
        const r = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/settle`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (r.ok) {
          const d = await r.json() as { total_cost: number; tx_hash: string | null; merkle_root: string | null };
          if (d.tx_hash) {
            setLastSettleTx(d.tx_hash);
            toast.success(`已結算 ${d.total_cost.toFixed(4)} GKC，Merkle 根已上鏈`);
          } else {
            toast.success(`已結算 ${d.total_cost.toFixed(4)} GKC`);
          }
        }
      } catch { /* non-critical */ } finally {
        setSettling(false);
      }
    }

    setSelectedProvider(null);
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
    setSessionId(null);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming || !selectedProvider) return;
    const userContent = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userContent }]);
    setIsStreaming(true);
    setStreamingContent('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${API_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
        },
        body: JSON.stringify({
          model: `${selectedProvider.id}/${currentModel}`,
          messages: [...messages, { role: 'user', content: userContent }].map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let serverMeta: { input_tokens: number; output_tokens: number; cost_gkc: number } | null = null;
      let lastEventName = '';

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (line.startsWith('event: ')) {
            lastEventName = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith('data: ')) { lastEventName = ''; continue; }
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break outer;
          try {
            const chunk = JSON.parse(payload);
            if (lastEventName === 'gkc_meta') {
              serverMeta = chunk as { input_tokens: number; output_tokens: number; cost_gkc: number };
              lastEventName = '';
              continue;
            }
            lastEventName = '';
            const t = chunk.choices?.[0]?.delta?.content;
            if (t) {
              fullContent += t;
              setStreamingContent(fullContent);
            }
          } catch { /* ignore partial JSON */ }
        }
      }

      const inputT = serverMeta?.input_tokens ?? Math.ceil(userContent.length / 4);
      const outputT = serverMeta?.output_tokens ?? Math.ceil(fullContent.length / 4);
      const cost = serverMeta?.cost_gkc ??
        (inputT / 1000) * selectedProvider.priceInputPer1k +
        (outputT / 1000) * selectedProvider.priceOutputPer1k;
      const provider = selectedProvider;
      const model = currentModel;

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: fullContent, inputTokens: inputT, outputTokens: outputT, cost, settled: false },
      ]);
      setHistory(prev => [
        {
          id: `rec-${Date.now()}`,
          model,
          providerName: provider.displayName,
          inputTokens: inputT,
          outputTokens: outputT,
          cost,
          timestamp: new Date(),
          settled: false,
        },
        ...prev,
      ]);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('推論失敗，請重試');
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ 推論失敗，請重試' }]);
      }
    } finally {
      setStreamingContent('');
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('已複製');
  };

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="hidden lg:block">
            <h1 className="text-3xl font-display font-bold">AI 推論市集</h1>
            <p className="text-muted-foreground mt-1">選擇提供者，按 token 計費，GKC Payment Channel 鏈下即時結算</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0"
            onClick={() => apiKeySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <Key className="w-4 h-4" />
            API 金鑰管理
          </Button>
        </div>

        {/* 2-col layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-6 items-start">
          {/* ── Left ── */}
          <div className="space-y-6">
            {/* Tabs card */}
            <Card>
              <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'quick' | 'browse')}>
                  <TabsList className="mb-5">
                    <TabsTrigger value="quick">⚡ 快速推論</TabsTrigger>
                    <TabsTrigger value="browse">🔍 瀏覽提供者</TabsTrigger>
                  </TabsList>

                  {/* ── Quick tab ── */}
                  <TabsContent value="quick">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>選擇模型</Label>
                          <Select value={quickModel} onValueChange={setQuickModel}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_MODELS.map(m => (
                                <SelectItem key={m} value={m} className="font-mono text-sm">
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>路由策略</Label>
                          <Select value={strategy} onValueChange={setStrategy}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="recommended">🎯 智慧推薦</SelectItem>
                              <SelectItem value="cheapest">💰 最低價格</SelectItem>
                              <SelectItem value="fastest">⚡ 最快速度</SelectItem>
                              <SelectItem value="lowest_latency">🏃 最低延遲</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {!selectedProvider ? (
                        <Button
                          onClick={handleQuickStart}
                          className="w-full"
                          disabled={!token}
                          title={!token ? '請先登入以使用推論' : undefined}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          開始對話
                        </Button>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
                          <span className="text-sm font-medium flex-1 min-w-0 truncate">已連線：{selectedProvider.displayName}</span>
                          <Badge variant="outline" className="text-xs font-mono shrink-0">{currentModel}</Badge>
                          <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={settling} className="h-7 w-7 p-0 shrink-0">
                            {settling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Browse tab ── */}
                  <TabsContent value="browse">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            placeholder="搜尋模型或節點名稱…"
                            value={searchModel}
                            onChange={e => setSearchModel(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Select value={strategy} onValueChange={setStrategy}>
                          <SelectTrigger className="w-[152px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recommended">🎯 智慧推薦</SelectItem>
                            <SelectItem value="cheapest">💰 最低價格</SelectItem>
                            <SelectItem value="fastest">⚡ 最快速度</SelectItem>
                            <SelectItem value="lowest_latency">🏃 最低延遲</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {providersLoading ? (
                        <div className="py-16 text-center text-muted-foreground">
                          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
                          <p className="text-sm">載入提供者中…</p>
                        </div>
                      ) : filteredProviders.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground">
                          <Search className="w-10 h-10 mx-auto mb-3 opacity-25" />
                          <p className="text-sm">找不到符合條件的提供者</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {filteredProviders.map(provider => (
                            <div
                              key={provider.id}
                              onClick={() => openProvider(provider)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all select-none ${
                                selectedProvider?.id === provider.id
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : provider.status === 'offline'
                                    ? 'border-border opacity-50 cursor-not-allowed'
                                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                              }`}
                            >
                              {/* Card header */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-sm leading-tight truncate">{provider.displayName}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{provider.gpuType}</p>
                                </div>
                                <Badge
                                  variant={provider.status === 'online' ? 'default' : 'secondary'}
                                  className="text-[10px] h-5 ml-2 shrink-0"
                                >
                                  {provider.status === 'online' ? (
                                    <>
                                      <Wifi className="w-2.5 h-2.5 mr-1" />線上
                                    </>
                                  ) : (
                                    <>
                                      <WifiOff className="w-2.5 h-2.5 mr-1" />離線
                                    </>
                                  )}
                                </Badge>
                              </div>

                              {/* Models */}
                              <div className="flex flex-wrap gap-1 mb-3">
                                {provider.models.map(m => (
                                  <Badge key={m} variant="outline" className="text-[10px] h-5 font-mono px-1.5">
                                    {m}
                                  </Badge>
                                ))}
                              </div>

                              {/* Stats grid */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                                <div>
                                  <span className="text-muted-foreground">速度 </span>
                                  <span className="font-medium">{provider.tokensPerSec} tok/s</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">首 token </span>
                                  <span className="font-medium">{provider.firstTokenMs}ms</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">輸入 </span>
                                  <span className="font-medium">{provider.priceInputPer1k} GKC/1K</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">輸出 </span>
                                  <span className="font-medium text-primary">{provider.priceOutputPer1k} GKC/1K</span>
                                </div>
                              </div>

                              {/* Load + rating */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <LoadDots current={provider.currentLoad} max={provider.maxConcurrent} />
                                  <span className="text-[10px] text-muted-foreground">
                                    {provider.currentLoad}/{provider.maxConcurrent}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-medium">{provider.avgRating}</span>
                                  <span className="text-[10px] text-muted-foreground ml-1">{provider.uptime30d}%↑</span>
                                </div>
                              </div>

                              {selectedProvider?.id === provider.id && (
                                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-1.5 text-xs text-primary font-medium">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                  已選用
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* ── Chat panel ── */}
            {selectedProvider && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
                      <CardTitle className="text-base truncate">{selectedProvider.displayName}</CardTitle>
                      <Badge variant="outline" className="text-xs font-mono shrink-0">{currentModel}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-8 w-8 p-0 text-muted-foreground shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    {selectedProvider.gpuType} · {selectedProvider.tokensPerSec} tok/s · 首 token {selectedProvider.firstTokenMs}ms
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Messages */}
                  <div ref={messagesContainerRef} className="h-[380px] overflow-y-auto pr-1 space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-muted rounded-bl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          {msg.role === 'assistant' && msg.inputTokens !== undefined && (
                            <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between gap-3 text-[10px] text-muted-foreground flex-wrap">
                              <span>{msg.inputTokens}in / {msg.outputTokens}out tokens</span>
                              <span className="font-medium text-primary">{msg.cost!.toFixed(6)} GKC</span>
                              {msg.settled ? (
                                <span className="text-green-500 flex items-center gap-0.5">
                                  <ExternalLink className="w-2.5 h-2.5" />已上鏈
                                </span>
                              ) : (
                                <span className="text-yellow-500">鏈下結算中</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Streaming */}
                    {isStreaming && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
                          {streamingContent ? (
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {streamingContent}
                              <span className="inline-block w-0.5 h-[1em] bg-primary ml-0.5 align-text-bottom animate-pulse" />
                            </p>
                          ) : (
                            <div className="flex gap-1 items-center h-5">
                              {[0, 150, 300].map(delay => (
                                <span
                                  key={delay}
                                  className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
                                  style={{ animationDelay: `${delay}ms` }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input row */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="輸入訊息（Enter 發送）"
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isStreaming}
                      className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={isStreaming || !inputValue.trim()} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">
            {/* Balance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">GKC 餘額</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {user?.gkcBalance?.toLocaleString() ?? '---'}{' '}
                  <span className="text-sm font-normal text-muted-foreground">GKC</span>
                </p>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  充值
                </Button>
              </CardContent>
            </Card>

            {/* XRPL Check — spending authorisation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  XRPL Check 授權
                </CardTitle>
                <CardDescription className="text-[11px]">
                  {activeCheck
                    ? `剩餘 ${activeCheck.remaining_gkc.toFixed(2)} / ${activeCheck.send_max_gkc} GKC`
                    : '使用 Xaman 授權平台扣款額度（每次對話結算）'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {checkPayload ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={checkPayload.qr_png} alt="Xaman QR" className="w-36 h-36 rounded border" />
                    <p className="text-[11px] text-muted-foreground text-center">掃描 QR 以授權</p>
                    <Button size="sm" variant="outline" className="w-full text-xs" asChild>
                      <a href={checkPayload.deeplink} target="_blank" rel="noopener noreferrer">
                        在 Xaman 中開啟
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setCheckPayload(null)}>
                      取消
                    </Button>
                  </div>
                ) : activeCheck ? (
                  <div className="space-y-1.5">
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-yellow-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (activeCheck.spent_gkc / activeCheck.send_max_gkc) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      已用 {activeCheck.spent_gkc.toFixed(2)} GKC · 限額 {activeCheck.send_max_gkc} GKC
                    </p>
                    {lastSettleTx && (
                      <p className="text-[10px] text-green-600 break-all">上次結算 TX: {lastSettleTx.slice(0, 16)}…</p>
                    )}
                    <Button size="sm" variant="outline" className="w-full text-xs mt-1" onClick={() => handleAuthorizeCheck(activeCheck.send_max_gkc)} disabled={creatingCheck}>
                      更新授權
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" className="w-full text-xs" disabled>
                    <Zap className="w-3 h-3 mr-1" />
                    授權 100 GKC 額度
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* API Keys */}
            <Card ref={apiKeySectionRef}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    API 金鑰 &amp; 端點
                  </CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleCreateKey} disabled={creatingKey}>
                    {creatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    新增
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Endpoint URL */}
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Base URL</p>
                  <div className="flex items-center gap-1.5">
                    <code className="text-[11px] bg-muted px-2 py-1 rounded font-mono flex-1 truncate">{API_ENDPOINT}</code>
                    <button onClick={() => copyToClipboard(API_ENDPOINT, 'url')} className="shrink-0 p-1 hover:bg-muted rounded transition-colors">
                      {copied === 'url' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {/* Model (when connected) */}
                {selectedProvider && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Model</p>
                    <div className="flex items-center gap-1.5">
                      <code className="text-[11px] bg-muted px-2 py-1 rounded font-mono flex-1 truncate">
                        {selectedProvider.id}/{currentModel}
                      </code>
                      <button onClick={() => copyToClipboard(`${selectedProvider.id}/${currentModel}`, 'model')} className="shrink-0 p-1 hover:bg-muted rounded transition-colors">
                        {copied === 'model' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Newly created key — show once */}
                {newKeyRaw && (
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">⚠️ 請立即複製，關閉後不再顯示</p>
                    <div className="flex items-center gap-1.5">
                      <code className="text-[11px] bg-muted px-2 py-1 rounded font-mono flex-1 break-all">
                        {showNewKey ? newKeyRaw : `${newKeyRaw.slice(0, 14)}••••••••`}
                      </code>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => setShowNewKey(v => !v)} className="p-1 hover:bg-muted rounded transition-colors">
                          {showNewKey ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                        <button onClick={() => copyToClipboard(newKeyRaw, 'newkey')} className="p-1 hover:bg-muted rounded transition-colors">
                          {copied === 'newkey' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                    <button onClick={() => { setNewKeyRaw(null); setShowNewKey(false); }} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      我已複製，關閉
                    </button>
                  </div>
                )}

                {/* Key list */}
                {apiKeys.filter(k => !k.revoked_at).length === 0 && !newKeyRaw ? (
                  <p className="text-[11px] text-muted-foreground text-center py-3">尚無 API Key，點擊「新增」建立</p>
                ) : (
                  <div className="space-y-1.5">
                    {apiKeys.filter(k => !k.revoked_at).map(k => (
                      <div key={k.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono font-medium truncate">{k.key_prefix}••••</p>
                          {k.name && <p className="text-[10px] text-muted-foreground truncate">{k.name}</p>}
                        </div>
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="shrink-0 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                          title="撤銷"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  將 <code className="bg-muted px-1 rounded">baseURL</code> 改為上方端點，即可直接串接 OpenAI SDK
                </p>
              </CardContent>
            </Card>

            {/* Monthly stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  本月用量
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">請求次數</span>
                  <span className="font-semibold">{(3847 + monthlyExtra.requests).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Input tokens</span>
                  <span className="font-semibold">{(142847 + monthlyExtra.inputTokens).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Output tokens</span>
                  <span className="font-semibold">{(89203 + monthlyExtra.outputTokens).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GKC 花費</span>
                  <span className="font-semibold text-primary">{(8.34 + monthlyExtra.cost).toFixed(4)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent history */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">最近請求</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {history.slice(0, 6).map(record => (
                    <div key={record.id} className="py-2 border-b border-border/40 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-medium">{record.model}</span>
                        <span className="text-xs text-primary font-medium">{record.cost.toFixed(6)} GKC</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {record.inputTokens}in/{record.outputTokens}out · {timeAgo(record.timestamp)}
                        </span>
                        {record.settled && record.txHash ? (
                          <a
                            href={`https://testnet.xrpl.org/transactions/${record.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-500 hover:text-blue-400 flex items-center gap-0.5 transition-colors"
                          >
                            XRPL <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-yellow-500">鏈下結算中</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
