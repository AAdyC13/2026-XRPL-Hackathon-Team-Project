import { Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { parseBody } from "../../common/zod.js";
import { XrplHelperService } from "../xrpl-helper.service.js";
import { buildCancelEscrow, buildConditionalEscrow, buildFinishEscrow } from "../services/escrow.service.js";

const createEscrowSchema = z.object({
  sender: z.string().min(1),
  receiver: z.string().min(1),
  amount: z.string().min(1),
  cancelAfterSeconds: z.number().int().positive().optional(),
  fulfillmentSecretHex: z.string().optional(),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

const finishEscrowSchema = z.object({
  finisher: z.string().min(1),
  owner: z.string().min(1),
  offerSequence: z.number().int().nonnegative(),
  fulfillment: z.string().min(1),
  condition: z.string().min(1),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

const cancelEscrowSchema = z.object({
  account: z.string().min(1),
  owner: z.string().min(1),
  offerSequence: z.number().int().nonnegative(),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

@Controller("/api/escrow")
export class XrplEscrowController {
  constructor(private readonly helperService: XrplHelperService) {}

  @Post("/create/prepare")
  async create(@Body() body: unknown) {
    const payload = parseBody(createEscrowSchema, body);
    const escrow = buildConditionalEscrow(payload);
    const response = await this.helperService.maybeCreateXamanPayload(
      escrow.transaction,
      payload.signWithXaman,
      payload.userToken
    );

    return {
      ok: true,
      data: {
        ...response,
        cryptoCondition: escrow.cryptoCondition,
        cancelAfter: escrow.cancelAfter
      }
    };
  }

  @Post("/finish/prepare")
  async finish(@Body() body: unknown) {
    const payload = parseBody(finishEscrowSchema, body);
    const txjson = buildFinishEscrow(payload);
    const data = await this.helperService.maybeCreateXamanPayload(txjson, payload.signWithXaman, payload.userToken);
    return { ok: true, data };
  }

  @Post("/cancel/prepare")
  async cancel(@Body() body: unknown) {
    const payload = parseBody(cancelEscrowSchema, body);
    const txjson = buildCancelEscrow(payload);
    const data = await this.helperService.maybeCreateXamanPayload(txjson, payload.signWithXaman, payload.userToken);
    return { ok: true, data };
  }
}
