# 高科算力平台 — 節點 OS 基礎層開發計畫

> **文件用途**：交給 Claude Code Agent 在本地（WSL2）執行，初始化節點 OS 專案、配置「基礎層」與「服務骨架」，並留出乾淨的應用層接縫。
> **完成標準**：Agent 跑完後，一個空殼節點 OS 能開機自啟、daemon 能起來、kiosk 能全螢幕開介面、監控數據能讀到——但所有業務邏輯都是 stub。使用者接手後從應用層往上疊。

---

## 0. 範圍界定（Agent 必讀，先看這段）

### Agent 要做的（基礎層 / infrastructure）
- WSL2 + Ubuntu minimal 環境與依賴安裝
- 專案目錄結構
- daemon 服務骨架：systemd unit + 程式空殼 + 設定檔載入 + 結構化 log
- Chromium kiosk 開機自啟動鏈
- 監控模組接線（能讀到 CPU/RAM/GPU 數據並暴露成 API）
- 服務管理：自動重啟、開機自啟、健康檢查

### Agent 「不要」做的（這是使用者的應用層）
以下一律只留 **stub + interface 定義 + `TODO` 標記**，不要實作內容：
- 接任務 / 執行任務 / 計時 / 到期截斷的實際邏輯
- GKC 結算邏輯
- 與平台後端的業務協議內容（訊息格式、狀態機）
- GUI 的實際頁面內容（只放一個能跑的占位頁）

> 原則：Agent 負責「把骨架立起來、把線接好」；business logic 留空，標清楚接縫在哪。

---

## 1. 環境前提與 WSL 雷點（先處理，否則後面全卡）

| 項目 | 說明 | 處理方式 |
|------|------|---------|
| systemd | WSL2 預設不啟 systemd，本專案重度依賴 | 在 `/etc/wsl.conf` 寫入 `[boot]\nsystemd=true`，然後 `wsl --shutdown` 重啟 distro |
| GUI 顯示 | Chromium kiosk 需要顯示層 | Windows 11 有 WSLg 內建 X/Wayland，直接可用；Windows 10 需另裝 X server（VcXsrv）並設 `DISPLAY` |
| 「開機自啟」的真義 | WSL 沒有真實開機，distro 是按需啟動 | demo 敘事上把「開機進入 OS 分區」對應成「distro 啟動 → systemd 拉起服務」，效果一致；發表時誠實說明這是模擬 |
| GPU | WSL2 支援 GPU passthrough（CUDA on WSL）| 監控模組要能在「讀不到 GPU」時優雅降級，不要 crash（個體戶機器不一定有 GPU）|

---

## 2. 目標目錄結構

```
campus-node-os/
├── README.md                  # Agent 產出：如何啟動、各服務職責
├── install/
│   ├── setup.sh               # 一鍵安裝依賴（idempotent，可重跑）
│   ├── wsl.conf               # 範例設定，提示使用者放到 /etc/
│   └── systemd/
│       ├── node-agent.service
│       └── node-kiosk.service
├── agent/                     # 算力代理 daemon
│   ├── main.py                # 入口：載入 config、起 event loop、連線（骨架）
│   ├── config.py              # 設定檔載入
│   ├── transport.py           # ★接縫：與平台通訊層（stub）
│   ├── monitor.py             # 系統資源監控（可實作完整）
│   ├── tasks/
│   │   └── runner.py          # ★接縫：任務執行 / 計時 / 截斷（stub）
│   └── settlement.py          # ★接縫：GKC 結算掛鉤（stub）
├── kiosk/
│   ├── start-kiosk.sh         # 啟 X + openbox + Chromium 全螢幕
│   └── webapp/                # 本地占位介面（之後複用平台前端）
│       └── index.html         # 占位：顯示「節點上線中」+ 監控數據
├── config/
│   └── node.example.yaml      # 節點設定範本（platform URL、節點 ID 等）
└── logs/                      # 執行期 log 輸出
```

---

## 3. 分階段任務（Agent 依序執行）

### Phase 0 — 環境
- 確認 WSL2 + Ubuntu，寫好 `install/wsl.conf` 並提示使用者套用
- `setup.sh`：安裝 `python3`、`python3-venv`、`chromium-browser`(或 `chromium`)、`xorg`、`openbox`、`supervisor`(備選)、Python 套件（`psutil`、WebSocket client、`pyyaml`、`fastapi`+`uvicorn` 用於本地監控 API）
- 建立 venv，鎖 `requirements.txt`

### Phase 1 — 專案骨架
- 依第 2 節建立目錄與空檔
- 寫 `config.py` + `node.example.yaml`：能讀到 platform URL、node ID、心跳間隔等
- 設定結構化 logging（輸出到 `logs/` + stdout）

### Phase 2 — daemon 服務骨架
- `main.py`：載入 config → 起 async event loop → 定時心跳（先只印 log）→ 呼叫 `transport.connect()`（stub）
- `transport.py`：**只定義介面**
  - `async def connect()` / `async def send(msg)` / `async def on_message(handler)`
  - 內含明顯 `# TODO: 接平台後端，協議待定（見第 5 節決策項）`
  - 給一個 mock 實作（印 log / 回假資料），讓 daemon 能在沒有真後端時也能跑起來 demo
- `tasks/runner.py`、`settlement.py`：定義函式簽章 + `raise NotImplementedError` 或 `TODO`，不實作

### Phase 3 — Kiosk
- `start-kiosk.sh`：啟 openbox、全螢幕開 Chromium 指向 `http://localhost:<port>`（指向占位 webapp 或本地監控 API 頁面）
- `webapp/index.html`：占位頁，能向本地監控 API 拉數據並顯示（CPU/RAM/節點狀態），UI 不需精緻
- kiosk 模式參數：`--kiosk --noerrdialogs --disable-infobars --incognito`

### Phase 4 — 監控模組（這層可完整實作）
- `monitor.py`：用 `psutil` 收 CPU/RAM/磁碟/網路；GPU 有就讀、沒有就回 `null`
- 用 FastAPI 開一個本地唯讀端點 `GET /api/status` 回傳目前資源使用 + 節點狀態，給 kiosk 前端拉

### Phase 5 — 服務整合
- 兩個 systemd unit：`node-agent.service`（跑 daemon）、`node-kiosk.service`（跑 kiosk，依賴圖形環境就緒）
- 設 `Restart=on-failure`、開機自啟（`WantedBy=multi-user.target` / 圖形 target）
- 提供 `enable` / `start` / 查 `status` 的說明寫進 README

### Phase 6 — 驗收自測
- distro 重啟後 daemon 自動起來、心跳 log 有出現
- `curl localhost:<port>/api/status` 拿得到資源數據
- kiosk 全螢幕開起占位頁、頁面有顯示即時數據
- 所有 `★接縫` 檔案都有清楚 `TODO` 註解，使用者知道從哪接手

---

## 4. 接縫定義（交付給應用層的契約）

Agent 要在這三個檔案頂部寫清楚「這裡是你接手的地方」：

| 接縫檔案 | 留給應用層做什麼 | Agent 先給的東西 |
|---------|----------------|----------------|
| `transport.py` | 與平台後端的真實通訊、業務訊息協議 | 介面定義 + mock 實作（能 demo 不報錯）|
| `tasks/runner.py` | 接任務、執行、計時、到期強制截斷 | 函式簽章 + `TODO`，與「按小時計費 / Check / Escrow」對應點標出 |
| `settlement.py` | 觸發 GKC 結算（對接你的 XRPL 邏輯）| 掛鉤點 + `TODO`，標明應在任務完成 / 截斷時被呼叫 |

---

## 5. 待使用者決策的項目（Agent 遇到先停、寫進 README 詢問）

1. **平台後端技術棧與通訊協議**——daemon ↔ 平台用 WebSocket / gRPC / HTTP 輪詢？訊息格式？（此項未定，故 `transport.py` 先做 mock）
2. **節點身份與認證**——節點怎麼向平台證明身份（對應 Trust Line / Xaman 准入）？這關係到 `transport.connect()` 的握手設計。
3. **GUI 是複用平台前端還是另寫**——若複用，`webapp/` 之後換成平台前端的 build 產物即可。
4. **GPU 是否為硬需求**——影響監控降級策略與節點分類（個體戶 vs 專業戶）。

---

## 6. 給 Agent 的一句話總指令（可直接貼）

> 依本計畫初始化 `campus-node-os` 專案。完成 Phase 0–6 的**基礎層與服務骨架**：環境、目錄、daemon 骨架、kiosk 啟動鏈、監控模組、systemd 整合。`transport.py` / `tasks/runner.py` / `settlement.py` 只做介面定義與 mock/stub，標清楚 `TODO`，**不要實作任何業務邏輯**。完成後跑 Phase 6 自測並在 README 列出待我決策的項目。
