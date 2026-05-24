import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { parseBody } from "../../common/zod.js";
import { XrplHelperService } from "../xrpl-helper.service.js";
import { buildOfferCancel, buildOfferCreate, getAccountOffers, getOrderBook } from "../services/dex.service.js";

const offerCreateSchema = z.object({
  account: z.string().min(1),
  side: z.enum(["buyAcu", "sellAcu"]),
  acuAmount: z.string().min(1),
  xrpAmount: z.string().min(1),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

const offerCancelSchema = z.object({
  account: z.string().min(1),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

@Controller("/api/dex")
export class XrplDexController {
  constructor(private readonly helperService: XrplHelperService) {}

  @Post("/offer/prepare")
  async offerPrepare(@Body() body: unknown) {
    const payload = parseBody(offerCreateSchema, body);
    const txjson = buildOfferCreate(payload);
    const data = await this.helperService.maybeCreateXamanPayload(txjson, payload.signWithXaman, payload.userToken);
    return { ok: true, data };
  }

  @Delete("/offer/:sequence/prepare")
  async cancelOffer(@Param("sequence") sequence: string, @Body() body: unknown) {
    const payload = parseBody(offerCancelSchema, body);
    const txjson = buildOfferCancel({
      account: payload.account,
      offerSequence: Number(sequence)
    });
    const data = await this.helperService.maybeCreateXamanPayload(txjson, payload.signWithXaman, payload.userToken);
    return { ok: true, data };
  }

  @Get("/book")
  async book(@Query("side") side?: string, @Query("limit") limit?: string) {
    const parsedSide = side === "buyAcu" ? "buyAcu" : "sellAcu";
    const parsedLimit = limit ? Number(limit) : 20;
    const book = await getOrderBook(parsedSide, parsedLimit);
    return { ok: true, data: book.result };
  }

  @Get("/offers/:account")
  async offers(@Param("account") account: string) {
    const offers = await getAccountOffers(account);
    return { ok: true, data: offers.result };
  }
}
