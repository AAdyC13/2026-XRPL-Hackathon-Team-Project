/**
 * server/services/dex.ts
 * ─────────────────────────────────────────────────────
 * XRPL DEX (order book) helpers.
 * Ported from NestJS src/xrpl/services/dex.service.ts
 */

import type { Amount, BookOffersRequest, OfferCancel, OfferCreate } from 'xrpl';
import { getXrplClient } from './xrpl.js';

export type OfferSide = 'buyGkc' | 'sellGkc';

export type BuildOfferCreateInput = {
  account: string;
  side: OfferSide;
  gkcAmount: string;
  xrpAmount: string;
};

export type BuildOfferCancelInput = {
  account: string;
  offerSequence: number;
};

function gkcIssuedAmount(value: string): Amount {
  const currency = process.env.GKC_CURRENCY ?? 'GKC';
  const issuer = process.env.GKC_ISSUER_ADDRESS;
  if (!issuer) throw new Error('GKC_ISSUER_ADDRESS not set');
  return { currency, issuer, value };
}

function xrpDrops(xrpAmount: string): string {
  return String(Math.floor(parseFloat(xrpAmount) * 1_000_000));
}

export function buildOfferCreate({
  account,
  side,
  gkcAmount,
  xrpAmount,
}: BuildOfferCreateInput): OfferCreate {
  const xrpDropsVal = xrpDrops(xrpAmount);

  return {
    TransactionType: 'OfferCreate',
    Account: account,
    TakerGets: side === 'buyGkc' ? xrpDropsVal : gkcIssuedAmount(gkcAmount),
    TakerPays: side === 'buyGkc' ? gkcIssuedAmount(gkcAmount) : xrpDropsVal,
  };
}

export function buildOfferCancel({ account, offerSequence }: BuildOfferCancelInput): OfferCancel {
  return {
    TransactionType: 'OfferCancel',
    Account: account,
    OfferSequence: offerSequence,
  };
}

export async function getOrderBook(side: OfferSide = 'sellGkc', limit = 20) {
  const client = await getXrplClient();
  const currency = process.env.GKC_CURRENCY ?? 'GKC';
  const issuer = process.env.GKC_ISSUER_ADDRESS;
  if (!issuer) throw new Error('GKC_ISSUER_ADDRESS not set');

  const request: BookOffersRequest = {
    command: 'book_offers',
    ledger_index: 'validated',
    limit,
    taker_gets:
      side === 'buyGkc'
        ? { currency: 'XRP' }
        : { currency, issuer },
    taker_pays:
      side === 'buyGkc'
        ? { currency, issuer }
        : { currency: 'XRP' },
  };

  return client.request(request);
}

export async function getAccountOffers(account: string) {
  const client = await getXrplClient();
  return client.request({
    command: 'account_offers',
    account,
    ledger_index: 'validated',
  });
}
