import { useState } from "react";
import { apiRequest, postJson } from "./api/client.js";
import XamanSignPanel from "./components/XamanSignPanel.js";

type ResultState = {
  title: string;
  payload: unknown;
};

function useResult() {
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(title: string, action: () => Promise<unknown>) {
    setError(null);
    try {
      const payload = await action();
      setResult({ title, payload });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    }
  }

  return { result, error, run };
}

export default function App() {
  const { result, error, run } = useResult();
  const [account, setAccount] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("10");
  const [signWithXaman, setSignWithXaman] = useState(true);

  const xamanFlag = { signWithXaman };

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">XRPL Hackathon MVP</p>
        <h1>A 平台後端基礎設施示意頁</h1>
        <p>這個頁面只用來驗證 REST API 與 Xaman / XRPL 流程，不承擔正式 UI 設計。</p>
      </section>

      <section className="panel">
        <label>
          測試帳號
          <input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="r..." />
        </label>
        <label>
          目的帳號
          <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="r..." />
        </label>
        <label>
          ACU 數量
          <input value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={signWithXaman}
            onChange={(event) => setSignWithXaman(event.target.checked)}
          />
          使用 Xaman 簽署（勾選後會顯示 QR Code）
        </label>
      </section>

      <section className="grid">
        <ActionCard
          title="Trust Line"
          description="建立 TrustSet；勾選 Xaman 時顯示 QR 供手機掃描簽署。"
          onClick={() =>
            run("Trust Line", () =>
              postJson("/api/trustline/prepare", { account, limit: "1000000", ...xamanFlag })
            )
          }
        />
        <ActionCard
          title="Issued Asset"
          description="查詢餘額（發幣請用 API POST /api/asset/issue）。"
          onClick={() => run("ACU balance", () => apiRequest(`/api/asset/balance/${account}`))}
        />
        <ActionCard
          title="Xaman"
          description="TrustSet + Xaman payload（等同 Trust Line 且強制開啟 Xaman）。"
          onClick={() =>
            run("Xaman TrustSet", () =>
              postJson("/api/trustline/prepare", { account, limit: "1000000", signWithXaman: true })
            )
          }
        />
        <ActionCard
          title="DEX"
          description="建立 ACU/XRP OfferCreate；可選 Xaman 簽署。"
          onClick={() =>
            run("DEX offer", () =>
              postJson("/api/dex/offer/prepare", {
                account,
                side: "sellAcu",
                acuAmount: amount,
                xrpAmount: "1",
                ...xamanFlag
              })
            )
          }
        />
        <ActionCard
          title="Escrow"
          description="建立 crypto-condition escrow；可選 Xaman 簽署。"
          onClick={() =>
            run("Escrow create", () =>
              postJson("/api/escrow/create/prepare", {
                sender: account,
                receiver: destination || account,
                amount,
                cancelAfterSeconds: 3600,
                ...xamanFlag
              })
            )
          }
        />
        <ActionCard
          title="Health"
          description="確認 API 與 XRPL 連線。"
          onClick={() => run("Health", () => apiRequest("/health"))}
        />
      </section>

      <section className="panel">
        <h2>結果</h2>
        {error ? <p className="error">{error}</p> : null}
        {result ? (
          <>
            <h3>{result.title}</h3>
            {result.payload ? <XamanSignPanel payload={result.payload} /> : null}
            <details className="raw-response">
              <summary>完整 API 回應（JSON）</summary>
              <pre>{JSON.stringify(result.payload, null, 2)}</pre>
            </details>
          </>
        ) : (
          <p>點選上方按鈕後，API 回應會顯示在這裡。若使用 Xaman，QR Code 會出現在上方。</p>
        )}
      </section>
    </main>
  );
}

function ActionCard(props: { title: string; description: string; onClick: () => void }) {
  return (
    <article className="card">
      <h2>{props.title}</h2>
      <p>{props.description}</p>
      <button type="button" onClick={props.onClick}>
        執行
      </button>
    </article>
  );
}
