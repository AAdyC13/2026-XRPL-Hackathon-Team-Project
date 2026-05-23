import { useCallback, useEffect, useState } from "react";
import { apiRequest, postJson } from "../api/client.js";

export type XamanRefs = {
  uuid?: string;
  qrPng?: string;
  next?: string;
};

type PayloadStatus = {
  uuid: string;
  resolved: boolean;
  signed: boolean;
  cancelled: boolean;
  expired: boolean;
  txid?: string;
  account?: string;
  dispatchedResult?: string;
};

function extractXaman(data: unknown): XamanRefs | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  if (!record.xaman || typeof record.xaman !== "object") {
    return null;
  }

  const xaman = record.xaman as Record<string, unknown>;
  return {
    uuid: typeof xaman.uuid === "string" ? xaman.uuid : undefined,
    qrPng: typeof xaman.qrPng === "string" ? xaman.qrPng : undefined,
    next: typeof xaman.next === "string" ? xaman.next : undefined
  };
}

type XamanSignPanelProps = {
  payload: unknown;
};

export default function XamanSignPanel({ payload }: XamanSignPanelProps) {
  const xaman = extractXaman(payload);
  const [status, setStatus] = useState<PayloadStatus | null>(null);
  const [submitResult, setSubmitResult] = useState<unknown>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!xaman?.uuid) {
      return;
    }

    setPollError(null);
    try {
      const nextStatus = await apiRequest<PayloadStatus>(`/api/xaman/payload/${xaman.uuid}`);
      setStatus(nextStatus);
      return nextStatus;
    } catch (caught) {
      setPollError(caught instanceof Error ? caught.message : "無法查詢簽署狀態");
      return null;
    }
  }, [xaman?.uuid]);

  useEffect(() => {
    if (!xaman?.uuid) {
      setStatus(null);
      setSubmitResult(null);
      return;
    }

    setStatus(null);
    setSubmitResult(null);
    setPollError(null);
    setActionError(null);

    let cancelled = false;
    setPolling(true);

    const poll = async () => {
      const nextStatus = await refreshStatus();
      if (!cancelled && nextStatus && !nextStatus.resolved) {
        window.setTimeout(poll, 2500);
      } else if (!cancelled) {
        setPolling(false);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      setPolling(false);
    };
  }, [xaman?.uuid, refreshStatus]);

  if (!xaman?.uuid && !xaman?.qrPng && !xaman?.next) {
    return null;
  }

  async function handleSubmit() {
    if (!xaman?.uuid) {
      return;
    }

    setActionError(null);
    try {
      const result = await postJson(`/api/xaman/payload/${xaman.uuid}/submit`, {});
      setSubmitResult(result);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "提交失敗");
    }
  }

  return (
    <div className="xaman-panel">
      <h3>Xaman 簽署</h3>
      <p>請用手機 Xaman 掃描下方 QR，或點開連結在 app 內確認。請確認 Xaman 登入帳號與「測試帳號」一致。</p>

      {xaman.qrPng ? (
        <img className="xaman-qr" src={xaman.qrPng} alt="Xaman 簽署 QR Code" width={280} height={280} />
      ) : (
        <p className="muted">未取得 QR 圖片，請改用下方連結開啟 Xaman。</p>
      )}

      {xaman.next ? (
        <p>
          <a href={xaman.next} target="_blank" rel="noreferrer">
            在 Xaman 中開啟簽署請求
          </a>
        </p>
      ) : null}

      <p className="muted">Payload UUID: {xaman.uuid ?? "—"}</p>

      <div className="xaman-actions">
        <button type="button" onClick={() => void refreshStatus()} disabled={!xaman.uuid}>
          重新查詢狀態
        </button>
        <button type="button" onClick={() => void handleSubmit()} disabled={!xaman.uuid || !status?.signed}>
          提交已簽交易
        </button>
      </div>

      {polling ? <p className="muted">正在輪詢簽署狀態…</p> : null}
      {pollError ? <p className="error">{pollError}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}

      {status ? (
        <ul className="xaman-status">
          <li>已處理：{status.resolved ? "是" : "否"}</li>
          <li>已簽署：{status.signed ? "是" : "否"}</li>
          <li>已取消：{status.cancelled ? "是" : "否"}</li>
          <li>已過期：{status.expired ? "是" : "否"}</li>
          {status.txid ? <li>TxID：{status.txid}</li> : null}
        </ul>
      ) : null}

      {submitResult ? (
        <pre className="xaman-submit-result">{JSON.stringify(submitResult, null, 2)}</pre>
      ) : null}
    </div>
  );
}
