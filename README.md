# 高科幣 (GKC) — AI 算力平台

以 **XRP Ledger** 為結算層的校園 GPU 算力共享與 AI 推論平台。結合三條核心產品線：AI 推論服務、算力出租（Escrow 保障）、算力貢獻分潤（XRPL Hooks）。

> **目前為整合過渡狀態**：新版 UI 仍多為靜態 / setTimeout 模擬；XRPL API 已由 `src/` 後端提供，後續可逐頁替換各頁面的 `// TODO` 標記。

## 部署架構

推送到 `main` 分支時，GitHub Actions 只透過 `deploy-vps.yml` 部署單一 Docker 容器到 VPS。該容器在 `127.0.1.3:3000` 同時提供 Express API 與新版 `client/` 的靜態前端。

- `client/`：新版 GKC 平台 UI，會被 `pnpm run build` 打包到 `dist/public`
- `src/`：XRPL Express API，production 會 serve `dist/public`
- `client-legacy/`：舊 XRPL demo client，只作本地參考，不進 Docker build，也不部署到 VPS
- `3001` 獨立前端部署已停用，不再使用 `/opt/xrpl-frontend`

---

## 前端功能概覽

| 功能模組 | 狀態 | 說明 |
|---------|------|------|
| 登入 / 註冊 | ✅ 完成 | JWT 認證，LocalStorage 持久化 |
| 儀表板 | ✅ 完成 | 統計圖表、節點狀態總覽 |
| AI 推論介面 | ✅ 完成 | 多模型選擇、計費預估、TX Hash 連結 |
| 錢包（GKC + XRP） | ✅ 完成 | 真實 XRPL 地址格式、TrustLine 狀態、Explorer 連結 |
| Payment Channel 管理 | ✅ 完成 | 開啟 / 查看 / 關閉通道，消費額度視覺化 |
| AMM 兌換（GKC↔XRP）| ✅ 完成 | 即時匯率、池深度、24h 交易量顯示 |
| TrustLine 設定引導 | ✅ 完成 | Issuer 地址顯示、設定入口 |
| 算力節點管理 | ✅ 完成 | 節點列表、CU 評分、收益統計 |
| 節點 Benchmark 流程 | ✅ 完成 | 添加節點 Dialog、GPU 預設、自動 CU/Tier 計算 |
| 算力出租市場 | ✅ 完成 | GPU 瀏覽、Escrow 租用 Dialog、交付確認流程 |
| XRPL Escrow 管理 | ✅ 完成 | 鏈上查詢連結、進度條、結算確認 |
| 交易記錄 | ✅ 完成 | 全文搜尋、5 分類篩選、可點擊 TX Hash → XRPL Explorer |

---

## 快速開始

```bash
# 安裝依賴
pnpm install

# 開發伺服器
# API: http://localhost:3000
# 新版前端: http://localhost:5173
pnpm dev

# 舊 XRPL demo（選用）
pnpm dev:legacy
```

### 測試帳號（Mock 模式）
| 欄位 | 值 |
|------|-----|
| Email | `demo@gkc.edu.tw` |
| 密碼 | `demo12345678` |

---

## 技術棧

| 層 | 技術 |
|----|------|
| 前端框架 | React 19 + TypeScript |
| 建置工具 | Vite 7 |
| 樣式 | Tailwind CSS v4（`@theme inline`）|
| 元件庫 | shadcn/ui + Radix UI |
| 路由 | wouter v3（已 patch）|
| 圖表 | recharts |
| 通知 | sonner |
| 後端（待實作）| Node.js 20 + Express + PostgreSQL + Redis |
| XRPL SDK | xrpl.js 3.x |
| AI 推論 | Ollama / vLLM |

---

## 專案結構

```
gkc-platform/
├── client/                        # 前端 (React + TypeScript)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx          # 登入頁
│   │   │   ├── Register.tsx       # 註冊頁
│   │   │   ├── Dashboard.tsx      # 儀表板
│   │   │   ├── AIInference.tsx    # AI 推論
│   │   │   ├── Wallet.tsx         # 錢包 + TrustLine + Payment Channel + AMM
│   │   │   ├── Nodes.tsx          # 算力節點管理 + Benchmark
│   │   │   ├── ComputeRental.tsx  # 算力出租市場 + Escrow
│   │   │   └── Transactions.tsx   # 交易記錄 + XRPL 連結
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx    # JWT 認證狀態管理
│   │   │   └── ThemeContext.tsx   # 深色/淺色主題
│   │   ├── components/
│   │   │   ├── Layout.tsx         # 側邊欄導航（含用戶資訊）
│   │   │   └── ui/                # shadcn/ui 組件
│   │   └── lib/
│   │       ├── constants.ts       # 路由、AI 模型、節點資料、定價
│   │       └── utils.ts
├── src/                           # XRPL Express API + production 靜態前端託管
├── client-legacy/                 # 舊 XRPL demo client（不部署）
├── shared/                        # 共用型別
├── BACKEND_SPECIFICATION.md       # 後端 API 完整規格書
└── README.md
```

---

## XRPL 整合現況

| XRPL 功能 | 前端 UI | 後端實作 |
|-----------|---------|---------|
| GKC IOU Token（發行 / 流通）| ✅ | ⏳ TODO |
| TrustLine 設定 | ✅ | ⏳ TODO |
| Payment Channel（per-token 微支付）| ✅ | ⏳ TODO |
| AMM（GKC↔XRP 流動性池）| ✅ | ⏳ TODO |
| Escrow（算力出租保障）| ✅ | ⏳ TODO |
| XRPL Hooks（自動分潤）| ⏳ TODO | ⏳ TODO |
| XRPL Explorer 深連結 | ✅ | — |

---

## 後端開發 TODO

> 詳細 API 規格、資料模型、安全規範請參閱 [BACKEND_SPECIFICATION.md](./BACKEND_SPECIFICATION.md)

### 🔴 Phase 1 — 基礎架構（第 1-2 週）

- [ ] 建立 PostgreSQL + Redis 環境（Docker Compose）
- [ ] **Auth API**
  - [ ] `POST /api/v1/auth/register` — 用戶註冊（bcrypt 雜湊）
  - [ ] `POST /api/v1/auth/login` — 登入取得 JWT
  - [ ] JWT 驗證中間件（保護所有受保護路由）
  - [ ] 輸入驗證（zod）、速率限制（express-rate-limit）
- [ ] **XRPL 基礎整合**
  - [ ] xrpl.js 客戶端初始化，連接 Testnet WebSocket
  - [ ] GKC IOU Issuer 帳戶設定與鑰匙管理
  - [ ] `POST /api/v1/wallet/trustline` — 發送 TrustSet 交易
  - [ ] `GET /api/v1/wallet/balance` — 查詢 GKC / XRP 餘額

### 🔴 Phase 2 — AI 推論 + Payment Channel（第 2-3 週）

- [ ] **AI 模型部署**
  - [ ] 部署 Ollama，載入 Llama 2 7B / 13B、Qwen 7B、Mistral 7B
  - [ ] OpenAI 相容格式封裝
  - [ ] Server-Sent Events 串流輸出（前端 `EventSource` 對接）
  - [ ] Token 計數器（tiktoken 或模型 API 回傳值）
- [ ] **推論計費 API**
  - [ ] `POST /api/v1/inference` — 觸發推論、扣 GKC、記錄到 DB
  - [ ] `GET /api/v1/inference/history` — 推論記錄（分頁）
  - [ ] GKC 餘額不足時拒絕請求（400）
- [ ] **Payment Channel API**
  - [ ] `POST /api/v1/payment-channel/open` — 建立 XRPL PayChannel，鎖定 XRP
  - [ ] `POST /api/v1/payment-channel/claim` — 累積消費簽名（off-chain）
  - [ ] `POST /api/v1/payment-channel/close` — 提交結算，關閉通道退回剩餘 XRP
  - [ ] `GET /api/v1/payment-channel/list` — 列出用戶所有通道

### 🟡 Phase 3 — 算力節點系統（第 3-4 週）

- [ ] **節點管理 API**
  - [ ] `POST /api/v1/nodes` — 節點登錄（提交 GPU 規格）
  - [ ] `POST /api/v1/nodes/:id/benchmark` — 觸發遠端 Benchmark 任務
  - [ ] CU 評分公式實作（參見規格書 §4）
  - [ ] 定期重新 Benchmark 排程（每 24 小時）
  - [ ] `GET /api/v1/nodes` — 列出節點（支援分頁、篩選）
  - [ ] `PATCH /api/v1/nodes/:id/status` — 更新節點狀態
- [ ] **算力出租（Escrow）API**
  - [ ] `POST /api/v1/escrow/create` — 建立 XRPL EscrowCreate 交易
  - [ ] `POST /api/v1/escrow/:id/finish` — 確認交付，執行 EscrowFinish
  - [ ] `POST /api/v1/escrow/:id/cancel` — 逾期取消，執行 EscrowCancel
  - [ ] `GET /api/v1/escrow/list` — 列出用戶 Escrow 記錄

### 🟡 Phase 4 — 代幣經濟（第 4-5 週）

- [ ] **GKC IOU 管理**
  - [ ] GKC 鑄造 API（管理員限定，需 Issuer 私鑰簽名）
  - [ ] `POST /api/v1/wallet/transfer` — GKC 轉帳（Payment 交易）
  - [ ] `GET /api/v1/token/supply` — 查詢總供應量 / 流通量
- [ ] **AMM 整合**
  - [ ] XRPL AMM 池建立腳本（AMMCreate）
  - [ ] `GET /api/v1/amm/quote` — 取得 GKC↔XRP 即時報價（AMMInfo）
  - [ ] `GET /api/v1/amm/pool-stats` — 池深度、24h 交易量
  - [ ] `POST /api/v1/amm/swap` — 執行 AMM 兌換（OfferCreate）
- [ ] **算力貢獻分潤**
  - [ ] 每日分潤計算排程（CU 比例分配）
  - [ ] `GET /api/v1/nodes/:id/rewards` — 查詢分潤歷史
  - [ ] 分潤 GKC 自動轉帳至節點所有者

### 🟢 Phase 5 — 進階功能（第 5 週+）

- [ ] **XRPL Hooks 部署**
  - [ ] 編寫自動分潤 Hook（C 語言，XRPL Hooks v3 規範）
  - [ ] 部署 Hook 至 Testnet Hooks-enabled 節點
  - [ ] Hook 觸發記錄 API + 前端監控面板
- [ ] **WebSocket 即時推送**
  - [ ] `ws://api/v1/ws` — 節點利用率 live 更新
  - [ ] GKC/XRP AMM 價格即時推送
  - [ ] 交易上鏈確認通知
- [ ] **統計與監控**
  - [ ] `GET /api/v1/stats/dashboard` — 儀表板聚合統計
  - [ ] `GET /api/v1/stats/leaderboard` — 節點貢獻排行榜
  - [ ] Prometheus + Grafana 監控整合
- [ ] **安全強化**
  - [ ] Helmet.js 安全標頭
  - [ ] CORS 嚴格設定（白名單）
  - [ ] XRPL 交易簽名驗證（防偽造）
  - [ ] SQL Injection 防護（Parameterized Queries）
  - [ ] API 審計日誌
- [ ] **DevOps**
  - [ ] Docker Compose（後端 + PostgreSQL + Redis + Ollama）
  - [ ] Nginx 反向代理 + SSL
  - [ ] GitHub Actions CI/CD（pnpm check + 測試 + 部署）

---

## 環境變數

複製 `.env.example` 並填入設定：

```bash
# 後端服務
DATABASE_URL=postgresql://user:pass@localhost:5432/gkc
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here_min_32_chars
JWT_EXPIRES_IN=86400

# XRPL 設定
XRPL_NETWORK=testnet
XRPL_RPC_WS=wss://s.altnet.rippletest.net:51233
XRPL_RPC_HTTP=https://s.altnet.rippletest.net:51234
GKC_ISSUER_ADDRESS=r...         # GKC IOU 發行者地址
GKC_ISSUER_SECRET=s...          # 嚴禁上傳版本控制！

# AI 推論
OLLAMA_BASE_URL=http://localhost:11434
INFERENCE_TIMEOUT_MS=30000
MAX_TOKENS_PER_REQUEST=4096

# 前端 (Vite)
VITE_API_BASE_URL=http://localhost:4000
```

---

## 授權

MIT License — 高科大算力實驗室

---


## File Structure

```
client/
  public/       ← Small configuration files ONLY (favicon.ico, robots.txt). DO NOT put images/media here.
  src/
    pages/      ← Page-level components
    components/ ← Reusable UI & shadcn/ui
    contexts/   ← React contexts
    hooks/      ← Custom React hooks
    lib/        ← Utility helpers
    App.tsx     ← Routes & top-level layout
    main.tsx    ← React entry point
    index.css   ← global style
server/         ← Placeholder for imported template compatibility
shared/         ← Placeholder for imported template compatibility
  const.ts      ← Shared constants
```

### ⚠️ Handling Images & Media

**DO NOT** store images, videos, or large assets in `client/public/` or `client/src/assets/`. Local media files will cause deployment timeouts.

**Required workflow:**
1. Upload assets using the CLI: `manus-upload-file --webdev path/to/image.png`
2. Use the returned storage path directly in your code: `<img src="/manus-storage/image_a1b2c3d4.png" />`
3. Store the original local file in `/home/ubuntu/webdev-static-assets/` (outside the project directory)

Only small configuration files like `favicon.ico`, `robots.txt`, and `manifest.json` belong in `client/public/`.

Files in `client/public` are available at the root of your site—reference them with absolute paths (`/robots.txt`, etc.) from HTML templates, JSX, or meta tags.

---

## 🎯 Development Workflow

1. **Choose a design style** before you write any frontend code according to Design Guide (color, font, shadow, art style). Tell user what you chose. Remember to edit `client/src/index.css` for global theming and add needed font using google font cdn in `client/index.html`.
2. **Compose pages** in `client/src/pages/`. Keep sections modular so they can be reused across routes.
3. **Share primitives** via `client/src/components/`—extend shadcn/ui when needed instead of duplicating markup.
4. **Keep styling consistent** by relying on existing Tailwind tokens (spacing, colors, typography).
5. **Fetch external data** with `useEffect` if the site needs dynamic content from public APIs.
---

## 🎨 Frontend Development Guidelines

**UI & Styling:**
- Prefer shadcn/ui components for interactions to keep a modern, consistent look; import from `@/components/ui/*` (e.g., `button`, `card`, `dialog`).
- Compose Tailwind utilities with component variants for layout and states; avoid excessive custom CSS. Use built-in `variant`, `size`, etc. where available.
- Preserve design tokens: keep the `@layer base` rules in `client/src/index.css`. Utilities like `border-border` and `font-sans` depend on them.
- Consistent design language: use spacing, radius, shadows, and typography via tokens. Extract shared UI into `components/` for reuse instead of copy‑paste.
- Accessibility and responsiveness: keep visible focus rings and ensure keyboard reachability; design mobile‑first with thoughtful breakpoints.
- Theming: Choose dark/light theme to start with for ThemeProvider according to your design style (dark or light bg), then manage colors pallette with CSS variables in `client/src/index.css` instead of hard‑coding to keep global consistency.
- Micro‑interactions and empty states: add motion, empty states, and icons tastefully to improve quality without distracting from content.
- Navigation: For internal tools/admin panels, use persistent sidebar. For public-facing apps, design navigation based on content structure (top nav, side nav, or contextual)—ensure clear escape routes from all pages.
- Placeholder UI elements: When adding structural placeholders (nav items, CTAs) for not-yet-implemented features, show toast on click ("Feature coming soon"). Inform user which elements are placeholders when presenting work.

**React Best Practices:**
- Never call setState/navigation in render phase → wrap in `useEffect`

**Customized Defaults:**
This template customizes some Tailwind/shadcn defaults for simplified usage:
- `.container` is customized to auto-center and add responsive padding (see `index.css`). Use directly without `mx-auto`/`px-*`. For custom widths, use `max-w-*` with `mx-auto px-4`.
- `.flex` is customized to have `min-width:0` and `min-height:0` by default
- `button` variant `outline` uses transparent background (not `bg-background`). Add bg color class manually if needed.

---

## 🎨 Design Guide

When generating frontend UI, avoid generic patterns that lack visual distinction:
- Avoid generic full-page centered layouts—prefer asymmetric/sidebar/grid structures for landing pages and dashboards
- When user provides vague requirements, make creative design decisions (choose specific color palette, typography, layout approach)
- Prioritize visual diversity: combine different design systems (e.g., one color scheme + different typography + another layout principle)
- For landing pages: prefer asymmetric layouts, specific color values (not just "blue"), and textured backgrounds over flat colors
- For dashboards: use defined spacing systems, soft shadows over borders, and accent colors for hierarchy

---

## Animation Guide

Bake motion taste in from the first line of code. Snappy, physically intuitive interactions are not a polish pass — they are part of the initial build.
- Decide whether to animate at all: keyboard-initiated actions (command palettes, shortcuts) must be instant — never animate them. High-frequency interactions (hover, list nav) should be minimal. Reserve richer motion for occasional events (modals, drawers, toasts) and rare delight moments (onboarding).
- Keep UI animations under 300ms. A 180ms dropdown feels significantly better than a 400ms one. Typical ranges: button press 100–160ms, tooltips 125–200ms, dropdowns 150–250ms, modals/drawers 200–500ms.
- Use strong custom easings, not the weak CSS defaults. Default to a snappy ease-out for entering/exiting UI: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`. For moving/morphing use `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`. NEVER use `ease-in` for UI animations — it feels sluggish.
- Buttons must feel responsive: add `transform: scale(0.97)` on `:active` with a ~160ms ease-out transition so the UI confirms it heard the user.
- Never animate from `scale(0)` — nothing in the real world appears from nothing. Start from `scale(0.95)` combined with `opacity: 0`.
- Origin-aware popovers/dropdowns: scale in from the trigger point (e.g. `transform-origin: var(--radix-popover-content-transform-origin)`). Modals are the exception and stay centered.
- Prefer CSS transitions over @keyframes for dynamic UI state. Transitions can be interrupted and reversed smoothly mid-flight; keyframes restart from zero and feel broken when interrupted.
- Only animate `transform` and `opacity` for motion — they run on the GPU and skip layout/paint. Avoid animating `width`, `height`, `padding`, `margin`, `top/left` unless absolutely necessary.
- Stagger grouped entrances by 30–80ms per item to create a cascading reveal instead of a wall of motion.
- Asymmetric timing for deliberate actions: hold-to-confirm should be slow and linear on press (e.g. 2s linear), but release/cancel should snap back fast (~200ms ease-out).
- Respect `prefers-reduced-motion`: gate non-essential motion behind `@media (prefers-reduced-motion: no-preference)`.

---

## Pre-built Components

Before implementing UI features, check if these components already exist:

Maps:
- `client/src/components/Map.tsx` - Google Maps integration with proxy authentication. Provides MapView component with onMapReady callback for initializing Google Maps services (Places, Geocoder, Directions, Drawing, etc.). All map functionality works directly in the browser.

When implementing features that match these categories, MUST evaluate the component first to decide whether to use or customize it.

---

## 🗺️ Maps Integration

**CRITICAL: The Manus proxy provides FULL access to ALL Google Maps features** - including advanced drawing, heatmaps, Street View, all layers, Places API, etc. Do NOT ask users for Google Map API keys - authentication is automatic.

**Implementation:**
- Frontend: Import MapView from `client/src/components/Map.tsx` and initialize ANY Google Maps service (geocoding, directions, places, drawing, visualization, geometry, etc.) in the onMapReady callback. ALL Google Maps JavaScript API features work directly in the browser.

NEVER use external map libraries or request API keys from users - the Manus proxy handles everything automatically with no feature limitations.

---

## ✅ Launch Checklist
- [ ] UI layout and navigation structure correct, all image src valid.
- [ ] Success + error paths verified in the browser

---

## Core File References

`package.json`
```tsx
{
  "name": "gkc-platform",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "preview": "vite preview --host",
    "check": "tsc --noEmit",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "axios": "^1.12.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "framer-motion": "^12.23.22",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.453.0",
    "nanoid": "^5.1.5",
    "next-themes": "^0.4.6",
    "react": "^19.2.1",
    "react-day-picker": "^9.11.1",
    "react-dom": "^19.2.1",
    "react-hook-form": "^7.64.0",
    "react-resizable-panels": "^3.0.6",
    "recharts": "^2.15.2",
    "sonner": "^2.0.7",
    "streamdown": "^1.4.0",
    "tailwind-merge": "^3.3.1",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@builder.io/vite-plugin-jsx-loc": "^0.1.1",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.3",
    "@types/express": "4.17.21",
    "@types/google.maps": "^3.58.1",
    "@types/node": "^24.7.0",
    "@types/react": "^19.2.1",
    "@types/react-dom": "^19.2.1",
    "@vitejs/plugin-react": "^5.0.4",
    "add": "^2.0.6",
    "autoprefixer": "^10.4.20",
    "esbuild": "^0.25.0",
    "pnpm": "^10.15.1",
    "postcss": "^8.4.47",
    "prettier": "^3.6.2",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.19.1",
    "tw-animate-css": "^1.4.0",
    "typescript": "5.6.3",
    "vite": "^7.1.7",
    "vite-plugin-manus-runtime": "^0.0.57",
    "vitest": "^2.1.4"
  },
  "packageManager": "pnpm@10.4.1+sha512.c753b6c3ad7afa13af388fa6d808035a008e30ea9993f58c6663e2bc5ff21679aa834db094987129aa4d488b86df57f7b634981b2f827cdcacc698cc0cfb88af",
  "pnpm": {
    "patchedDependencies": {
      "wouter@3.7.1": "patches/wouter@3.7.1.patch"
    },
    "overrides": {
      "tailwindcss>nanoid": "3.3.7"
    }
  }
}
```

`client/src/App.tsx`
```tsx
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
```

`client/src/pages/Home.tsx`
```tsx
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Streamdown } from 'streamdown';

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  // If theme is switchable in App.tsx, we can implement theme toggling like this:
  // const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <main>
        {/* Example: lucide-react for icons */}
        <Loader2 className="animate-spin" />
        Example Page
        {/* Example: Streamdown for markdown rendering */}
        <Streamdown>Any **markdown** content</Streamdown>
        <Button variant="default">Example Button</Button>
      </main>
    </div>
  );
}
```

`client/src/index.css`
```tsx
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
  --primary: var(--color-blue-700);
  --primary-foreground: var(--color-blue-50);
  --sidebar-primary: var(--color-blue-600);
  --sidebar-primary-foreground: var(--color-blue-50);
  --chart-1: var(--color-blue-300);
  --chart-2: var(--color-blue-500);
  --chart-3: var(--color-blue-600);
  --chart-4: var(--color-blue-700);
  --chart-5: var(--color-blue-800);
  --radius: 0.65rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.235 0.015 65);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.235 0.015 65);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.235 0.015 65);
  --secondary: oklch(0.98 0.001 286.375);
  --secondary-foreground: oklch(0.4 0.015 65);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.141 0.005 285.823);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.623 0.214 259.815);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.235 0.015 65);
  --sidebar-accent: oklch(0.967 0.001 286.375);
  --sidebar-accent-foreground: oklch(0.141 0.005 285.823);
  --sidebar-border: oklch(0.92 0.004 286.32);
  --sidebar-ring: oklch(0.623 0.214 259.815);
}

.dark {
  --primary: var(--color-blue-700);
  --primary-foreground: var(--color-blue-50);
  --sidebar-primary: var(--color-blue-500);
  --sidebar-primary-foreground: var(--color-blue-50);
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.85 0.005 65);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.85 0.005 65);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.85 0.005 65);
  --secondary: oklch(0.24 0.006 286.033);
  --secondary-foreground: oklch(0.7 0.005 65);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground:  oklch(0.92 0.005 65);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.488 0.243 264.376);
  --chart-1: var(--color-blue-300);
  --chart-2: var(--color-blue-500);
  --chart-3: var(--color-blue-600);
  --chart-4: var(--color-blue-700);
  --chart-5: var(--color-blue-800);
  --sidebar: oklch(0.21 0.006 285.885);
  --sidebar-foreground: oklch(0.85 0.005 65);
  --sidebar-accent: oklch(0.274 0.006 286.033);
  --sidebar-accent-foreground:  oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.488 0.243 264.376);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  button:not(:disabled),
  [role="button"]:not([aria-disabled="true"]),
  [type="button"]:not(:disabled),
  [type="submit"]:not(:disabled),
  [type="reset"]:not(:disabled),
  a[href],
  select:not(:disabled),
  input[type="checkbox"]:not(:disabled),
  input[type="radio"]:not(:disabled) {
    @apply cursor-pointer;
  }
}

@layer components {
  /**
   * Custom container utility that centers content and adds responsive padding.
   *
   * This overrides Tailwind's default container behavior to:
   * - Auto-center content (mx-auto)
   * - Add responsive horizontal padding
   * - Set max-width for large screens
   *
   * Usage: <div className="container">...</div>
   *
   * For custom widths, use max-w-* utilities directly:
   * <div className="max-w-6xl mx-auto px-4">...</div>
   */
  .container {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    padding-left: 1rem; /* 16px - mobile padding */
    padding-right: 1rem;
  }

  .flex {
    min-height: 0;
    min-width: 0;
  }

  @media (min-width: 640px) {
    .container {
      padding-left: 1.5rem; /* 24px - tablet padding */
      padding-right: 1.5rem;
    }
  }

  @media (min-width: 1024px) {
    .container {
      padding-left: 2rem; /* 32px - desktop padding */
      padding-right: 2rem;
      max-width: 1280px; /* Standard content width */
    }
  }
}
```

`client/index.html`
```tsx
<!doctype html>
<html lang="en">

  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>{{project_title}}</title>    
    <!-- THIS IS THE START OF A COMMENT BLOCK, BLOCK TO BE DELETED: Google Fonts here, example:
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    THIS IS THE END OF A COMMENT BLOCK, BLOCK TO BE DELETED -->
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script
      defer
      src="%VITE_ANALYTICS_ENDPOINT%/umami"
      data-website-id="%VITE_ANALYTICS_WEBSITE_ID%"></script>
  </body>

</html>
```

`server/index.ts`
```tsx
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
```
---

## Common Pitfalls

### Infinite loading loops from unstable references
**Anti-pattern:** Creating new objects/arrays in render that are used as query inputs
```tsx
// ❌ Bad: New Date() creates new reference every render → infinite queries
const { data } = trpc.items.getByDate.useQuery({
  date: new Date(), // ← New object every render!
});

// ❌ Bad: Array/object literals in query input
const { data } = trpc.items.getByIds.useQuery({
  ids: [1, 2, 3], // ← New array reference every render!
});
```

**Correct approach:** Stabilize references with useState/useMemo
```tsx
// ✅ Good: Initialize once with useState
const [date] = useState(() => new Date());
const { data } = trpc.items.getByDate.useQuery({ date });

// ✅ Good: Memoize complex inputs
const ids = useMemo(() => [1, 2, 3], []);
const { data } = trpc.items.getByIds.useQuery({ ids });
```

**Why this happens:** TRPC queries trigger when input references change. Objects/arrays created in render have new references each time, causing infinite re-fetches.

### Navigation dead-ends in subpages
**Problem:** Creating nested routes without escape routes—no header nav, no sidebar, no back button.

**Root cause:** Implementing individual pages before establishing global layout structure.

**Solution:** Define layout wrapper in App.tsx first, then build pages inside it. For admin tools use DashboardLayout; for detail pages add back button with `router.back()`.

### Invisible text from theme/color mismatches

**Root cause:** Semantic colors (`bg-background`, `text-foreground`) are CSS variables that resolve based on ThemeProvider's active theme. Mismatches cause invisible text.

**Two critical rules:**

1. **Match theme to CSS variables:** If `defaultTheme="dark"` in App.tsx, ensure `.dark {}` in index.css has dark background + light foreground values
2. **Always pair bg with text:** When using `bg-{semantic}`, MUST also use `text-{semantic}-foreground` (not automatic - text inherits from parent otherwise)

**Quick reference:**
```tsx
// ✅ Theme + CSS alignment
<ThemeProvider defaultTheme="dark">  {/* Must match .dark in index.css */}
  <div className="bg-background text-foreground">...</div>
</ThemeProvider>

// ✅ Required class pairs
<div className="bg-popover text-popover-foreground">...</div>
<div className="bg-card text-card-foreground">...</div>
<div className="bg-accent text-accent-foreground">...</div>
```

### Nested anchor tags in Link components
**Problem:** Wrapping `<a>` tags inside another `<a>` or wouter's `<Link>` creates nested anchors and runtime errors.

**Solution:** Pass children directly to Link—it already renders an `<a>` internally.
```tsx
// ❌ Bad: <Link><a>...</a></Link> or <a><a>...</a></a>
// ✅ Good: <Link>...</Link> or just <a>...</a>
```
### Empty `Select.Item` values

**Rule:** Every `<Select.Item>` must have a non-empty `value` prop—never `""`, `undefined`, or omitted.

**Rule:** Use sonner for toasts; do not add react-toastify or @radix-ui/react-toast

**Rule:** If you put placeholder components for App.tsx routes, you MUST replace them with actual components after your implementation.
