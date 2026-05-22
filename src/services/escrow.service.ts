import crypto from "node:crypto";
import { Amount, EscrowCancel, EscrowCreate, EscrowFinish } from "xrpl";
import { env, requireIssuerAddress } from "../config/env.js";

export type ConditionalEscrowInput = {
  sender: string;
  receiver: string;
  amount: string;
  cancelAfterSeconds?: number;
  fulfillmentSecretHex?: string;
};

export type FinishEscrowInput = {
  finisher: string;
  owner: string;
  offerSequence: number;
  fulfillment: string;
  condition: string;
};

export type CancelEscrowInput = {
  account: string;
  owner: string;
  offerSequence: number;
};

export type GeneratedCryptoCondition = {
  fulfillmentSecretHex: string;
  fulfillment: string;
  condition: string;
};

function issuedAcu(value: string): Amount {
  return {
    currency: env.CURRENCY_CODE,
    issuer: requireIssuerAddress(),
    value
  };
}

function rippleTimeFromNow(secondsFromNow: number): number {
  const rippleEpochOffsetSeconds = 946684800;
  return Math.floor(Date.now() / 1000) - rippleEpochOffsetSeconds + secondsFromNow;
}

export function createPreimageSha256Condition(secretHex = crypto.randomBytes(32).toString("hex")): GeneratedCryptoCondition {
  const secret = Buffer.from(secretHex, "hex");

  if (secret.length !== 32) {
    throw new Error("fulfillmentSecretHex must be exactly 32 bytes encoded as hex.");
  }

  const fingerprint = crypto.createHash("sha256").update(secret).digest("hex").toUpperCase();
  const fulfillment = `A0228020${secret.toString("hex").toUpperCase()}`;
  const condition = `A0258020${fingerprint}810120`;

  return {
    fulfillmentSecretHex: secret.toString("hex"),
    fulfillment,
    condition
  };
}

export function buildConditionalEscrow(input: ConditionalEscrowInput): {
  transaction: EscrowCreate;
  cryptoCondition: GeneratedCryptoCondition;
  cancelAfter: number;
} {
  const cryptoCondition = createPreimageSha256Condition(input.fulfillmentSecretHex);
  const cancelAfter = rippleTimeFromNow(input.cancelAfterSeconds ?? 3600);

  return {
    transaction: {
      TransactionType: "EscrowCreate",
      Account: input.sender,
      Destination: input.receiver,
      Amount: issuedAcu(input.amount),
      Condition: cryptoCondition.condition,
      CancelAfter: cancelAfter
    } as EscrowCreate,
    cryptoCondition,
    cancelAfter
  };
}

export function buildFinishEscrow(input: FinishEscrowInput): EscrowFinish {
  return {
    TransactionType: "EscrowFinish",
    Account: input.finisher,
    Owner: input.owner,
    OfferSequence: input.offerSequence,
    Condition: input.condition,
    Fulfillment: input.fulfillment
  };
}

export function buildCancelEscrow(input: CancelEscrowInput): EscrowCancel {
  return {
    TransactionType: "EscrowCancel",
    Account: input.account,
    Owner: input.owner,
    OfferSequence: input.offerSequence
  };
}
