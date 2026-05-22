# 2026-XRPL-Hackathon-Team-Project
114-2 管理資訊系統 期末分組專案競賽

## A 平台後端基礎設施

本專案在根目錄提供 TypeScript / Express 後端與最小 Vite + React 示意前端，封裝 XRPL Hackathon 需要展示的五個技術元件：

- Trust Lines
- Issued Assets（IOU ACU）
- XRPL DEX
- Xaman Wallet 簽署流程
- Escrow（MVP 以 crypto-condition escrow 模擬 XLS-100 Smart Escrow 語意）

## 快速啟動

```powershell
npm install
copy .env.example .env
npm run dev
```

API 預設在 `http://localhost:3000`，前端示意頁在 `http://localhost:5173`。

## 環境設定

`.env` 需包含：

```env
PORT=3000
XRPL_WS_URL=wss://s.altnet.rippletest.net:51233
ISSUER_ADDRESS=r...
ISSUER_SEED=s...
CURRENCY_CODE=ACU
DEFAULT_TRUST_LIMIT=1000000
XUMM_API_KEY=
XUMM_API_SECRET=
XUMM_WEBHOOK_URL=
```

`ISSUER_SEED` 只用於 Testnet MVP 便利發幣。正式環境不可把發行方私鑰放在一般 `.env`，應改用 HSM/KMS、隔離簽署服務，或改為 Xaman / 多簽流程。

## Testnet 驗證流程

1. 到 XRPL Testnet faucet 建立 issuer 與 holder 帳號。
2. 將 issuer 的 address / seed 填入 `.env`。
3. 執行 `npm run verify:connection`，確認能讀到 issuer XRP 餘額。
4. 呼叫 `POST /api/trustline/prepare` 產生 holder 的 TrustSet 交易，使用 Xaman 或其他錢包簽署。
5. 呼叫 `POST /api/asset/issue` 由 issuer 發 ACU 到 holder。
6. 呼叫 `GET /api/asset/balance/:account` 確認 ACU 餘額。
7. 依序測試 DEX offer 與 escrow prepare 端點。

## Xaman 設定

到 Xaman Developer Console 建立 app，將 `XUMM_API_KEY` 與 `XUMM_API_SECRET` 放入 `.env`。示意前端的 Xaman 測試會呼叫 `signWithXaman: true` 的 prepare 端點，回傳 QR / deeplink 讓手機簽署。

## API 文件

完整 REST 契約請見 [docs/API.md](docs/API.md)。

## VPS Docker 部署

推送到 `vps-deploy` 分支時，GitHub Actions 會在 GitHub runner 上建置 Docker image，推送到 GHCR，然後透過 Cloudflare Access SSH 連到 VPS，在 `/opt/xrpl-team-project` 執行 `docker compose pull` 與 `docker compose up -d`。

部署後 VPS 上只需要保留：

- `/opt/xrpl-team-project/docker-compose.yml`
- `/opt/xrpl-team-project/deploy.env`（CI 產生，記錄本次部署的 image tag）
- `/opt/xrpl-team-project/.env`（由 VPS 上自行撰寫，不提交到 git）

容器會綁定在 VPS 本機 `127.0.1.3:3000`，容器內維持預設 `PORT=3000`。若需要公開 HTTPS，請在 VPS 的 nginx / Caddy 等反向代理把 upstream 指到 `http://127.0.1.3:3000`。

VPS 第一次部署前需先完成：

1. 安裝 Docker Engine 與 Compose plugin。
2. 確認部署用的 SSH 使用者可執行 `docker compose`，且可寫入 `/opt/xrpl-team-project`。
3. 建立 `/opt/xrpl-team-project/.env`，內容可參考 `.env.example`。
4. 確認 GitHub repository secrets 已設定 `CF_CLIENT_ID`、`CF_CLIENT_SECRET`、`SSH_HOST`、`SSH_PRIVATE_KEY`、`SSH_USERNAME`。

## Scripts

```powershell
npm run dev
npm run build
npm start
npm run verify:connection
npm run typecheck
```
