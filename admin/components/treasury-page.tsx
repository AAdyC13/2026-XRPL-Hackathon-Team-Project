import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, H2, H5, Input, Label, MessageBox, Text } from "@adminjs/design-system";
import { ApiClient } from "adminjs";

type TreasuryPageData = {
  config?: {
    addresses: { issuer: string | null; warm: string | null; platform: string | null };
    seeds: { issuer: boolean; warm: boolean; platform: boolean };
    ready: { issuerToWarm: boolean; warmToPlatform: boolean; platformPayout: boolean };
  };
  balances?: { issuer: number | null; warm: number | null; platform: number | null };
  error?: string;
  txHash?: string;
  explorerUrl?: string;
  success?: string;
};

const api = new ApiClient();

function normalizePageData(raw: unknown): TreasuryPageData {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const record = obj.record;
  if (record && typeof record === "object") {
    return record as TreasuryPageData;
  }
  return obj as TreasuryPageData;
}

const TreasuryPage: React.FC = () => {
  const [data, setData] = useState<TreasuryPageData>({});
  const [loading, setLoading] = useState(false);
  const [issueAmount, setIssueAmount] = useState("1000");
  const [warmAmount, setWarmAmount] = useState("500");
  const [payoutAmount, setPayoutAmount] = useState("10");
  const [payoutAddress, setPayoutAddress] = useState("");
  const [payoutMemo, setPayoutMemo] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPage({ pageName: "treasuryOps" });
      setData(normalizePageData(res.data));
    } catch (e) {
      setData({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runAction = async (action: string, payload: Record<string, string>) => {
    setLoading(true);
    setData((prev) => ({ ...prev, error: undefined, success: undefined, txHash: undefined }));
    try {
      const res = await api.getPage({
        pageName: "treasuryOps",
        params: { action, ...payload }
      });
      const next = normalizePageData(res.data);
      setData(next);
      if (!next.error) {
        await loadStatus();
      }
    } catch (e) {
      setData({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  const { config, balances } = data;
  const addr = config?.addresses;
  const ready = config?.ready;

  return (
    <Box variant="grey" padding="xl">
      <H2>錢包調撥（Treasury）</H2>
      <Text marginBottom="lg">
        Issuer → Warm（金庫）→ Platform（熱錢包）→ 第三方。需於 .env 設定對應 ADDRESS 與 SEED。
      </Text>

      {data.error && (
        <MessageBox variant="danger" marginBottom="lg">
          {data.error}
        </MessageBox>
      )}
      {data.success && (
        <MessageBox variant="success" marginBottom="lg">
          {data.success}
          {data.explorerUrl && (
            <>
              {" "}
              <a href={data.explorerUrl} target="_blank" rel="noreferrer">
                查看交易
              </a>
            </>
          )}
        </MessageBox>
      )}

      <Box bg="white" padding="lg" marginBottom="lg">
        <H5>地址與餘額</H5>
        <Text>Issuer: {addr?.issuer ?? "—"}</Text>
        <Text>Warm: {addr?.warm ?? "—"}</Text>
        <Text>Platform (hot): {addr?.platform ?? "—"}</Text>
        {addr?.warm && addr?.platform && addr.warm === addr.platform && (
          <MessageBox variant="warning" marginTop="default">
            Warm 與 Platform 地址相同。請檢查 .env 的 WARM_WALLET_ADDRESS 與 PLATFORM_ADDRESS 是否誤填成同一個 r-address。
          </MessageBox>
        )}
        <Text marginTop="default">
          GKC 餘額 — Issuer: {balances?.issuer ?? "—"} | Warm: {balances?.warm ?? "—"} | Platform:{" "}
          {balances?.platform ?? "—"}
        </Text>
        <Button mt="lg" onClick={() => void loadStatus()} disabled={loading}>
          重新整理
        </Button>
      </Box>

      <Box bg="white" padding="lg" marginBottom="lg">
        <H5>1. Issuer → Warm 發幣</H5>
        <Label>GKC 數量</Label>
        <Input
          value={issueAmount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIssueAmount(e.target.value)}
          width="200px"
        />
        <Button
          mt="default"
          disabled={loading || !ready?.issuerToWarm}
          onClick={() => void runAction("issuer-to-warm", { amountGkc: issueAmount })}
        >
          執行發幣
        </Button>
        {!ready?.issuerToWarm && (
          <Text size="sm" color="grey60">
            需 GKC_ISSUER_* 與 WARM_WALLET_ADDRESS
          </Text>
        )}
      </Box>

      <Box bg="white" padding="lg" marginBottom="lg">
        <H5>2. Warm → Platform</H5>
        <Label>GKC 數量</Label>
        <Input
          value={warmAmount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWarmAmount(e.target.value)}
          width="200px"
        />
        <Button
          mt="default"
          disabled={loading || !ready?.warmToPlatform}
          onClick={() => void runAction("warm-to-platform", { amountGkc: warmAmount })}
        >
          調撥至熱錢包
        </Button>
        {!ready?.warmToPlatform && (
          <Text size="sm" color="grey60">
            需 WARM_WALLET_* 與 PLATFORM_ADDRESS
          </Text>
        )}
      </Box>

      <Box bg="white" padding="lg">
        <H5>3. Platform → 第三方</H5>
        <Label>收款 r-address</Label>
        <Input
          value={payoutAddress}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayoutAddress(e.target.value)}
          width="100%"
        />
        <Label mt="default">GKC 數量</Label>
        <Input
          value={payoutAmount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayoutAmount(e.target.value)}
          width="200px"
        />
        <Label mt="default">Memo（選填）</Label>
        <Input
          value={payoutMemo}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayoutMemo(e.target.value)}
          width="100%"
        />
        <Button
          mt="default"
          disabled={loading || !ready?.platformPayout || !payoutAddress.trim()}
          onClick={() =>
            void runAction("platform-payout", {
              amountGkc: payoutAmount,
              toAddress: payoutAddress.trim(),
              memo: payoutMemo
            })
          }
        >
          轉出 GKC
        </Button>
        {!ready?.platformPayout && (
          <Text size="sm" color="grey60">
            需 PLATFORM_SEED 與 PLATFORM_ADDRESS
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default TreasuryPage;
