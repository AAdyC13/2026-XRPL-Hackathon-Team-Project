import { Amount, BookOffersRequest, OfferCancel, OfferCreate } from "xrpl";
import { env, requireIssuerAddress } from "../../config/env.js";
import { dropsFromXrp, getClient } from "../infrastructure/xrpl.client.js";

export type OfferSide = "buyAcu" | "sellAcu";

export type BuildOfferCreateInput = {
  account: string;
  side: OfferSide;
  acuAmount: string;
  xrpAmount: string;
};

export type BuildOfferCancelInput = {
  account: string;
  offerSequence: number;
};

function issuedToken(value: string): Amount {
  return {
    currency: env.CURRENCY_CODE,
    issuer: requireIssuerAddress(),
    value
  };
}

export function buildOfferCreate({ account, side, acuAmount, xrpAmount }: BuildOfferCreateInput): OfferCreate {
  const xrpDrops = dropsFromXrp(xrpAmount);

  return {
    TransactionType: "OfferCreate",
    Account: account,
    TakerGets: side === "buyAcu" ? xrpDrops : issuedToken(acuAmount),
    TakerPays: side === "buyAcu" ? issuedToken(acuAmount) : xrpDrops
  };
}

export function buildOfferCancel({ account, offerSequence }: BuildOfferCancelInput): OfferCancel {
  return {
    TransactionType: "OfferCancel",
    Account: account,
    OfferSequence: offerSequence
  };
}

export async function getOrderBook(side: OfferSide = "sellAcu", limit = 20) {
  const client = await getClient();
  const request: BookOffersRequest = {
    command: "book_offers",
    ledger_index: "validated",
    limit,
    taker_gets:
      side === "buyAcu"
        ? { currency: "XRP" }
        : { currency: env.CURRENCY_CODE, issuer: requireIssuerAddress() },
    taker_pays:
      side === "buyAcu"
        ? { currency: env.CURRENCY_CODE, issuer: requireIssuerAddress() }
        : { currency: "XRP" }
  };

  return client.request(request);
}

export async function getAccountOffers(account: string) {
  const client = await getClient();
  return client.request({
    command: "account_offers",
    account,
    ledger_index: "validated"
  });
}
