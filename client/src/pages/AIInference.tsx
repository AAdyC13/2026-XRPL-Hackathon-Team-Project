import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AI_MODELS, PRICING } from '@/lib/constants';
import { Zap, Send, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface InferenceResult {
  id: string;
  model: string;
  prompt: string;
  output: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
  txHash: string;
}

const SAMPLE_RESULTS: InferenceResult[] = [
  {
    id: '1',
    model: 'Llama 2 7B',
    prompt: '解釋什麼是區塊鏈',
    output:
      '區塊鏈是一種分散式帳本技術，由多個區塊組成，每個區塊包含一組交易記錄。區塊通過密碼學哈希連接，形成一條不可篡改的鏈條...',
    inputTokens: 15,
    outputTokens: 85,
    cost: 0.1,
    timestamp: new Date(Date.now() - 3600000),
    txHash: 'E2E519ABC8F1D4C3B7A9E6F2D5C8B1A4E7F3D9C6B2A8E5F1D4C7B3A9E6F2D8C5',
  },
  {
    id: '2',
    model: 'Qwen 7B',
    prompt: '用中文寫一首關於 AI 的詩',
    output:
      '智慧之光照亮夜\
機器學習展翅飛\
數據流動如江河\
未來在我們手指尖...',
    inputTokens: 18,
    outputTokens: 42,
    cost: 0.06,
    timestamp: new Date(Date.now() - 7200000),
    txHash: 'A3F7B2C9E6D4B1A8F5C2E9D6B3A7F4C1E8D5B2A9F6C3E7D4B1A8F5C9E6D3B7A4',
  },
];

export default function AIInference() {
  const { user } = useAuth();
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<InferenceResult[]>(SAMPLE_RESULTS);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedModelData = AI_MODELS.find((m) => m.id === selectedModel)!;

  const handleInference = async () => {
    if (!prompt.trim()) {
      toast.error('請輸入提示詞');
      return;
    }

    setIsLoading(true);
    // 模擬 API 調用
    setTimeout(() => {
      const newResult: InferenceResult = {
        id: Date.now().toString(),
        model: selectedModelData.name,
        prompt,
        output: '這是一個模擬的推論結果。在實際應用中，這裡會顯示 AI 模型的真實輸出...',
        inputTokens: Math.floor(prompt.length / 4),
        outputTokens: 150,
        cost: (Math.floor(prompt.length / 4) + 150) * (selectedModelData.costPer1kTokens / 1000),
        timestamp: new Date(),
        txHash: Array.from({ length: 64 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join(''),
      };
      setResults([newResult, ...results]);
      setPrompt('');
      setIsLoading(false);
      toast.success('推論完成！');
    }, 2000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('已複製到剪貼板');
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-display font-bold">AI 推論</h1>
          <p className="text-muted-foreground mt-2">使用本地 AI 模型進行推論，按 Token 數計費</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 推論表單 */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>新建推論</CardTitle>
                <CardDescription>選擇模型並輸入提示詞</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 模型選擇 */}
                <div className="space-y-2">
                  <Label htmlFor="model">選擇模型</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} - {model.provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{selectedModelData.description}</p>
                </div>

                {/* 模型信息卡片 */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">成本 / 1K Token</p>
                    <p className="font-semibold text-sm mt-1">{selectedModelData.costPer1kTokens} GKC</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">最大 Token</p>
                    <p className="font-semibold text-sm mt-1">{selectedModelData.maxTokens}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">提供商</p>
                    <p className="font-semibold text-sm mt-1">{selectedModelData.provider}</p>
                  </div>
                </div>

                {/* 提示詞輸入 */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">提示詞</Label>
                  <Textarea
                    id="prompt"
                    placeholder="輸入您的提示詞...\
例如：解釋什麼是區塊鏈"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    預計 Token 數: {Math.floor(prompt.length / 4)} input + ~150 output
                  </p>
                </div>

                {/* 推論按鈕 */}
                <Button
                  onClick={handleInference}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      推論中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      開始推論
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 側邊欄 - 快速信息 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">錢包餘額</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">GKC 餘額</p>
                  <p className="text-2xl font-bold text-primary">{user?.gkcBalance.toLocaleString() ?? '---'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">XRP 餘額</p>
                  <p className="text-2xl font-bold">128.50</p>
                </div>
                <Button variant="outline" className="w-full mt-2">
                  充值
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">使用統計</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">本月推論</p>
                  <p className="text-xl font-bold">1,284 次</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">本月花費</p>
                  <p className="text-xl font-bold">2,450.50 GKC</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 推論歷史 */}
        <Card>
          <CardHeader>
            <CardTitle>推論歷史</CardTitle>
            <CardDescription>最近的推論記錄</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{result.model}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {result.timestamp.toLocaleString('zh-TW')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-accent">{result.cost.toFixed(4)} GKC</p>
                      <a
                        href={`https://testnet.xrpl.org/transactions/${result.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        {result.txHash.slice(0, 8)}...{result.txHash.slice(-4)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">提示詞</p>
                      <p className="text-sm">{result.prompt}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">輸出</p>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-muted-foreground line-clamp-2">{result.output}</p>
                        <button
                          onClick={() => copyToClipboard(result.output, result.id)}
                          className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
                        >
                          {copiedId === result.id ? (
                            <Check className="w-4 h-4 text-accent" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{result.inputTokens} input tokens</span>
                      <span>{result.outputTokens} output tokens</span>
                    </div>
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

