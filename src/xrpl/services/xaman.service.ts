import { XummSdk } from "xumm-sdk";
import { requireXummCredentials } from "../../config/env.js";
import { getClient } from "../infrastructure/xrpl.client.js";

let sdk: XummSdk | undefined;

function getXummSdk(): XummSdk {
  if (sdk) {
    return sdk;
  }

  const credentials = requireXummCredentials();
  sdk = new XummSdk(credentials.apiKey, credentials.apiSecret);
  return sdk;
}

export type CreateSignRequestInput = {
  txjson: unknown;
  userToken?: string;
  customMeta?: {
    identifier?: string;
    instruction?: string;
    blob?: Record<string, unknown>;
  };
};

export async function createSignRequest(input: CreateSignRequestInput) {
  const payload = await getXummSdk().payload.create(
    {
      txjson: input.txjson,
      custom_meta: input.customMeta
    } as never,
    input.userToken ? true : undefined
  );

  return {
    uuid: payload?.uuid,
    qrPng: payload?.refs?.qr_png,
    qrMatrix: payload?.refs?.qr_matrix,
    websocketStatus: payload?.refs?.websocket_status,
    next: payload?.next?.always
  };
}

export async function createWalletBindPayload(userToken?: string) {
  return createSignRequest({
    txjson: { TransactionType: "SignIn" } as never,
    userToken,
    customMeta: { instruction: "請簽名以綁定您的 Xaman 錢包至高科幣平台" }
  });
}

export async function getPayloadStatus(uuid: string) {
  const payload = await getXummSdk().payload.get(uuid);

  return {
    uuid,
    resolved: payload?.meta?.resolved ?? false,
    signed: payload?.meta?.signed ?? false,
    cancelled: payload?.meta?.cancelled ?? false,
    expired: payload?.meta?.expired ?? false,
    txid: payload?.response?.txid,
    account: payload?.response?.account,
    userToken: (payload?.response as Record<string, unknown>)?.user_token as string | undefined,
    dispatchedResult: payload?.response?.dispatched_result
  };
}

export async function submitSignedPayload(uuid: string) {
  const payload = await getXummSdk().payload.get(uuid);
  const txBlob = payload?.response?.hex;

  if (!txBlob) {
    return {
      alreadyDispatched: Boolean(payload?.response?.txid),
      txid: payload?.response?.txid,
      dispatchedResult: payload?.response?.dispatched_result
    };
  }

  const client = await getClient();
  const result = await client.submitAndWait(txBlob);

  return {
    alreadyDispatched: false,
    result
  };
}
