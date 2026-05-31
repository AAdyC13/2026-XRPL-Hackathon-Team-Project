/**
 * 高科幣平台常數與配置
 */

// AI 模型列表
export const AI_MODELS = [
  {
    id: 'llama-7b',
    name: 'Llama 2 7B',
    provider: 'Meta',
    costPer1kTokens: 0.001,
    maxTokens: 2048,
    description: '輕量級通用模型，適合快速推論',
  },
  {
    id: 'llama-13b',
    name: 'Llama 2 13B',
    provider: 'Meta',
    costPer1kTokens: 0.002,
    maxTokens: 4096,
    description: '平衡性能與精度的中型模型',
  },
  {
    id: 'qwen-7b',
    name: 'Qwen 7B',
    provider: 'Alibaba',
    costPer1kTokens: 0.0015,
    maxTokens: 2048,
    description: '中文優化的高效模型',
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    provider: 'Mistral AI',
    costPer1kTokens: 0.0012,
    maxTokens: 4096,
    description: '高效能推論，支援長上下文',
  },
];

// GPU 節點示例數據
export const SAMPLE_GPU_NODES = [
  {
    id: 'node-001',
    name: 'A100 Server 1',
    gpuType: 'NVIDIA A100 80GB',
    computeUnit: {
      fp16Flops: 312,
      vramGb: 80,
      memoryBandwidth: 2000,
      throughputTokens: 100,
      cuScore: 100,
      tier: 'S' as const,
    },
    status: 'active' as const,
    utilization: 75,
    owner: '校園實驗室',
    revenueToday: 125.5,
    revenueTotal: 3250.75,
    lastBenchmark: new Date(Date.now() - 3600000),
  },
  {
    id: 'node-002',
    name: 'RTX 4090 Server 1',
    gpuType: 'NVIDIA RTX 4090',
    computeUnit: {
      fp16Flops: 165,
      vramGb: 24,
      memoryBandwidth: 1008,
      throughputTokens: 62,
      cuScore: 62,
      tier: 'S' as const,
    },
    status: 'active' as const,
    utilization: 60,
    owner: '外部貢獻者',
    revenueToday: 85.3,
    revenueTotal: 1920.25,
    lastBenchmark: new Date(Date.now() - 7200000),
  },
  {
    id: 'node-003',
    name: 'RTX 3090 Server 1',
    gpuType: 'NVIDIA RTX 3090',
    computeUnit: {
      fp16Flops: 71,
      vramGb: 24,
      memoryBandwidth: 936,
      throughputTokens: 48,
      cuScore: 48,
      tier: 'A' as const,
    },
    status: 'active' as const,
    utilization: 45,
    owner: '外部貢獻者',
    revenueToday: 42.1,
    revenueTotal: 890.5,
    lastBenchmark: new Date(Date.now() - 10800000),
  },
];

// 定價配置
export const PRICING = {
  llmInference: {
    baseCostPerToken: 0.001, // GKC per 1000 tokens
    currency: 'GKC' as const,
  },
  imageGeneration: {
    costPerImage: 5,
    currency: 'GKC' as const,
  },
  computeRental: {
    baseCostPerCUHour: 10, // GKC per CU-hour
    currency: 'GKC' as const,
  },
  computeContribution: {
    rewardPerCUHour: 8, // GKC per CU-hour contributed
    currency: 'GKC' as const,
  },
};

// XRP Ledger 配置
export const XRPL_CONFIG = {
  network: 'testnet',
  rpcUrl: 'https://s.altnet.rippletest.net:51234',
  paymentChannelExpiration: 86400, // 24 hours in seconds
  minFeeDrops: 12,
};

// 交易狀態顏色
export const TRANSACTION_STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  confirmed: 'bg-green-500/10 text-green-700 dark:text-green-400',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

// 節點狀態顏色
export const NODE_STATUS_COLORS = {
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  inactive: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  maintenance: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
};

// 路由路徑
export const ROUTES = {
  HOME: '/dashboard',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  AI_INFERENCE: '/ai-inference',
  WALLET: '/wallet',
  NODES: '/nodes',
  COMPUTE_RENTAL: '/compute-rental',
  TRANSACTIONS: '/transactions',
  ACCOUNT_SETTINGS: '/account-settings',
  DEMO: '/demo',
};

// 動畫時間配置
export const ANIMATION_DURATIONS = {
  fast: 100,
  normal: 200,
  slow: 300,
  verySlow: 500,
};
